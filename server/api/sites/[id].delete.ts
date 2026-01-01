import { db } from '../../database'
import { sites } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { deleteFile } from '../../utils/s3'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      return {
        success: false,
        message: 'Site ID is required',
      }
    }
    
    // Get the site first to access the logo URL
    const existingSite = await db.select().from(sites).where(eq(sites.id, id)).limit(1)
    
    if (existingSite.length === 0) {
      return {
        success: false,
        message: 'Site not found',
      }
    }
    
    // Delete logo from S3 if exists
    if (existingSite[0].siteLogo) {
      await deleteFile(existingSite[0].siteLogo).catch(console.error)
    }
    
    // Delete site from database
    await db.delete(sites).where(eq(sites.id, id))
    
    return {
      success: true,
      message: 'Site deleted successfully',
    }
  } catch (error: any) {
    console.error('Delete site error:', error)
    return {
      success: false,
      message: error.message || 'Failed to delete site',
    }
  }
})
