import { db } from '../../database'
import { sites } from '../../database/schema'
import { asc, isNull } from 'drizzle-orm'
import { getPresignedUrl } from '../../utils/s3'

export default defineEventHandler(async (event) => {
  try {
    const allSites = await db
      .select()
      .from(sites)
      .where(isNull(sites.deletedAt))
      .orderBy(sites.createdAt)
    
    // Generate signed URLs for logos
    const sitesWithSignedUrls = await Promise.all(
      allSites.map(async (site) => {
        if (site.siteLogo) {
          // Extract key from URL (handle both old and new format)
          let key = site.siteLogo
          if (key.includes('http')) {
            const urlParts = key.split('?')[0]
            key = urlParts.split('/').slice(-3).join('/')
          }
          
          try {
            const signedUrl = await getPresignedUrl(key, 604800)
            return { ...site, siteLogo: signedUrl }
          } catch (error) {
            console.error('Error generating signed URL for', key, error)
            return site
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
