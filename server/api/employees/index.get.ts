import { db } from '../../database'
import { employees, units, sites } from '../../database/schema'
import { eq, and, or, ilike, isNull } from 'drizzle-orm'
import { generateFileUrl } from '../../utils/s3'

/**
 * Extract S3 key from stored value.
 * Handles both old format (full URL) and new format (key only).
 */
function extractS3Key(storedValue: string | null): string | null {
  if (!storedValue) return null
  
  // If it's already a key (no http), return as-is
  if (!storedValue.includes('http')) {
    return storedValue
  }
  
  // Extract key from full URL (remove query string, get last 3 path segments)
  const urlParts = storedValue.split('?')[0]
  return urlParts.split('/').slice(-3).join('/')
}

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
    
    // Generate presigned URLs for pictures (use thumbnail for list view)
    const employeesWithSignedUrls = await Promise.all(
      allEmployees.map(async (employee) => {
        // Use thumbnail for list view
        const thumbnailKey = extractS3Key(employee.pictureThumbnail)
        if (thumbnailKey) {
          try {
            const signedUrl = await generateFileUrl(thumbnailKey)
            return { ...employee, picture: signedUrl }
          } catch (error) {
            console.error('Error generating presigned URL:', error)
          }
        }
        // Fallback to original if no thumbnail (backward compatibility)
        const key = extractS3Key(employee.picture)
        if (key) {
          try {
            const signedUrl = await generateFileUrl(key)
            return { ...employee, picture: signedUrl }
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
