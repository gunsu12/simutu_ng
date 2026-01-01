import { db } from '../../database'
import { employees, units, sites } from '../../database/schema'
import { eq, and, or, ilike, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { siteId, unitId, search } = query

    // Build where conditions
    const conditions = [isNull(employees.deletedAt)]
    
    if (siteId && siteId !== '') {
      conditions.push(eq(employees.siteId, siteId as string))
    }
    
    if (unitId && unitId !== '') {
      conditions.push(eq(employees.unitId, unitId as string))
    }

    let allEmployees = await db
      .select({
        id: employees.id,
        siteId: employees.siteId,
        nik: employees.nik,
        fullName: employees.fullName,
        unitId: employees.unitId,
        identityNumber: employees.identityNumber,
        phoneNumber: employees.phoneNumber,
        picture: employees.picture,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        siteName: sites.name,
        unitName: units.name,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(units, eq(employees.unitId, units.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(employees.createdAt)
    
    // Apply search filter
    if (search && search !== '') {
      const searchTerm = (search as string).toLowerCase()
      allEmployees = allEmployees.filter(
        (employee) =>
          employee.nik.toLowerCase().includes(searchTerm) ||
          employee.fullName.toLowerCase().includes(searchTerm) ||
          (employee.identityNumber && employee.identityNumber.toLowerCase().includes(searchTerm)) ||
          (employee.phoneNumber && employee.phoneNumber.toLowerCase().includes(searchTerm))
      )
    }
    
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
