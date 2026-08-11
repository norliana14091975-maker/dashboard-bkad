/**
 * Auto-detection of JenisData (pendapatan/belanja/pembiayaan) and Kategori
 * from Indonesian government account code prefixes.
 *
 * Standard SAK/SAKPA account code structure:
 *   4.x.x.x.x.x = Pendapatan (Revenue)
 *   5.x.x.x.x.x = Belanja (Expenditure)
 *   6.x.x.x.x.x = Pembiayaan (Financing)
 *   7.x.x.x.x.x = Surplus/Defisit
 */

export type JenisData = 'pendapatan' | 'belanja' | 'pembiayaan'

/**
 * Detect JenisData from the first digit of a kode akun.
 *
 * @param kodeAkun - Account code, e.g., "4.1.04.01.02.0055" or "5.1.01.01.001.00001"
 * @returns JenisData or null if the prefix is not recognized
 *
 * @example
 *   detectJenisFromKodeAkun("4.1.04.01.02.0055")  // → "pendapatan"
 *   detectJenisFromKodeAkun("5.1.01.01.001.00001") // → "belanja"
 *   detectJenisFromKodeAkun("6.1.1.01.01.0001")    // → "pembiayaan"
 *   detectJenisFromKodeAkun("3.1.01")              // → null (not a standard budget code)
 */
export function detectJenisFromKodeAkun(kodeAkun: string): JenisData | null {
  const firstDigit = kodeAkun.trim().charAt(0)

  switch (firstDigit) {
    case '4':
      return 'pendapatan'
    case '5':
      return 'belanja'
    case '6':
      return 'pembiayaan'
    default:
      return null
  }
}

/**
 * Default kategori labels per jenis, used as fallback
 * when a more specific sub-kategori cannot be determined.
 */
export const defaultKategoriPerJenis: Record<JenisData, string> = {
  pendapatan: 'PAD',
  belanja: 'Operasi',
  pembiayaan: 'Penerimaan',
}

/**
 * More specific kategori detection based on the first 2-3 segments
 * of the kode akun. Falls back to defaultKategoriPerJenis.
 *
 * @param kodeAkun - Account code, e.g., "4.1.04.01.02.0055"
 * @returns The detected kategori string
 *
 * @example
 *   detectKategoriFromKodeAkun("4.1.04.01.02.0055")  // → "PAD"
 *   detectKategoriFromKodeAkun("4.2.01.01.01.0001")  // → "Transfer"
 *   detectKategoriFromKodeAkun("5.1.01.01.001.00001") // → "Operasi"
 *   detectKategoriFromKodeAkun("5.2.01.01.001.00001") // → "Modal"
 *   detectKategoriFromKodeAkun("6.1.1.01.01.0001")    // → "Penerimaan"
 *   detectKategoriFromKodeAkun("6.2.1.01.01.0001")    // → "Pengeluaran"
 */
export function detectKategoriFromKodeAkun(kodeAkun: string): string {
  const segments = kodeAkun.trim().split('.')
  const firstDigit = segments[0]
  const secondDigit = segments.length > 1 ? segments[1] : ''

  // Pendapatan sub-categories
  if (firstDigit === '4') {
    switch (secondDigit) {
      case '1': return 'PAD'
      case '2': return 'Transfer'
      case '3': return 'Lain-Lain'
      default: return 'PAD'
    }
  }

  // Belanja sub-categories
  if (firstDigit === '5') {
    switch (secondDigit) {
      case '1': return 'Operasi'
      case '2': return 'Modal'
      case '3': return 'Tidak Terduga'
      case '4': return 'Transfer'
      default: return 'Operasi'
    }
  }

  // Pembiayaan sub-categories
  if (firstDigit === '6') {
    switch (secondDigit) {
      case '1': return 'Penerimaan'
      case '2': return 'Pengeluaran'
      default: return 'Penerimaan'
    }
  }

  return 'Lainnya'
}

/**
 * Label and color for each JenisData, useful for UI display.
 */
export const jenisLabels: Record<JenisData, string> = {
  pendapatan: 'Pendapatan',
  belanja: 'Belanja',
  pembiayaan: 'Pembiayaan',
}

export const jenisColors: Record<JenisData, string> = {
  pendapatan: 'bg-emerald-500',
  belanja: 'bg-red-500',
  pembiayaan: 'bg-amber-500',
}

export const jenisBadgeVariants: Record<JenisData, string> = {
  pendapatan: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  belanja: 'bg-red-100 text-red-800 border-red-300',
  pembiayaan: 'bg-amber-100 text-amber-800 border-amber-300',
}
