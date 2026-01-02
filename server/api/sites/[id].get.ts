import { db } from '../../database'
import { sites } from '../../database/schema'
import { eq } from 'drizzle-orm'
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
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      return {
        success: false,
        message: 'Site ID is required',
      }
    }
    
    const site = await db.select().from(sites).where(eq(sites.id, id)).limit(1)
    
    if (site.length === 0) {
      return {
        success: false,
        message: 'Site not found',
      }
    }
    
    let siteData = site[0]
    
    // Generate signed URL for logo if exists (use original for detail view)
    const key = extractS3Key(siteData.siteLogo)
    if (key) {
      try {
        const signedUrl = await generateFileUrl(key)
        siteData = { ...siteData, siteLogo: signedUrl }
      } catch (error) {
        console.error('Error generating signed URL:', error)
      }
    }
    
    return {
      success: true,
      data: siteData,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch site',
    }
  }
})
