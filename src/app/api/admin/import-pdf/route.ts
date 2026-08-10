import { db } from '@/lib/db'
import { invalidateDashboardCache } from '@/lib/cache'
import { syncRealisasiAkun } from '@/lib/sync-realisasi-akun'
import { syncRealisasiSkpd } from '@/lib/sync-realisasi-skpd'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const maxBodyLength = 50 * 1024 * 1024 // 50MB for PDF files

type JenisData = 'pendapatan' | 'belanja' | 'pembiayaan'

interface ExtractedAkun {
  kodeAkun: string
  namaAkun: string
  anggaran: number
  realisasi: number
  line: number
  rawLine: string
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

    if (!jenis || !['pendapatan', 'belanja', 'pembiayaan'].includes(jenis)) {
      return NextResponse.json({ error: 'Jenis data harus pendapatan, belanja, atau pembiayaan' }, { status: 400 })
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
        error: 'Tidak ditemukan kode akun 17 digit (termasuk titik) dalam PDF ini',
        totalLinesScanned: 0,
      }, { status: 400 })
    }

    // If action is 'parse', return preview data only
    if (action === 'parse') {
      return NextResponse.json({
        success: true,
        action: 'parse',
        extracted: extractedData,
        totalFound: extractedData.length,
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

      const userName = (session.user as { name?: string })?.name || 'Unknown'
      const dbModel = getDbModel(jenis as JenisData)
      const historyModel = getHistoryModel(jenis as JenisData)

      // If replace mode, delete existing data first
      if (mode === 'replace') {
        const deleteWhere: Record<string, unknown> = { tahunAnggaranId }
        if (finalOpdId) {
          deleteWhere.opdId = finalOpdId
        }
        await dbModel.deleteMany({ where: deleteWhere })
      }

      let created = 0
      let updated = 0

      if (mode === 'replace') {
        const createData = rows.map(row => ({
          tahunAnggaranId,
          kodeAkun: row.kodeAkun.trim(),
          namaAkun: row.namaAkun.trim(),
          kategori: row.kategori.trim(),
          anggaran: row.anggaran || 0,
          realisasi: row.realisasi || 0,
          opdId: finalOpdId,
        }))
        await dbModel.createMany({ data: createData })
        created = rows.length
      } else {
        // Upsert mode
        for (const row of rows) {
          const kodeAkun = row.kodeAkun.trim()
          const namaAkun = row.namaAkun.trim()
          const kategori = row.kategori.trim()

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
          }
        }
      }

      // Sync realisasi
      await syncRealisasiAkun(tahunAnggaranId)
      await syncRealisasiSkpd(tahunAnggaranId)
      invalidateDashboardCache()

      const modeLabel = mode === 'replace' ? 'ganti semua' : 'timpa data sama'
      const detailMsg = mode === 'replace'
        ? `Berhasil mengimpor ${created} data dari PDF (mode ganti semua)`
        : `Berhasil mengimpor ${created} data baru & mengupdate ${updated} data dari PDF (mode timpa data sama)`

      return NextResponse.json({
        success: true,
        action: 'import',
        imported: rows.length,
        created,
        updated,
        mode,
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
  // Dynamic import for pdf-parse (CommonJS module)
  const pdfParse = (await import('pdf-parse')).default || (await import('pdf-parse'))

  const pdfData = await pdfParse(buffer)
  const text = pdfData.text

  if (!text || text.trim().length === 0) {
    return []
  }

  const lines = text.split('\n')
  const results: ExtractedAkun[] = []

  // Regex patterns for account codes with dots
  // Pattern 1: Exactly 17 characters - digit groups separated by dots
  // e.g., "1.01.02.03.01.01.01" or "4.1.1.1.1.1.1.1.1"
  // We use a flexible pattern that matches digit-dot sequences totaling around 17 chars

  // Main pattern: match sequences of digits separated by dots, 3+ segments
  const kodeAkunPattern = /(\d+(?:\.\d+){2,})/g

  // Number pattern for extracting anggaran/realisasi
  const numberPattern = /[\d.,]+/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line || line.trim().length === 0) continue

    let match: RegExpExecArray | null
    const pattern = new RegExp(kodeAkunPattern.source, kodeAkunPattern.flags)

    while ((match = pattern.exec(line)) !== null) {
      const kodeAkun = match[1]

      // Filter: must be around 17 characters (allow 13-25 to capture various formats)
      // The user specified "17 digit termasuk (.)" so we prioritize exact 17 but allow nearby
      if (kodeAkun.length < 13 || kodeAkun.length > 25) continue

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

      results.push({
        kodeAkun,
        namaAkun: namaAkun || `Akun ${kodeAkun}`,
        anggaran,
        realisasi,
        line: i + 1,
        rawLine: line.trim(),
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
