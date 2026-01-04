import { db } from '../../database'
import { sites } from '../../database/schema'
import { uploadImageWithThumbnail } from '../../utils/s3'
import { logActivity } from '../../utils/activityLogger'

export default defineEventHandler(async (event) => {
  try {
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
    
    let siteLogo: string | null = null
    let siteLogoThumbnail: string | null = null
    
    if (logoFile && logoFile.size > 0) {
      const { originalKey, thumbnailKey } = await uploadImageWithThumbnail(logoFile, 'sites/logos')
      siteLogo = originalKey
      siteLogoThumbnail = thumbnailKey
    }
    
    const newSite = await db.insert(sites).values({
      siteCode,
      name,
      description: description || null,
      address: address || null,
      email: email || null,
      website: website || null,
      phone: phone || null,
      fax: fax || null,
      siteLogo,
      siteLogoThumbnail,
    }).returning()

    await logActivity({
      event,
      action: 'CREATE',
      module: 'sites',
      description: `Membuat site baru: ${name} (${siteCode})`,
      details: { siteId: newSite[0].id, siteCode, name }
    })
    
    return {
      success: true,
      data: newSite[0],
      message: 'Site created successfully',
    }
  } catch (error: any) {
    console.error('Create site error:', error)
    return {
      success: false,
      message: error.message || 'Failed to create site',
    }
  }
})
