import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper: get "today" in Asia/Jakarta timezone as a UTC Date for Prisma queries
function getTodayJakarta(): Date {
  const now = new Date()
  // Format: "Asia/Jakarta" is UTC+7
  const jakartaOffsetMs = 7 * 60 * 60 * 1000
  const jakartaNow = new Date(now.getTime() + jakartaOffsetMs + now.getTimezoneOffset() * 60000)
  return new Date(jakartaNow.getFullYear(), jakartaNow.getMonth(), jakartaNow.getDate())
}

// POST /api/pengunjung/track — Upsert visitor session + heartbeat + return stats
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, halaman } = body as { sessionId?: string; halaman?: string }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwarded?.split(',')[0]?.trim() || realIp || null

    // Get user-agent
    const userAgent = request.headers.get('user-agent') || null

    // Upsert the Pengunjung record by sessionId
    await db.pengunjung.upsert({
      where: { sessionId },
      update: {
        lastActive: new Date(),
        ...(halaman ? { halaman } : {}),
        ipAddress,
        userAgent,
      },
      create: {
        sessionId,
        ipAddress,
        userAgent,
        halaman: halaman || null,
        lastActive: new Date(),
      },
    })

    // Clean up stale sessions: delete records where lastActive > 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    await db.pengunjung.deleteMany({
      where: {
        lastActive: { lt: fiveMinutesAgo },
      },
    })

    // Compute stats
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    const todayStart = getTodayJakarta()

    const [online, today, total] = await Promise.all([
      db.pengunjung.count({
        where: { lastActive: { gt: twoMinutesAgo } },
      }),
      db.pengunjung.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.pengunjung.count(),
    ])

    return NextResponse.json({
      success: true,
      stats: { online, today, total },
    })
  } catch (error) {
    console.error('[pengunjung/track] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/pengunjung/track — Return visitor stats only (no tracking)
export async function GET() {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    const todayStart = getTodayJakarta()

    const [online, today, total] = await Promise.all([
      db.pengunjung.count({
        where: { lastActive: { gt: twoMinutesAgo } },
      }),
      db.pengunjung.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.pengunjung.count(),
    ])

    return NextResponse.json({
      online,
      today,
      total,
    })
  } catch (error) {
    console.error('[pengunjung/track] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
