import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT,
  forcePathStyle: process.env.AWS_USE_PATH_STYLE_ENDPOINT === 'true',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export async function uploadFile(file: File, folder: string = 'sites'): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  // Sanitize filename: remove spaces, special characters, and convert to lowercase
  const sanitizedName = file.name
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-\.]/g, '')      // Remove special characters except hyphens and dots
    .toLowerCase()                   // Convert to lowercase
  
  const key = `${folder}/${Date.now()}-${sanitizedName}`
  
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  })

  await s3Client.send(command)
  
  // Return only the key, not the full URL
  // URLs should be generated on-the-fly when serving data
  return key
}

export async function getPresignedUrl(key: string, expiresIn: number = 604800): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
  })
  
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
  return signedUrl
}

export async function deleteFile(fileKey: string): Promise<void> {
  if (!fileKey) return
  
  // Now we expect the key directly (e.g., 'sites/logos/filename.png')
  // instead of extracting from a full URL
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fileKey,
  })

  await s3Client.send(command)
}

/**
 * Generate a presigned URL from a stored S3 key.
 * Use this when returning data to the client.
 * Returns null if key is empty/null.
 */
export async function generateFileUrl(key: string | null | undefined, expiresIn: number = 604800): Promise<string | null> {
  if (!key) return null
  return await getPresignedUrl(key, expiresIn)
}

/**
 * Upload an image file with automatic thumbnail generation.
 * Returns both the original and thumbnail keys.
 * Thumbnail is resized to max 300px width/height while maintaining aspect ratio.
 */
export async function uploadImageWithThumbnail(
  file: File, 
  folder: string = 'uploads'
): Promise<{ originalKey: string; thumbnailKey: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  // Sanitize filename
  const sanitizedName = file.name
    .replace(/\s+/g, '-')
    .replace(/[^\w\-\.]/g, '')
    .toLowerCase()
  
  const timestamp = Date.now()
  const originalKey = `${folder}/${timestamp}-${sanitizedName}`
  const thumbnailKey = `${folder}/${timestamp}-thumb-${sanitizedName}`
  
  // Upload original
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: originalKey,
    Body: buffer,
    ContentType: file.type,
  }))
  
  // Generate and upload thumbnail (max 300px, maintain aspect ratio)
  const thumbnailBuffer = await sharp(buffer)
    .resize(300, 300, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 80 })
    .toBuffer()
  
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: thumbnailKey,
    Body: thumbnailBuffer,
    ContentType: 'image/jpeg',
  }))
  
  return { originalKey, thumbnailKey }
}

export { s3Client }
