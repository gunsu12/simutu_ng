import { db } from '../../database'
import { users } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const userId = event.context.params?.id

    if (!userId) {
      return {
        success: false,
        message: 'User ID is required',
      }
    }

    const deletedUser = await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    if (deletedUser.length === 0) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    await logActivity({
      event,
      action: 'DELETE',
      module: 'users',
      description: `Menghapus user: ${deletedUser[0].name} (${deletedUser[0].email})`,
      details: { userId, name: deletedUser[0].name, email: deletedUser[0].email }
    })

    return {
      success: true,
      message: 'User deleted successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to delete user',
    }
  }
})
