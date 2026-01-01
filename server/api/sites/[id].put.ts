import { db } from '../../database'
import { sites } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { uploadFile, deleteFile } from '../../utils/s3'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    
    if (!id) {
      return {
        success: false,
        message: 'Site ID is required',
      }
    }
    
    const formData = await readFormData(event)
    
    const siteCode = formData.get('siteCode') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const address = formData.get('address') as string
    const email = formData.get('email') as string
    const website = formData.get('website') as string
    const phone = formData.get('phone') as string
    const fax = formData.get('fax') as string
    const logoFile = formData.get('siteLogo') as File | null
    const oldLogoUrl = formData.get('oldSiteLogo') as string | null
    
    let siteLogo: string | undefined = oldLogoUrl || undefined
    
    // If new logo file is uploaded
    if (logoFile && logoFile.size > 0) {
      // Delete old logo if exists
      if (oldLogoUrl) {
        await deleteFile(oldLogoUrl).catch(console.error)
      }
      
      // Upload new logo
      siteLogo = await uploadFile(logoFile, 'sites/logos')
    }
    
    const updatedSite = await db
      .update(sites)
      .set({
        siteCode,
        name,
        description: description || null,
        address: address || null,
        email: email || null,
        website: website || null,
        phone: phone || null,
        fax: fax || null,
        siteLogo: siteLogo || null,
        updatedAt: new Date(),
      })
      .where(eq(sites.id, id))
      .returning()
    
    if (updatedSite.length === 0) {
      return {
        success: false,
        message: 'Site not found',
      }
    }
    
    return {
      success: true,
      data: updatedSite[0],
      message: 'Site updated successfully',
    }
  } catch (error: any) {
    console.error('Update site error:', error)
    return {
      success: false,
      message: error.message || 'Failed to update site',
    }
  }
})
