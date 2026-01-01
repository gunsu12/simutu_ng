import { db } from '../../database'
import { employees } from '../../database/schema'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readFormData(event)
    
    const nik = formData.get('nik') as string
    const fullName = formData.get('fullName') as string
    const unitId = formData.get('unitId') as string
    const identityNumber = formData.get('identityNumber') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const pictureFile = formData.get('picture') as File | null
    
    let pictureUrl = null
    if (pictureFile && pictureFile.size > 0) {
      pictureUrl = await uploadFile(pictureFile, 'employees/pictures')
    }
    
    const newEmployee = await db.insert(employees).values({
      nik,
      fullName,
      unitId: unitId || null,
      identityNumber: identityNumber || null,
      phoneNumber: phoneNumber || null,
      picture: pictureUrl,
    }).returning()
    
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
