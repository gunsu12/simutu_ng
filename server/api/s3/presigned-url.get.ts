import { getPresignedUrl } from '../../utils/s3'
import { validateS3Key } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const rawKey = query.key as string

    // Validate S3 key to prevent path traversal attacks
    const key = validateS3Key(rawKey)

    // Generate presigned URL (valid for 2 hours)
    const signedUrl = await getPresignedUrl(key, 7200)

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
