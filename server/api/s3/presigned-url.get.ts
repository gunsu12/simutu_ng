import { getPresignedUrl } from '../../utils/s3'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const key = query.key as string
    
    if (!key) {
      return {
        success: false,
        message: 'File key is required',
      }
    }
    
    // Generate presigned URL (valid for 7 days)
    const signedUrl = await getPresignedUrl(key, 604800)
    
    return {
      success: true,
      url: signedUrl,
    }
  } catch (error: any) {
    console.error('Get presigned URL error:', error)
    return {
      success: false,
      message: error.message || 'Failed to generate presigned URL',
    }
  }
})
