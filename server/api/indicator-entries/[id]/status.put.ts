import { db } from '../../../database'
import { indicatorEntries, indicatorEntryItems, indicatorEntryVerificationLogs, units, employees } from '../../../database/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { logActivity } from '../../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const session = event.context.session
    if (!session) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    const user = event.context.user
    if (!user) {
      throw createError({
        statusCode: 401,
        message: 'User not found',
      })
    }

    const id = event.context.params?.id
    if (!id) {
      throw createError({
        statusCode: 400,
        message: 'Entry ID is required',
      })
    }

    const body = await readBody(event)
    const { status, auditorNotes, itemUpdates } = body

    // Role-based status permissions:
    // - user: can only set to 'proposed'
    // - manager: can set to 'checked' or 'pending'
    // - auditor/admin: can set to 'finish'
    const roleStatusPermissions: Record<string, string[]> = {
      user: ['proposed'],
      manager: ['checked', 'pending'],
      auditor: ['finish'],
      admin: ['proposed', 'checked', 'pending', 'finish'], // Admin can do everything
    }

    const allowedStatuses = roleStatusPermissions[user.role] || []
    
    if (!allowedStatuses.includes(status)) {
      throw createError({
        statusCode: 403,
        message: `Your role (${user.role}) can only set status to: ${allowedStatuses.join(', ')}`,
      })
    }

    // Fetch the entry to check permissions
    const [existingEntry] = await db
      .select({
        entry: indicatorEntries,
        unit: units,
      })
      .from(indicatorEntries)
      .leftJoin(units, eq(indicatorEntries.unitId, units.id))
      .where(and(
        eq(indicatorEntries.id, id),
        isNull(indicatorEntries.deletedAt)
      ))
      .limit(1)

    if (!existingEntry) {
      throw createError({
        statusCode: 404,
        message: 'Entry not found',
      })
    }

    // Check if entry is already finished - immutable
    if (existingEntry.entry.status === 'finish') {
      throw createError({
        statusCode: 400,
        message: 'Cannot update a finished entry. Finished entries are immutable.',
      })
    }

    // For manager role, verify entry belongs to their division
    if (user.role === 'manager') {
      if (!user.employeeId) {
        throw createError({
          statusCode: 403,
          message: 'Manager must have an employee record.',
        })
      }

      // Get the employee's division
      const employeeData = await db
        .select({
          divisionId: units.divisionId,
        })
        .from(employees)
        .leftJoin(units, eq(employees.unitId, units.id))
        .where(eq(employees.id, user.employeeId))
        .limit(1)

      if (!employeeData.length || !employeeData[0].divisionId) {
        throw createError({
          statusCode: 403,
          message: 'Manager must be assigned to a unit with a division.',
        })
      }

      const managerDivisionId = employeeData[0].divisionId

      // Check if entry's unit is in manager's division
      if (existingEntry.unit?.divisionId !== managerDivisionId) {
        throw createError({
          statusCode: 403,
          message: 'You can only update entries from your division.',
        })
      }
    }

    const previousStatus = existingEntry.entry.status

    // Update entry status
    const [updatedEntry] = await db
      .update(indicatorEntries)
      .set({
        status,
        auditorNotes: auditorNotes !== undefined ? auditorNotes : existingEntry.entry.auditorNotes,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(indicatorEntries.id, id))
      .returning()

    // Create verification log entry
    await db.insert(indicatorEntryVerificationLogs).values({
      indicatorEntryId: id,
      previousStatus,
      newStatus: status,
      notes: auditorNotes || null,
      createdBy: user.id,
    })

    // Update items if provided (for isAlreadyChecked and isNeedPDCA flags)
    if (itemUpdates && Array.isArray(itemUpdates)) {
      for (const itemUpdate of itemUpdates) {
        if (itemUpdate.id) {
          const updateFields: any = {
            updatedAt: new Date(),
          }
          
          if (typeof itemUpdate.isAlreadyChecked === 'boolean') {
            updateFields.isAlreadyChecked = itemUpdate.isAlreadyChecked
          }
          if (typeof itemUpdate.isNeedPDCA === 'boolean') {
            updateFields.isNeedPDCA = itemUpdate.isNeedPDCA
          }
          
          await db
            .update(indicatorEntryItems)
            .set(updateFields)
            .where(eq(indicatorEntryItems.id, itemUpdate.id))
        }
      }
    }

    await logActivity({
      event,
      action: 'STATUS_CHANGE',
      module: 'indicator-entries',
      description: `Mengubah status entry ${updatedEntry.entryCode} dari ${existingEntry.entry.status} ke ${status}`,
      details: { entryId: id, entryCode: updatedEntry.entryCode, previousStatus: existingEntry.entry.status, newStatus: status }
    })

    return {
      success: true,
      message: 'Entry status updated successfully',
      data: updatedEntry,
    }
  } catch (error: any) {
    console.error('Update entry status error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to update entry status',
    })
  }
})
