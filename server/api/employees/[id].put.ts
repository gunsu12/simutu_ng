import { db } from '../../database'
import { employees } from '../../database/schema'
import { eq } from 'drizzle-orm'

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
    
    const nik = formData.get('nik') as string
    const fullName = formData.get('fullName') as string
    const unitId = formData.get('unitId') as string
    const identityNumber = formData.get('identityNumber') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const pictureFile = formData.get('picture') as File | null
    
    let pictureUrl = existingEmployee[0].picture
    if (pictureFile && pictureFile.size > 0) {
      // Delete old picture if exists
      if (pictureUrl) {
        await deleteFile(pictureUrl)
      }
      pictureUrl = await uploadFile(pictureFile, 'employees/pictures')
    }
    
    const updatedEmployee = await db
      .update(employees)
      .set({
        nik,
        fullName,
        unitId: unitId || null,
        identityNumber: identityNumber || null,
        phoneNumber: phoneNumber || null,
        picture: pictureUrl,
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
