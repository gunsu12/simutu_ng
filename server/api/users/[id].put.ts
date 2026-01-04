import { db } from '../../database'
import { users } from '../../database/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { logActivity } from '../../utils/activityLogger'
import { sanitizeUserResponse, requireValidUUID } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const userId = requireValidUUID(event.context.params?.id, 'User ID')
    const body = await readBody(event)

    const { name, username, email, password, role, employeeId, siteId } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (username) updateData.username = username
    if (email) updateData.email = email
    if (password) {
      // Hash the password if provided
      updateData.password = await bcrypt.hash(password, 10)
    }
    if (role) updateData.role = role
    if (employeeId !== undefined) updateData.employeeId = employeeId && employeeId.trim() !== '' ? employeeId : null
    if (siteId !== undefined) updateData.siteId = siteId && siteId.trim() !== '' ? siteId : null

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning()

    if (updatedUser.length === 0) {
      setResponseStatus(event, 404)
      return {
        success: false,
        message: 'User not found',
      }
    }

    await logActivity({
      event,
      action: 'UPDATE',
      module: 'users',
      description: `Mengupdate user: ${updatedUser[0].name} (${updatedUser[0].email})`,
      details: { userId, name: updatedUser[0].name, email: updatedUser[0].email, role: updatedUser[0].role }
    })

    return {
      success: true,
      data: sanitizeUserResponse(updatedUser[0]),
    }
  } catch (error: any) {
    console.error('Error updating user:', error)
    setResponseStatus(event, 500)
    return {
      success: false,
      message: error.message || 'Failed to update user',
    }
  }
})
