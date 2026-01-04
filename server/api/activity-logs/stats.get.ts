import { db } from '../../database'
import { activityLogs } from '../../database/schema'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    // Only admin can view activity log stats
    if (event.context.user?.role !== 'admin') {
      setResponseStatus(event, 403)
      return {
        success: false,
        message: 'Akses ditolak. Hanya admin yang dapat melihat statistik activity logs.',
      }
    }

    // Get stats by action type
    const actionStats = await db
      .select({
        action: activityLogs.action,
        count: sql<number>`count(*)`,
      })
      .from(activityLogs)
      .groupBy(activityLogs.action)

    // Get stats by module
    const moduleStats = await db
      .select({
        module: activityLogs.module,
        count: sql<number>`count(*)`,
      })
      .from(activityLogs)
      .groupBy(activityLogs.module)

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
    
    const total = Number(totalResult[0]?.count) || 0

    // Get logs from last 7 days grouped by day
    const dailyStats = await db
      .select({
        date: sql<string>`DATE(${activityLogs.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(activityLogs)
      .where(sql`${activityLogs.createdAt} >= NOW() - INTERVAL '7 days'`)
      .groupBy(sql`DATE(${activityLogs.createdAt})`)
      .orderBy(sql`DATE(${activityLogs.createdAt})`)

    // Get oldest log date
    const oldestResult = await db
      .select({ createdAt: sql<Date>`MIN(${activityLogs.createdAt})` })
      .from(activityLogs)

    const oldestLogDate = oldestResult[0]?.createdAt

    return {
      success: true,
      data: {
        total,
        actionStats: actionStats.map(s => ({ action: s.action, count: Number(s.count) })),
        moduleStats: moduleStats.map(s => ({ module: s.module, count: Number(s.count) })),
        dailyStats: dailyStats.map(s => ({ date: s.date, count: Number(s.count) })),
        oldestLogDate,
      },
    }
  } catch (error: any) {
    console.error('Error fetching activity log stats:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Gagal mengambil statistik activity logs',
    }
  }
})
