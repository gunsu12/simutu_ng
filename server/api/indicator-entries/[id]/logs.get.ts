import { db } from '../../../database'
import { indicatorEntryVerificationLogs, users } from '../../../database/schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const id = event.context.params?.id
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Entry ID is required',
      })
    }

    // Fetch verification logs for this entry
    const logs = await db
      .select({
        log: indicatorEntryVerificationLogs,
        user: {
          id: users.id,
          name: users.name,
          role: users.role,
        },
      })
      .from(indicatorEntryVerificationLogs)
      .leftJoin(users, eq(indicatorEntryVerificationLogs.createdBy, users.id))
      .where(eq(indicatorEntryVerificationLogs.indicatorEntryId, id))
      .orderBy(desc(indicatorEntryVerificationLogs.createdAt))

    return {
      success: true,
      data: logs.map(({ log, user }) => ({
        id: log.id,
        previousStatus: log.previousStatus,
        newStatus: log.newStatus,
        notes: log.notes,
        createdAt: log.createdAt,
        createdBy: user,
      })),
    }
  } catch (error: any) {
    console.error('Fetch verification logs error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch verification logs',
    })
  }
})
