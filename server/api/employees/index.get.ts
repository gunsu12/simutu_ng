import { db } from '../../database'
import { employees, units, sites } from '../../database/schema'
import { eq, and, or, ilike, isNull, sql } from 'drizzle-orm'
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
    const siteId = query.siteId as string
    const unitId = query.unitId as string
    const search = query.search as string
    const page = parseInt(query.page as string) || 1
    const limit = parseInt(query.limit as string) || 10
    const offset = (page - 1) * limit

    // Build where conditions
    const conditions = [isNull(employees.deletedAt)]

    if (siteId && siteId !== '') {
      conditions.push(eq(employees.siteId, siteId))
    }

    if (unitId && unitId !== '') {
      conditions.push(eq(employees.unitId, unitId))
    }

    if (search && search !== '') {
      conditions.push(
        or(
          ilike(employees.fullName, `%${search}%`),
          ilike(employees.nik, `%${search}%`),
          ilike(employees.identityNumber, `%${search}%`),
          ilike(employees.phoneNumber, `%${search}%`)
        ) as any
      )
    }

    const whereClause = and(...conditions)

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(whereClause as any)

    const total = Number(countResult[0]?.count) || 0

    const allEmployees = await db
      .select({
        id: employees.id,
        siteId: employees.siteId,
        nik: employees.nik,
        fullName: employees.fullName,
        unitId: employees.unitId,
        identityNumber: employees.identityNumber,
        phoneNumber: employees.phoneNumber,
        picture: employees.picture,
        pictureThumbnail: employees.pictureThumbnail,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        siteName: sites.name,
        unitName: units.name,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(units, eq(employees.unitId, units.id))
      .where(whereClause as any)
      .orderBy(employees.createdAt)
      .limit(limit)
      .offset(offset)

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
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch employees',
    }
  }
})
