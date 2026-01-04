import { db } from '../database'
import { activityLogs } from '../database/schema'
import { lt } from 'drizzle-orm'
import type { H3Event } from 'h3'

export type ActivityAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'VERIFY'
  | 'STATUS_CHANGE'
  | 'EXPORT'

export type ActivityModule = 
  | 'auth'
  | 'users'
  | 'sites'
  | 'divisions'
  | 'units'
  | 'employees'
  | 'indicators'
  | 'indicator-categories'
  | 'indicator-entries'
  | 'indicator-pdcas'
  | 'reports'
  | 'settings'
  | 'activity-logs'

interface LogActivityParams {
  event: H3Event
  action: ActivityAction
  module: ActivityModule
  description: string
  details?: Record<string, any>
  userId?: string | null
  userName?: string
  userEmail?: string
}

/**
 * Log user activity to the database
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const { event, action, module, description, details, userId, userName, userEmail } = params

  try {
    // Try to get user from event context if not provided
    let logUserId = userId
    let logUserName = userName || 'System'
    let logUserEmail = userEmail || 'system@system'

    if (event.context.user) {
      logUserId = logUserId ?? event.context.user.id
      logUserName = userName || event.context.user.name
      logUserEmail = userEmail || event.context.user.email
    }

    // Get IP address and user agent
    const headers = getHeaders(event)
    const ipAddress = headers['x-forwarded-for'] || 
                      headers['x-real-ip'] || 
                      getRequestIP(event) || 
                      'unknown'
    const userAgent = headers['user-agent'] || 'unknown'

    await db.insert(activityLogs).values({
      userId: logUserId || null,
      userName: logUserName,
      userEmail: logUserEmail,
      action,
      module,
      description,
      details: details ? JSON.stringify(details) : null,
      ipAddress: typeof ipAddress === 'string' ? ipAddress : ipAddress[0],
      userAgent,
    })
  } catch (error) {
    // Log error but don't throw - logging should not break the main flow
    console.error('Failed to log activity:', error)
  }
}

/**
 * Clean up activity logs older than 1 week
 * This should be called periodically (e.g., on server startup, via cron, or API call)
 */
export async function cleanupOldActivityLogs(): Promise<number> {
  try {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const result = await db
      .delete(activityLogs)
      .where(lt(activityLogs.createdAt, oneWeekAgo))
      .returning({ id: activityLogs.id })

    console.log(`Cleaned up ${result.length} activity logs older than 1 week`)
    return result.length
  } catch (error) {
    console.error('Failed to cleanup old activity logs:', error)
    throw error
  }
}

/**
 * Schedule automatic cleanup every day
 * Call this once during server initialization
 */
let cleanupInterval: NodeJS.Timeout | null = null

export function startActivityLogCleanupScheduler(): void {
  if (cleanupInterval) {
    return // Already started
  }

  // Run cleanup every 24 hours
  const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000

  // Run cleanup immediately on start
  cleanupOldActivityLogs().catch(console.error)

  // Schedule periodic cleanup
  cleanupInterval = setInterval(() => {
    cleanupOldActivityLogs().catch(console.error)
  }, CLEANUP_INTERVAL_MS)

  console.log('Activity log cleanup scheduler started - will clean logs older than 1 week every 24 hours')
}

export function stopActivityLogCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.log('Activity log cleanup scheduler stopped')
  }
}
