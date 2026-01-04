import { db } from '../../database'
import { activityLogs, users } from '../../database/schema'
import { desc, eq, like, and, gte, lte, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    // Only admin can view activity logs
    if (event.context.user?.role !== 'admin') {
      setResponseStatus(event, 403)
      return {
        success: false,
        message: 'Akses ditolak. Hanya admin yang dapat melihat activity logs.',
      }
    }

    const query = getQuery(event)
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 25
    const offset = (page - 1) * limit
    
    // Filters
    const actionFilter = query.action as string
    const moduleFilter = query.module as string
    const userIdFilter = query.userId as string
    const searchFilter = query.search as string
    const startDate = query.startDate as string
    const endDate = query.endDate as string

    // Build conditions
    const conditions = []
    
    if (actionFilter) {
      conditions.push(eq(activityLogs.action, actionFilter))
    }
    
    if (moduleFilter) {
      conditions.push(eq(activityLogs.module, moduleFilter))
    }
    
    if (userIdFilter) {
      conditions.push(eq(activityLogs.userId, userIdFilter))
    }
    
    if (searchFilter) {
      conditions.push(
        sql`(${activityLogs.description} ILIKE ${`%${searchFilter}%`} OR ${activityLogs.userName} ILIKE ${`%${searchFilter}%`} OR ${activityLogs.userEmail} ILIKE ${`%${searchFilter}%`})`
      )
    }
    
    if (startDate) {
      conditions.push(gte(activityLogs.createdAt, new Date(startDate)))
    }
    
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      conditions.push(lte(activityLogs.createdAt, endDateTime))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(whereClause)
    
    const total = Number(countResult[0]?.count) || 0

    // Get activity logs
    const logs = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        userName: activityLogs.userName,
        userEmail: activityLogs.userEmail,
        action: activityLogs.action,
        module: activityLogs.module,
        description: activityLogs.description,
        details: activityLogs.details,
        ipAddress: activityLogs.ipAddress,
        userAgent: activityLogs.userAgent,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .where(whereClause)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset)

    // Parse details JSON for each log
    const logsWithParsedDetails = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }))

    return {
      success: true,
      data: logsWithParsedDetails,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error: any) {
    console.error('Error fetching activity logs:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Gagal mengambil activity logs',
    }
  }
})
