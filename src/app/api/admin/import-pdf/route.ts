import { db } from '@/lib/db'
import { invalidateDashboardCache } from '@/lib/cache'
import { syncRealisasiAkun } from '@/lib/sync-realisasi-akun'
import { syncRealisasiSkpd } from '@/lib/sync-realisasi-skpd'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { detectJenisFromKodeAkun, detectKategoriFromKodeAkun, type JenisData } from '@/lib/akun-detector'

// NOTE: Next.js App Router does NOT support `export const maxBodyLength`.
// That is a Pages Router API concept. In App Router, request.formData() is
// stream-based and handles large bodies. We validate file size manually below.

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB for PDF files

interface ExtractedAkun {
  kodeAkun: string
  namaAkun: string
  anggaran: number
  realisasi: number
  line: number
  rawLine: string
  detectedJenis: JenisData | null
  detectedKategori: string
}

// POST /api/admin/import-pdf
// Parse a PDF file and extract 17-digit account codes with associated data
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = (session.user as { role?: string })?.role
    const userOpdId = (session.user as { opdId?: string | null })?.opdId

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const jenis = formData.get('jenis') as string | null
    const tahunAnggaranId = formData.get('tahunAnggaranId') as string | null
    const opdId = formData.get('opdId') as string | null
    const mode = (formData.get('mode') as string) || 'upsert'
    const action = (formData.get('action') as string) || 'parse' // 'parse' = preview only, 'import' = actually import

    if (!file) {
      return NextResponse.json({ error: 'File PDF wajib diupload' }, { status: 400 })
    }

    // Manual file size validation (since App Router ignores maxBodyLength)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File terlalu besar. Maksimum ${MAX_FILE_SIZE / 1024 / 1024}MB. File Anda: ${(file.size / 1024 / 1024).toFixed(1)}MB` },
        { status: 413 }
      )
    }

    // jenis can be a specific value or 'auto' for auto-detection
    const isAutoDetect = jenis === 'auto'
    if (!jenis || (!isAutoDetect && !['pendapatan', 'belanja', 'pembiayaan'].includes(jenis))) {
      return NextResponse.json({ error: 'Jenis data harus pendapatan, belanja, pembiayaan, atau auto' }, { status: 400 })
    }

    if (!tahunAnggaranId) {
      return NextResponse.json({ error: 'Tahun anggaran wajib dipilih' }, { status: 400 })
    }

    // Validate tahun anggaran
    const ta = await db.tahunAnggaran.findUnique({ where: { id: tahunAnggaranId } })
    if (!ta) {
      return NextResponse.json({ error: 'Tahun anggaran tidak ditemukan' }, { status: 400 })
    }

    // Determine final opdId with role-based restrictions
    let finalOpdId: string | null = null

    if (role === 'opd') {
      // OPD users can ONLY import to their own OPD
      if (!userOpdId) {
        return NextResponse.json({ error: 'User OPD tidak memiliki OPD terkait' }, { status: 403 })
      }
      // Resolve the OPD ID for the target fiscal year
      const userOpd = await db.opd.findUnique({ where: { id: userOpdId } })
      if (!userOpd) {
        return NextResponse.json({ error: 'OPD user tidak ditemukan' }, { status: 403 })
      }
      const targetOpd = await db.opd.findFirst({
        where: { kodeOpd: userOpd.kodeOpd, tahunAnggaranId },
      })
      if (!targetOpd) {
        return NextResponse.json({ error: 'OPD tidak ditemukan untuk tahun anggaran ini' }, { status: 403 })
      }
      finalOpdId = targetOpd.id
    } else if (role === 'admin' || role === 'superadmin') {
      // Admin/superadmin can choose any OPD or import globally
      if (opdId && opdId !== '__none__') {
        const targetOpd = await db.opd.findUnique({ where: { id: opdId } })
        if (!targetOpd) {
          return NextResponse.json({ error: 'OPD tidak ditemukan' }, { status: 400 })
        }
        finalOpdId = opdId
      }
      // If no opdId or __none__, import globally (opdId = null)
    } else {
      return NextResponse.json({ error: 'Role tidak diizinkan untuk import' }, { status: 403 })
    }

    // Parse the PDF file
    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    const extractedData = await extractAkunFromPdf(pdfBuffer)

    if (extractedData.length === 0) {
      return NextResponse.json({
        error: 'Tidak ditemukan kode akun 17 digit atau lebih dalam PDF ini. Kode akun kurang dari 17 digit (header/kelompok) dilewati.',
        totalLinesScanned: 0,
      }, { status: 400 })
    }

    // If action is 'parse', return preview data with auto-detected jenis/kategori
    if (action === 'parse') {
      // Summarize detected categories
      const jenisSummary: Record<string, number> = {}
      for (const item of extractedData) {
        const key = item.detectedJenis || 'unknown'
        jenisSummary[key] = (jenisSummary[key] || 0) + 1
      }

      return NextResponse.json({
        success: true,
        action: 'parse',
        extracted: extractedData,
        totalFound: extractedData.length,
        jenisSummary,
        isAutoDetect,
        opdId: finalOpdId,
        opdName: finalOpdId ? (await db.opd.findUnique({ where: { id: finalOpdId } }))?.namaOpd : null,
      })
    }

    // If action is 'import', perform the actual import
    if (action === 'import') {
      const rowsJson = formData.get('rows') as string | null
      if (!rowsJson) {
        return NextResponse.json({ error: 'Data rows wajib dikirim untuk import' }, { status: 400 })
      }

      const rows = JSON.parse(rowsJson) as Array<{
        kodeAkun: string
        namaAkun: string
        kategori: string
        anggaran: number
        realisasi: number
      }>

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'Tidak ada data untuk diimpor' }, { status: 400 })
      }

      // Validate rows
      const validationErrors: Array<{ row: number; error: string }> = []
      rows.forEach((row, idx) => {
        if (!row.kodeAkun || typeof row.kodeAkun !== 'string') {
          validationErrors.push({ row: idx + 1, error: 'Kode Akun wajib diisi' })
        }
        if (!row.namaAkun || typeof row.namaAkun !== 'string') {
          validationErrors.push({ row: idx + 1, error: 'Nama Akun wajib diisi' })
        }
        if (!row.kategori || typeof row.kategori !== 'string') {
          validationErrors.push({ row: idx + 1, error: 'Kategori wajib diisi' })
        }
      })

      if (validationErrors.length > 0) {
        return NextResponse.json({ error: 'Validasi gagal', validationErrors }, { status: 400 })
      }

      // Each row may have its own jenis (for auto-detect mode)
      // The 'jenis' field on each row takes priority; otherwise fall back to the global jenis
      type ImportRowWithJenis = typeof rows[number] & { jenis?: string }
      const rowsWithJenis = rows as ImportRowWithJenis[]

      let created = 0
      let updated = 0
      const jenisImported: Record<string, { created: number; updated: number }> = {}

      // If replace mode, delete existing data per-jenis first
      if (mode === 'replace') {
        const jenisSet = new Set<string>()
        for (const row of rowsWithJenis) {
          const rowJenis = row.jenis || jenis
          if (rowJenis && ['pendapatan', 'belanja', 'pembiayaan'].includes(rowJenis)) {
            jenisSet.add(rowJenis)
          }
        }
        for (const j of jenisSet) {
          const deleteWhere: Record<string, unknown> = { tahunAnggaranId }
          if (finalOpdId) {
            deleteWhere.opdId = finalOpdId
          }
          await getDbModel(j as JenisData).deleteMany({ where: deleteWhere })
        }
      }

      // Import rows, routing each to the correct database model based on its jenis
      for (const row of rowsWithJenis) {
        const rowJenis = (row.jenis || jenis) as string
        if (!['pendapatan', 'belanja', 'pembiayaan'].includes(rowJenis)) continue

        const dbModel = getDbModel(rowJenis as JenisData)
        const kodeAkun = row.kodeAkun.trim()
        const namaAkun = row.namaAkun.trim()
        const kategori = row.kategori.trim()

        if (!jenisImported[rowJenis]) {
          jenisImported[rowJenis] = { created: 0, updated: 0 }
        }

        if (mode === 'replace') {
          // In replace mode, just create (we already deleted above)
          await dbModel.create({
            data: {
              tahunAnggaranId,
              kodeAkun,
              namaAkun,
              kategori,
              anggaran: row.anggaran || 0,
              realisasi: row.realisasi || 0,
              opdId: finalOpdId,
            },
          })
          created++
          jenisImported[rowJenis].created++
        } else {
          // Upsert mode
          const existingWhere: Record<string, unknown> = {
            kodeAkun,
            kategori,
            tahunAnggaranId,
          }
          if (finalOpdId) {
            existingWhere.opdId = finalOpdId
          } else {
            existingWhere.opdId = null
          }

          const existing = await dbModel.findFirst({ where: existingWhere })

          if (existing) {
            await dbModel.update({
              where: { id: existing.id },
              data: {
                namaAkun,
                anggaran: row.anggaran || 0,
                realisasi: row.realisasi || 0,
                tanggalUpdate: new Date(),
              },
            })
            updated++
            jenisImported[rowJenis].updated++
          } else {
            await dbModel.create({
              data: {
                tahunAnggaranId,
                kodeAkun,
                namaAkun,
                kategori,
                anggaran: row.anggaran || 0,
                realisasi: row.realisasi || 0,
                opdId: finalOpdId,
              },
            })
            created++
            jenisImported[rowJenis].created++
          }
        }
      }

      // Sync realisasi
      await syncRealisasiAkun(tahunAnggaranId)
      await syncRealisasiSkpd(tahunAnggaranId)
      invalidateDashboardCache()

      // Build detail message with per-jenis breakdown
      const jenisNameMap: Record<string, string> = { pendapatan: 'Pendapatan', belanja: 'Belanja', pembiayaan: 'Pembiayaan' }
      const breakdown = Object.entries(jenisImported)
        .map(([j, stats]) => `${jenisNameMap[j] || j}: ${stats.created} baru, ${stats.updated} update`)
        .join('; ')
      const modeLabel = mode === 'replace' ? 'ganti semua' : 'timpa data sama'
      const detailMsg = isAutoDetect
        ? `Berhasil mengimpor dari PDF (${modeLabel}): ${breakdown}`
        : mode === 'replace'
          ? `Berhasil mengimpor ${created} data dari PDF (mode ganti semua)`
          : `Berhasil mengimpor ${created} data baru & mengupdate ${updated} data dari PDF (mode timpa data sama)`

      return NextResponse.json({
        success: true,
        action: 'import',
        imported: rows.length,
        created,
        updated,
        mode,
        jenisImported,
        message: detailMsg,
      })
    }

    return NextResponse.json({ error: 'Action tidak valid. Gunakan "parse" atau "import"' }, { status: 400 })
  } catch (error) {
    console.error('PDF import error:', error)
    return NextResponse.json({
      error: `Gagal memproses PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, { status: 500 })
  }
}

/**
 * Extract 17-digit account codes (including dots) from PDF buffer.
 * Also tries to capture associated data (nama akun, anggaran, realisasi) from the same line.
 */
async function extractAkunFromPdf(buffer: Buffer): Promise<ExtractedAkun[]> {
  // Use pdfjs-dist for reliable PDF text extraction.
  // We use the legacy build which works in Node.js environments.
  //
  // IMPORTANT: We use require() instead of dynamic import() because:
  // 1. Turbopack (Next.js 16 default) may not correctly resolve deep
  //    node_modules paths via dynamic import()
  // 2. pdfjs-dist is listed in serverExternalPackages in next.config.ts,
  //    so it's excluded from the bundle and loaded via Node.js require()
  // 3. The legacy build is designed for Node.js and avoids canvas/path2d issues
  let pdfjsLib: typeof import('pdfjs-dist')
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
  } catch {
    // Fallback: try the standard entry point
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pdfjsLib = require('pdfjs-dist')
  }

  // Disable the web worker for server-side usage.
  // In Node.js, we don't need a Web Worker — PDF parsing runs on the main thread.
  // Using process.cwd() + node_modules path breaks in:
  //   - standalone production builds (no node_modules)
  //   - Vercel serverless functions
  //   - Docker containers with different working directories
  // Setting workerSrc to empty string makes pdfjs-dist run on the main thread,
  // which is correct and safe for server-side processing.
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    // Disable font rendering to avoid canvas dependency
    disableFontFace: true,
    // Prevent worker-related issues on server-side
    isEvalSupported: false,
    useWorkerFetch: false,
  })

  const pdfDocument = await loadingTask.promise
  const allText: string[] = []

  // Extract text from all pages
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Group text items by Y position to reconstruct lines
    const itemsByY = new Map<number, Array<{ x: number; text: string }>>()
    for (const item of textContent.items) {
      if (!('str' in item) || typeof item.str !== 'string') continue
      const text = item.str
      if (!text || text.trim().length === 0) continue

      const transform = (item as any).transform
      const y = Math.round(transform ? transform[5] : 0)
      const x = transform ? transform[4] : 0

      if (!itemsByY.has(y)) {
        itemsByY.set(y, [])
      }
      itemsByY.get(y)!.push({ x, text })
    }

    // Sort by Y (descending for top-to-bottom) then by X (ascending for left-to-right)
    const sortedYs = Array.from(itemsByY.keys()).sort((a, b) => b - a)
    for (const y of sortedYs) {
      const items = itemsByY.get(y)!
      items.sort((a, b) => a.x - b.x)
      const lineText = items.map(i => i.text).join(' ')
      allText.push(lineText)
    }
  }

  if (allText.length === 0) {
    return []
  }

  const lines = allText
  const results: ExtractedAkun[] = []

  // Regex patterns for account codes with dots
  // Pattern 1: Exactly 17 characters - digit groups separated by dots
  // e.g., "1.01.02.03.01.01.01" or "4.1.1.1.1.1.1.1.1"
  // We use a flexible pattern that matches digit-dot sequences totaling around 17 chars

  // Main pattern: match sequences of digits separated by dots, 3+ segments
  const kodeAkunPattern = /(\d+(?:\.\d+){2,})/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.trim().length === 0) continue

    let match: RegExpExecArray | null
    const pattern = new RegExp(kodeAkunPattern.source, kodeAkunPattern.flags)

    while ((match = pattern.exec(line)) !== null) {
      const kodeAkun = match[1]

      // Filter: minimum 17 characters (including dots)
      // Codes with < 17 chars are group/header/subtotal codes — skip them
      // Examples of skipped codes: "5.1" (3), "5.1.01" (6), "5.1.01.01" (9), "4.1.1" (5)
      // Examples of valid codes: "4.1.04.01.02.0055" (17), "5.1.01.01.001.00001" (19)
      if (kodeAkun.length < 17) continue

      // Must have at least 3 dot-separated segments
      const segments = kodeAkun.split('.')
      if (segments.length < 3) continue

      // Each segment must be a valid number
      const allValid = segments.every(s => /^\d+$/.test(s))
      if (!allValid) continue

      // Extract text after the kode akun on the same line
      const afterCode = line.substring(match.index + match[0].length).trim()

      // Try to extract nama akun (text before numbers) and amounts
      const { namaAkun, anggaran, realisasi } = parseLineData(afterCode)

      // Auto-detect jenis and kategori from kode akun prefix
      const detectedJenis = detectJenisFromKodeAkun(kodeAkun)
      const detectedKategori = detectedJenis
        ? detectKategoriFromKodeAkun(kodeAkun)
        : 'Lainnya'

      results.push({
        kodeAkun,
        namaAkun: namaAkun || `Akun ${kodeAkun}`,
        anggaran,
        realisasi,
        line: i + 1,
        rawLine: line.trim(),
        detectedJenis,
        detectedKategori,
      })
    }
  }

  // Sort by kodeAkun for consistency
  results.sort((a, b) => a.kodeAkun.localeCompare(b.kodeAkun))

  // Remove duplicates (same kodeAkun)
  const seen = new Set<string>()
  return results.filter(item => {
    if (seen.has(item.kodeAkun)) return false
    seen.add(item.kodeAkun)
    return true
  })
}

/**
 * Parse the text after a kode akun to extract nama akun and amounts.
 * Government PDFs typically have: KODE NAMA_AKUN ANGGARAN REALISASI
 */
function parseLineData(text: string): { namaAkun: string; anggaran: number; realisasi: number } {
  if (!text || text.length === 0) {
    return { namaAkun: '', anggaran: 0, realisasi: 0 }
  }

  // Strategy: Find numbers in the text. The text between kode and the first number is the nama akun.
  // Then the numbers are anggaran and realisasi (could be 1, 2, or more numbers).

  // Indonesian number format: 1.234.567 or 1,234,567 or 1234567
  // We need to find large number patterns
  const indoNumberPattern = /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?)|(\d{4,})/g

  const numbers: { value: number; index: number }[] = []
  let numMatch: RegExpExecArray | null

  while ((numMatch = indoNumberPattern.exec(text)) !== null) {
    const numStr = numMatch[0]
    // Parse Indonesian format: remove dots as thousand separators, handle comma as decimal
    const cleaned = numStr.replace(/\./g, '').replace(/,/, '.')
    const value = parseFloat(cleaned)
    if (!isNaN(value) && value > 0) {
      numbers.push({ value, index: numMatch.index })
    }
  }

  // Determine nama akun: text before the first number
  let namaAkun = ''
  let anggaran = 0
  let realisasi = 0

  if (numbers.length >= 2) {
    // First number is likely anggaran, second is realisasi
    namaAkun = text.substring(0, numbers[0].index).trim()
    anggaran = numbers[0].value
    realisasi = numbers[1].value
  } else if (numbers.length === 1) {
    // Only one number, assume it's anggaran
    namaAkun = text.substring(0, numbers[0].index).trim()
    anggaran = numbers[0].value
  } else {
    // No numbers found, entire text is nama akun
    namaAkun = text.trim()
  }

  // Clean up nama akun: remove leading/trailing special chars
  namaAkun = namaAkun.replace(/^[\s\-:.,]+|[\s\-:.,]+$/g, '').trim()

  return { namaAkun, anggaran, realisasi }
}

function getDbModel(jenis: JenisData) {
  switch (jenis) {
    case 'pendapatan': return db.pendapatan
    case 'belanja': return db.belanja
    case 'pembiayaan': return db.pembiayaan
  }
}

function getHistoryModel(jenis: JenisData) {
  switch (jenis) {
    case 'pendapatan': return db.pendapatanHistory
    case 'belanja': return db.belanjaHistory
    case 'pembiayaan': return db.pembiayaanHistory
  }
}
