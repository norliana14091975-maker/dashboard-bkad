import { db } from '@/lib/db'
import { invalidateDashboardCache } from '@/lib/cache'
import { syncRealisasiAkun } from '@/lib/sync-realisasi-akun'
import { syncRealisasiSkpd } from '@/lib/sync-realisasi-skpd'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { detectJenisFromKodeAkun, detectKategoriFromKodeAkun, type JenisData } from '@/lib/akun-detector'

async function checkAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session
}

async function getOpdIdForTahun(opdKode: string, tahunAnggaranId: string): Promise<string | null> {
  const opd = await db.opd.findFirst({
    where: { kodeOpd: opdKode, tahunAnggaranId },
  })
  return opd?.id ?? null
}

async function getUserOpdInfo(session: NonNullable<Awaited<ReturnType<typeof checkAuth>>>) {
  const role = (session.user as { role?: string })?.role
  const opdId = (session.user as { opdId?: string | null })?.opdId
  let opdKode: string | null = null
  if (role === 'opd' && opdId) {
    const opd = await db.opd.findUnique({ where: { id: opdId } })
    opdKode = opd?.kodeOpd ?? null
  }
  return { role, opdKode }
}

// POST /api/admin/import
// Bulk import CSV/XLSX data with upsert behavior
// - "upsert" mode (default): data with same kodeAkun+kategori will be overwritten, new data will be created
// - "replace" mode: delete all existing data first, then import
export async function POST(request: Request) {
  try {
    const session = await checkAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jenis, tahunAnggaranId, rows, mode, opdId } = body as {
      jenis: JenisData
      tahunAnggaranId: string
      rows: Array<{
        kodeAkun: string
        namaAkun: string
        kategori: string
        anggaran: number
        realisasi: number
      }>
      mode: 'upsert' | 'replace'
      opdId?: string | null
    }

    // jenis can be a specific value or 'auto' for auto-detection
    const isAutoDetect = jenis === 'auto'
    if (!jenis || (!isAutoDetect && !['pendapatan', 'belanja', 'pembiayaan'].includes(jenis))) {
      return NextResponse.json({ error: 'jenis must be pendapatan, belanja, pembiayaan, or auto' }, { status: 400 })
    }

    if (!tahunAnggaranId) {
      return NextResponse.json({ error: 'tahunAnggaranId is required' }, { status: 400 })
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 })
    }

    // Validate tahunAnggaranId
    const ta = await db.tahunAnggaran.findUnique({ where: { id: tahunAnggaranId } })
    if (!ta) {
      return NextResponse.json({ error: 'Tahun anggaran not found' }, { status: 400 })
    }

    // Validate each row
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
      if (typeof row.anggaran !== 'number' || row.anggaran < 0) {
        validationErrors.push({ row: idx + 1, error: 'Anggaran harus berupa angka positif' })
      }
      if (typeof row.realisasi !== 'number' || row.realisasi < 0) {
        validationErrors.push({ row: idx + 1, error: 'Realisasi harus berupa angka positif' })
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Validasi gagal', validationErrors }, { status: 400 })
    }

    // Determine opdId
    const { role, opdKode } = await getUserOpdInfo(session)
    let finalOpdId: string | null = null

    if (role === 'opd') {
      if (!opdKode) {
        return NextResponse.json({ error: 'OPD kode tidak ditemukan untuk user ini' }, { status: 403 })
      }
      finalOpdId = await getOpdIdForTahun(opdKode, tahunAnggaranId)
      if (!finalOpdId) {
        return NextResponse.json({ error: 'OPD tidak ditemukan untuk tahun anggaran ini' }, { status: 403 })
      }
    } else if (role === 'admin' || role === 'superadmin') {
      // Admin/superadmin can specify an opdId or import globally
      if (opdId && opdId !== '__none__') {
        const targetOpd = await db.opd.findUnique({ where: { id: opdId } })
        if (!targetOpd) {
          return NextResponse.json({ error: 'OPD tidak ditemukan' }, { status: 400 })
        }
        finalOpdId = opdId
      }
      // If no opdId, import globally (finalOpdId = null)
    }

    const userName = (session.user as { name?: string })?.name || 'Unknown'

    // Each row may have its own jenis (for auto-detect mode)
    // The 'jenis' field on each row takes priority; otherwise fall back to the global jenis
    type ImportRowWithJenis = typeof rows[number] & { jenis?: string }
    const rowsWithJenis = rows as ImportRowWithJenis[]

    let created = 0
    let updated = 0
    const jenisImported: Record<string, { created: number; updated: number }> = {}
    const historyEntries: Array<{
      recordId: string
      realisasiLama: number
      realisasiBaru: number
      isUpdate: boolean
      jenis: string
    }> = []

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
        const record = await dbModel.create({
          data: {
            tahunAnggaranId,
            kodeAkun,
            namaAkun,
            kategori,
            anggaran: row.anggaran,
            realisasi: row.realisasi,
            opdId: finalOpdId,
          },
        })
        created++
        jenisImported[rowJenis].created++
        historyEntries.push({
          recordId: record.id,
          realisasiLama: 0,
          realisasiBaru: row.realisasi,
          isUpdate: false,
          jenis: rowJenis,
        })
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
          const realisasiLama = existing.realisasi
          await dbModel.update({
            where: { id: existing.id },
            data: {
              namaAkun,
              anggaran: row.anggaran,
              realisasi: row.realisasi,
              tanggalUpdate: new Date(),
            },
          })
          updated++
          jenisImported[rowJenis].updated++
          historyEntries.push({
            recordId: existing.id,
            realisasiLama,
            realisasiBaru: row.realisasi,
            isUpdate: true,
            jenis: rowJenis,
          })
        } else {
          const record = await dbModel.create({
            data: {
              tahunAnggaranId,
              kodeAkun,
              namaAkun,
              kategori,
              anggaran: row.anggaran,
              realisasi: row.realisasi,
              opdId: finalOpdId,
            },
          })
          created++
          jenisImported[rowJenis].created++
          historyEntries.push({
            recordId: record.id,
            realisasiLama: 0,
            realisasiBaru: row.realisasi,
            isUpdate: false,
            jenis: rowJenis,
          })
        }
      }
    }

    // Create history records per jenis
    for (const j of Object.keys(jenisImported)) {
      const jHistoryEntries = historyEntries.filter(e => e.jenis === j)
      const historyData = jHistoryEntries.map(entry => ({
        [`${j}Id`]: entry.recordId,
        realisasiLama: entry.realisasiLama,
        realisasiBaru: entry.realisasiBaru,
        tanggalUpdate: new Date(),
        keterangan: entry.isUpdate
          ? `Update data ${j} via import (ditimpa)`
          : `Import data ${j} (baru)`,
        updatedBy: userName,
      }))
      if (historyData.length > 0) {
        await getHistoryModel(j as JenisData).createMany({ data: historyData as any })
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
      ? `Berhasil mengimpor (${modeLabel}): ${breakdown}`
      : mode === 'replace'
        ? `Berhasil mengimpor ${created} data ${jenis} (mode ganti semua)`
        : `Berhasil mengimpor ${created} data baru & mengupdate ${updated} data ${jenis} (mode timpa data sama)`

    return NextResponse.json({
      success: true,
      imported: rows.length,
      created,
      updated,
      mode,
      jenisImported,
      message: detailMsg,
    })
  } catch (error) {
    console.error('POST import error:', error)
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 })
  }
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
