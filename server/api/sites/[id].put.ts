import { db } from '../../database'
import { sites } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { uploadImageWithThumbnail, deleteFile } from '../../utils/s3'
import { logActivity } from '../../utils/activityLogger'

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
    const qualityOfficeHeadId = formData.get('qualityOfficeHeadId') as string
    const logoFile = formData.get('siteLogo') as File | null
    const oldLogoValue = formData.get('oldSiteLogo') as string | null
    const oldLogoThumbnailValue = formData.get('oldSiteLogoThumbnail') as string | null

    // Start with existing keys
    let siteLogoKey: string | null = extractS3Key(oldLogoValue)
    let siteLogoThumbnailKey: string | null = extractS3Key(oldLogoThumbnailValue)

    // If new logo file is uploaded
    if (logoFile && logoFile.size > 0) {
      // Delete old images if exist
      if (siteLogoKey) {
        await deleteFile(siteLogoKey).catch(console.error)
      }
      if (siteLogoThumbnailKey) {
        await deleteFile(siteLogoThumbnailKey).catch(console.error)
      }

      // Upload new logo and thumbnail
      const { originalKey, thumbnailKey } = await uploadImageWithThumbnail(logoFile, 'sites/logos')
      siteLogoKey = originalKey
      siteLogoThumbnailKey = thumbnailKey
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
        qualityOfficeHeadId: qualityOfficeHeadId || null,
        siteLogo: siteLogoKey,
        siteLogoThumbnail: siteLogoThumbnailKey,
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

    await logActivity({
      event,
      action: 'UPDATE',
      module: 'sites',
      description: `Mengupdate site: ${updatedSite[0].name} (${updatedSite[0].siteCode})`,
      details: { siteId: id, siteCode: updatedSite[0].siteCode, name: updatedSite[0].name }
    })

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
