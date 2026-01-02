import { uploadFile, generateFileUrl } from '../utils/s3'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readFormData(event)
    
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'uploads'
    
    if (!file || file.size === 0) {
      return {
        success: false,
        message: 'No file provided',
      }
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        message: 'Invalid file type. Only PDF, DOC, DOCX, XLS, and XLSX files are allowed.',
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

    // uploadFile now returns S3 key (not URL)
    const fileKey = await uploadFile(file, folder)
    
    // Generate presigned URL for immediate display
    const displayUrl = await generateFileUrl(fileKey)
    
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
