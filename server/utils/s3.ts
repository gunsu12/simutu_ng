import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
  
  const fileName = `${folder}/${Date.now()}-${sanitizedName}`
  
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
    Body: buffer,
    ContentType: file.type,
  })

  await s3Client.send(command)
  
  // Generate presigned URL for the uploaded file (valid for 7 days)
  const signedUrl = await getPresignedUrl(fileName)
  
  return signedUrl
}

export async function getPresignedUrl(key: string, expiresIn: number = 604800): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
  })
  
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
  return signedUrl
}

export async function deleteFile(fileUrl: string): Promise<void> {
  if (!fileUrl) return
  
  // Extract the key from the signed URL (get the path before the query string)
  const urlParts = fileUrl.split('?')[0]
  const key = urlParts.split('/').slice(-3).join('/')  // Get 'sites/logos/filename.png'
  
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: key,
  })

  await s3Client.send(command)
}

export { s3Client }
