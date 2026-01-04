import { db } from '../../database'
import { employees } from '../../database/schema'
import { uploadImageWithThumbnail } from '../../utils/s3'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readFormData(event)
    
    const siteId = formData.get('siteId') as string
    const nik = formData.get('nik') as string
    const fullName = formData.get('fullName') as string
    const unitId = formData.get('unitId') as string
    const identityNumber = formData.get('identityNumber') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const pictureFile = formData.get('picture') as File | null
    
    let pictureKey: string | null = null
    let pictureThumbnailKey: string | null = null
    
    if (pictureFile && pictureFile.size > 0) {
      const { originalKey, thumbnailKey } = await uploadImageWithThumbnail(pictureFile, 'employees/pictures')
      pictureKey = originalKey
      pictureThumbnailKey = thumbnailKey
    }
    
    const newEmployee = await db.insert(employees).values({
      siteId,
      nik,
      fullName,
      unitId: unitId || null,
      identityNumber: identityNumber || null,
      phoneNumber: phoneNumber || null,
      picture: pictureKey,
      pictureThumbnail: pictureThumbnailKey,
    }).returning()

    await logActivity({
      event,
      action: 'CREATE',
      module: 'employees',
      description: `Membuat karyawan baru: ${fullName} (NIK: ${nik})`,
      details: { employeeId: newEmployee[0].id, nik, fullName }
    })
    
    return {
      success: true,
      data: newEmployee[0],
      message: 'Employee created successfully',
    }
  } catch (error: any) {
    console.error('Create employee error:', error)
    return {
      success: false,
      message: error.message || 'Failed to create employee',
    }
  }
})
