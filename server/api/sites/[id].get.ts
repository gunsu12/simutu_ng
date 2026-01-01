import { db } from '../../database'
import { sites } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { getPresignedUrl } from '../../utils/s3'

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
    
    // Generate signed URL for logo if exists
    if (siteData.siteLogo) {
      let key = siteData.siteLogo
      if (key.includes('http')) {
        const urlParts = key.split('?')[0]
        key = urlParts.split('/').slice(-3).join('/')
      }
      
      try {
        const signedUrl = await getPresignedUrl(key, 604800)
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
