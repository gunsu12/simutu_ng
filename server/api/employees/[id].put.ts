import { db } from '../../database'
import { employees } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { uploadImageWithThumbnail, deleteFile } from '../../utils/s3'

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
    const formData = await readFormData(event)
    
    if (!id) {
      return {
        success: false,
        message: 'Employee ID is required',
      }
    }
    
    // Get existing employee
    const existingEmployee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1)
    
    if (existingEmployee.length === 0) {
      return {
        success: false,
        message: 'Employee not found',
      }
    }
    
    const siteId = formData.get('siteId') as string
    const nik = formData.get('nik') as string
    const fullName = formData.get('fullName') as string
    const unitId = formData.get('unitId') as string
    const identityNumber = formData.get('identityNumber') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const pictureFile = formData.get('picture') as File | null
    
    let pictureKey = existingEmployee[0].picture
    let pictureThumbnailKey = existingEmployee[0].pictureThumbnail
    
    if (pictureFile && pictureFile.size > 0) {
      // Delete old pictures if exist
      const oldKey = extractS3Key(pictureKey)
      const oldThumbKey = extractS3Key(pictureThumbnailKey)
      
      if (oldKey) {
        await deleteFile(oldKey).catch(console.error)
      }
      if (oldThumbKey) {
        await deleteFile(oldThumbKey).catch(console.error)
      }
      
      const { originalKey, thumbnailKey } = await uploadImageWithThumbnail(pictureFile, 'employees/pictures')
      pictureKey = originalKey
      pictureThumbnailKey = thumbnailKey
    }
    
    const updatedEmployee = await db
      .update(employees)
      .set({
        siteId,
        nik,
        fullName,
        unitId: unitId || null,
        identityNumber: identityNumber || null,
        phoneNumber: phoneNumber || null,
        picture: pictureKey,
        pictureThumbnail: pictureThumbnailKey,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning()
    
    return {
      success: true,
      data: updatedEmployee[0],
      message: 'Employee updated successfully',
    }
  } catch (error: any) {
    console.error('Update employee error:', error)
    return {
      success: false,
      message: error.message || 'Failed to update employee',
    }
  }
})
