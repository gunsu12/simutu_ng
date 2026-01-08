import { db } from '../../database'
import { sites, employees } from '../../database/schema'
import { asc, isNull, eq } from 'drizzle-orm'
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
    const allSites = await db
      .select({
        id: sites.id,
        siteCode: sites.siteCode,
        name: sites.name,
        description: sites.description,
        address: sites.address,
        email: sites.email,
        website: sites.website,
        phone: sites.phone,
        fax: sites.fax,
        siteLogo: sites.siteLogo,
        siteLogoThumbnail: sites.siteLogoThumbnail,
        qualityOfficeHeadId: sites.qualityOfficeHeadId,
        qualityOfficeHeadName: employees.fullName,
        createdAt: sites.createdAt,
        updatedAt: sites.updatedAt,
      })
      .from(sites)
      .leftJoin(employees, eq(sites.qualityOfficeHeadId, employees.id))
      .where(isNull(sites.deletedAt))
      .orderBy(sites.createdAt)

    // Generate signed URLs for logos (use thumbnail for list view)
    const sitesWithSignedUrls = await Promise.all(
      allSites.map(async (site) => {
        // Use thumbnail for list view
        const thumbnailKey = extractS3Key(site.siteLogoThumbnail)
        if (thumbnailKey) {
          try {
            const signedUrl = await generateFileUrl(thumbnailKey)
            return { ...site, siteLogo: signedUrl }
          } catch (error) {
            console.error('Error generating signed URL for', thumbnailKey, error)
            return site
          }
        }
        // Fallback to original if no thumbnail (backward compatibility)
        const key = extractS3Key(site.siteLogo)
        if (key) {
          try {
            const signedUrl = await generateFileUrl(key)
            return { ...site, siteLogo: signedUrl }
          } catch (error) {
            console.error('Error generating signed URL for', key, error)
          }
        }
        return site
      })
    )

    return {
      success: true,
      data: sitesWithSignedUrls,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch sites',
    }
  }
})
