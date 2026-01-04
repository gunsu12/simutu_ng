import { RateLimiterMemory } from 'rate-limiter-flexible'
import type { H3Event } from 'h3'

/**
 * Rate limiter for login attempts
 * Allows 5 attempts per 15 minutes per IP address
 */
export const loginRateLimiter = new RateLimiterMemory({
  points: 5, // Number of attempts
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes if exceeded
})

/**
 * Rate limiter for general API requests
 * Allows 100 requests per minute per IP address
 */
export const apiRateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 1 minute
  blockDuration: 60, // Block for 1 minute if exceeded
})

/**
 * Gets the client IP address from the request
 * Handles proxy headers like X-Forwarded-For
 */
export function getClientIp(event: H3Event): string {
  const forwardedFor = getHeader(event, 'x-forwarded-for')
  
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = forwardedFor.split(',')
    return ips[0].trim()
  }
  
  const realIp = getHeader(event, 'x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback to connection remote address
  return event.node.req.socket.remoteAddress || 'unknown'
}

/**
 * Applies rate limiting to a request
 * @param event - The H3 event
 * @param limiter - The rate limiter instance to use
 * @param key - Optional custom key (defaults to IP address)
 * @throws H3Error with 429 status if rate limit exceeded
 */
export async function applyRateLimit(
  event: H3Event,
  limiter: RateLimiterMemory,
  key?: string
): Promise<void> {
  const identifier = key || getClientIp(event)
  
  try {
    await limiter.consume(identifier)
  } catch (rateLimiterRes: any) {
    const retrySecs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1
    
    setResponseHeader(event, 'Retry-After', retrySecs)
    
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: {
        success: false,
        message: `Too many requests. Please try again in ${retrySecs} seconds.`,
        retryAfter: retrySecs
      }
    })
  }
}
