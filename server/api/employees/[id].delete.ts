import { db } from '../../database'
import { employees } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      return {
        success: false,
        message: 'Employee ID is required',
      }
    }
    
    // Get employee to delete picture
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1)
    
    if (employee.length > 0 && employee[0].picture) {
      await deleteFile(employee[0].picture)
    }
    
    await db.delete(employees).where(eq(employees.id, id))
    
    return {
      success: true,
      message: 'Employee deleted successfully',
    }
  } catch (error: any) {
    console.error('Delete employee error:', error)
    return {
      success: false,
      message: error.message || 'Failed to delete employee',
    }
  }
})
