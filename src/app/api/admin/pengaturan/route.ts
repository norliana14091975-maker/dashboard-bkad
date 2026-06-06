import { db } from '@/lib/db'
import { invalidateDashboardCache } from '@/lib/cache'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Increase body size limit to 10MB for large base64 image uploads (GIF, etc.)
export const maxBodyLength = 10 * 1024 * 1024

async function checkAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session
}

// Hex color validation regex: #RRGGBB format
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

// Max logo base64 size: 1MB
const MAX_LOGO_SIZE = 1_000_000
// Max loader image base64 size: 3MB (GIFs can be larger)
const MAX_LOADER_IMAGE_SIZE = 3_000_000

/**
 * Helper: Get or create active application settings.
 * If no active settings exist, creates one with defaults.
 */
async function getOrCreateSettings() {
  let settings = await db.pengaturanAplikasi.findFirst({
    where: { aktif: true },
  })

  if (!settings) {
    // Check if any settings exist at all
    const anySettings = await db.pengaturanAplikasi.findFirst()
    if (anySettings) {
      // Settings exist but none is active — activate the first one
      settings = await db.pengaturanAplikasi.update({
        where: { id: anySettings.id },
        data: { aktif: true },
      })
    } else {
      // No settings at all — create default
      settings = await db.pengaturanAplikasi.create({
        data: { aktif: true },
      })
    }
  }

  return settings
}

// GET /api/admin/pengaturan — Fetch active application settings
export async function GET() {
  try {
    const settings = await getOrCreateSettings()
    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('GET pengaturan error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application settings' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/pengaturan — Update active application settings
export async function PUT(request: Request) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const settings = await getOrCreateSettings()

    const body = await request.json()

    // Build update data with validation
    const updateData: Record<string, unknown> = {}

    // String fields
    const stringFields = [
      'namaAplikasi',
      'namaPemerintah',
      'namaInstansi',
      'logoBase64',
      'logoUrl',
      'alamatInstansi',
      'teleponInstansi',
      'emailInstansi',
      'websiteInstansi',
      'loaderImageBase64',
    ] as const

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        if (body[field] !== null && typeof body[field] !== 'string') {
          return NextResponse.json(
            { error: `${field} must be a string or null` },
            { status: 400 }
          )
        }
        // Validate logo base64 size
        if (field === 'logoBase64' && body[field] && body[field].length > MAX_LOGO_SIZE) {
          return NextResponse.json(
            { error: 'Logo terlalu besar (maksimal 1MB). Pilih file yang lebih kecil.' },
            { status: 400 }
          )
        }
        // Validate loader image base64 size
        if (field === 'loaderImageBase64' && body[field] && body[field].length > MAX_LOADER_IMAGE_SIZE) {
          return NextResponse.json(
            { error: 'Gambar loader terlalu besar (maksimal 2MB). Pilih file yang lebih kecil.' },
            { status: 400 }
          )
        }
        updateData[field] = body[field]
      }
    }

    // Hex color fields — validate format
    const colorFields = [
      'warnaPrimary',
      'warnaSecondary',
      'warnaAccent',
      'warnaDark',
    ] as const

    for (const field of colorFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== 'string') {
          return NextResponse.json(
            { error: `${field} must be a string` },
            { status: 400 }
          )
        }
        if (!HEX_COLOR_REGEX.test(body[field])) {
          return NextResponse.json(
            { error: `${field} must be a valid hex color (format: #RRGGBB)` },
            { status: 400 }
          )
        }
        updateData[field] = body[field]
      }
    }

    // Boolean fields
    if (body.aktif !== undefined) {
      if (typeof body.aktif !== 'boolean') {
        return NextResponse.json(
          { error: 'aktif must be a boolean' },
          { status: 400 }
        )
      }
      updateData.aktif = body.aktif
    }

    // setupComplete field — for reset setup wizard
    if (body.setupComplete !== undefined) {
      if (typeof body.setupComplete !== 'boolean') {
        return NextResponse.json(
          { error: 'setupComplete must be a boolean' },
          { status: 400 }
        )
      }
      updateData.setupComplete = body.setupComplete
    }

    // sidebarConfig field — JSON string for sidebar visibility per role
    if (body.sidebarConfig !== undefined) {
      if (body.sidebarConfig !== null && typeof body.sidebarConfig !== 'object' && typeof body.sidebarConfig !== 'string') {
        return NextResponse.json(
          { error: 'sidebarConfig must be an object or null' },
          { status: 400 }
        )
      }
      // Store as JSON string
      if (typeof body.sidebarConfig === 'object') {
        updateData.sidebarConfig = JSON.stringify(body.sidebarConfig)
      } else {
        updateData.sidebarConfig = body.sidebarConfig
      }
    }

    // loaderType field — string: "classic" or "modern"
    if (body.loaderType !== undefined) {
      if (typeof body.loaderType !== 'string' || !['classic', 'modern'].includes(body.loaderType)) {
        return NextResponse.json(
          { error: 'loaderType must be either "classic" or "modern"' },
          { status: 400 }
        )
      }
      updateData.loaderType = body.loaderType
    }

    // loaderDisplayTime field — integer in milliseconds
    if (body.loaderDisplayTime !== undefined) {
      if (typeof body.loaderDisplayTime !== 'number' || body.loaderDisplayTime < 0 || body.loaderDisplayTime > 30000) {
        return NextResponse.json(
          { error: 'loaderDisplayTime must be a number between 0 and 30000 (milliseconds)' },
          { status: 400 }
        )
      }
      updateData.loaderDisplayTime = Math.round(body.loaderDisplayTime)
    }

    // autoRefreshInterval field — integer in minutes (0 = disabled, max 1440 = 24h)
    if (body.autoRefreshInterval !== undefined) {
      if (typeof body.autoRefreshInterval !== 'number' || body.autoRefreshInterval < 0 || body.autoRefreshInterval > 1440) {
        return NextResponse.json(
          { error: 'autoRefreshInterval must be a number between 0 and 1440 (minutes, 0 = disabled)' },
          { status: 400 }
        )
      }
      updateData.autoRefreshInterval = Math.round(body.autoRefreshInterval)
    }

    // copilotConfig field — JSON string for AI Copilot configuration
    if (body.copilotConfig !== undefined) {
      if (body.copilotConfig !== null && typeof body.copilotConfig !== 'object' && typeof body.copilotConfig !== 'string') {
        return NextResponse.json(
          { error: 'copilotConfig must be an object or null' },
          { status: 400 }
        )
      }
      // Store as JSON string
      if (typeof body.copilotConfig === 'object') {
        updateData.copilotConfig = JSON.stringify(body.copilotConfig)
      } else {
        updateData.copilotConfig = body.copilotConfig
      }
    }

    // If no fields to update, return current settings
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const updated = await db.pengaturanAplikasi.update({
      where: { id: settings.id },
      data: updateData,
    })

    invalidateDashboardCache()

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('PUT pengaturan error:', error)
    return NextResponse.json(
      { error: 'Failed to update application settings' },
      { status: 500 }
    )
  }
}
