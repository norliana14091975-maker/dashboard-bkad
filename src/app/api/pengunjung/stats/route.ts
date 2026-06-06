import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper: get "today" in Asia/Jakarta timezone as a UTC Date for Prisma queries
function getTodayJakarta(): Date {
  const now = new Date()
  // Asia/Jakarta is UTC+7
  const jakartaOffsetMs = 7 * 60 * 60 * 1000
  const jakartaNow = new Date(now.getTime() + jakartaOffsetMs + now.getTimezoneOffset() * 60000)
  return new Date(jakartaNow.getFullYear(), jakartaNow.getMonth(), jakartaNow.getDate())
}

// GET /api/pengunjung/stats — Extended visitor stats with cleanup
export async function GET() {
  try {
    // Clean up stale sessions first: delete records where lastActive > 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    await db.pengunjung.deleteMany({
      where: {
        lastActive: { lt: fiveMinutesAgo },
      },
    })

    // Compute all stats in parallel
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    const todayStart = getTodayJakarta()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [online, today, thisWeek, thisMonth, total] = await Promise.all([
      db.pengunjung.count({
        where: { lastActive: { gt: twoMinutesAgo } },
      }),
      db.pengunjung.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.pengunjung.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      db.pengunjung.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      db.pengunjung.count(),
    ])

    return NextResponse.json({
      online,
      today,
      thisWeek,
      thisMonth,
      total,
    })
  } catch (error) {
    console.error('[pengunjung/stats] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
