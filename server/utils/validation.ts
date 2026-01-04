import { createError } from 'h3'

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates that a string is a valid UUID v4 format
 * @param id - The string to validate
 * @returns true if valid UUID
 */
export function isValidUUID(id: string | undefined | null): boolean {
  if (!id) return false
  return UUID_REGEX.test(id)
}

/**
 * Validates UUID and throws 400 error if invalid
 * @param id - The string to validate
 * @param fieldName - Name of the field for error message
 * @throws H3Error with 400 status if invalid
 */
export function requireValidUUID(id: string | undefined | null, fieldName: string = 'ID'): string {
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        success: false,
        message: `${fieldName} is required`
      }
    })
  }
  
  if (!isValidUUID(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        success: false,
        message: `Invalid ${fieldName} format`
      }
    })
  }
  
  return id
}

/**
 * Validates S3 key to prevent path traversal attacks
 * @param key - The S3 key to validate
 * @returns The validated key
 * @throws H3Error if key is invalid or contains path traversal
 */
export function validateS3Key(key: string | undefined | null): string {
  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        success: false,
        message: 'File key is required'
      }
    })
  }

  // Check for path traversal attempts
  if (key.includes('..') || key.includes('//') || key.startsWith('/')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        success: false,
        message: 'Invalid file key format'
      }
    })
  }

  // Whitelist allowed prefixes
  const allowedPrefixes = ['uploads/', 'sites/', 'employees/', 'indicators/', 'pdca/']
  const hasValidPrefix = allowedPrefixes.some(prefix => key.startsWith(prefix))
  
  if (!hasValidPrefix) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      data: {
        success: false,
        message: 'Access to this file is not allowed'
      }
    })
  }

  return key
}

/**
 * Removes sensitive fields from user object before sending to client
 * @param user - User object that may contain password
 * @returns User object without password
 */
export function sanitizeUserResponse<T extends { password?: string }>(user: T): Omit<T, 'password'> {
  const { password, ...userWithoutPassword } = user
  return userWithoutPassword
}
