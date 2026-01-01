import { db } from '../../database'
import { users, employees, sites } from '../../database/schema'
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

    const user = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        employeeId: users.employeeId,
        siteId: users.siteId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        employeeName: employees.fullName,
        siteName: sites.name,
      })
      .from(users)
      .leftJoin(employees, eq(users.employeeId, employees.id))
      .leftJoin(sites, eq(users.siteId, sites.id))
      .where(eq(users.id, userId))

    if (user.length === 0) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    return {
      success: true,
      data: user[0],
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch user',
    }
  }
})
