import { db } from '../../database'
import { users } from '../../database/schema'
import { eq } from 'drizzle-orm'

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
      .delete(users)
      .where(eq(users.id, userId))
      .returning()

    if (deletedUser.length === 0) {
      return {
        success: false,
        message: 'User not found',
      }
    }

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
