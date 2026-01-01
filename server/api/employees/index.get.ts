import { db } from '../../database'
import { employees, units } from '../../database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const allEmployees = await db
      .select({
        id: employees.id,
        nik: employees.nik,
        fullName: employees.fullName,
        unitId: employees.unitId,
        identityNumber: employees.identityNumber,
        phoneNumber: employees.phoneNumber,
        picture: employees.picture,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        unitName: units.name,
      })
      .from(employees)
      .leftJoin(units, eq(employees.unitId, units.id))
      .orderBy(employees.createdAt)
    
    // Generate presigned URLs for pictures
    const employeesWithSignedUrls = await Promise.all(
      allEmployees.map(async (employee) => {
        if (employee.picture) {
          try {
            // Extract the key from the signed URL (get the path before the query string)
            const urlParts = employee.picture.split('?')[0]
            const key = urlParts.split('/').slice(-3).join('/')  // Get 'employees/pictures/filename.png'
            if (key) {
              const signedUrl = await getPresignedUrl(key)
              return { ...employee, picture: signedUrl }
            }
          } catch (error) {
            console.error('Error generating presigned URL:', error)
          }
        }
        return employee
      })
    )
    
    return {
      success: true,
      data: employeesWithSignedUrls,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch employees',
    }
  }
})
