import { uploadFile, generateFileUrl } from '../utils/s3'
import { logActivity } from '../utils/activityLogger'
import { applyRateLimit, apiRateLimiter } from '../utils/rateLimiter'
import { fileTypeFromBuffer } from 'file-type'

/**
 * File upload endpoint with rate limiting
 * Rate limit: 100 requests per minute per IP
 */
export default defineEventHandler(async (event) => {
  try {
    // Apply rate limiting to prevent abuse
    await applyRateLimit(event, apiRateLimiter)

    const formData = await readFormData(event)

    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file || file.size === 0) {
      return {
        success: false,
        message: 'No file provided',
      }
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        message: 'File size exceeds 10MB limit',
      }
    }

    // Validate file type using magic numbers (content inspection)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    const detectedType = await fileTypeFromBuffer(buffer)

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Allow images as well since we might use this endpoint for them too
      'image/jpeg',
      'image/png',
      'image/webp'
    ]

    // If detectedType is undefined, it means file-type couldn't identify it (likely text or obscure format)
    // We strictly require one of the allowed types.
    if (!detectedType || !allowedTypes.includes(detectedType.mime)) {
      return {
        success: false,
        message: 'Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, and images are allowed.',
      }
    }

    // Double check that the extension matches the detected type to prevent confusing polyglots
    // (Optional but good practice, though magic number check is the most critical)

    // uploadFile now returns S3 key (not URL)
    const fileKey = await uploadFile(file, folder)

    // Generate presigned URL for immediate display
    const displayUrl = await generateFileUrl(fileKey)

    await logActivity({
      event,
      action: 'UPLOAD',
      module: 'indicators',
      description: `Mengupload file: ${file.name}`,
      details: {
        fileName: file.name,
        fileType: detectedType.mime, // stored verified type
        fileSize: file.size,
        folder
      }
    })

    return {
      success: true,
      key: fileKey,        // Store this in database
      url: displayUrl,     // Use this for immediate display
      message: 'File uploaded successfully',
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    return {
      success: false,
      message: error.message || 'Failed to upload file',
    }
  }
})
