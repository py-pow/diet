import { sign, verify } from 'jsonwebtoken'
import { nanoid } from 'nanoid'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'

export interface TokenPayload {
  userId: string
  email: string
  role: string
  organizationId: string
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(): string {
  return nanoid(64)
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET) as TokenPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(expiresIn: string): Date {
  const match = expiresIn.match(/^(\d+)([dhms])$/)

  if (!match) {
    throw new Error('Invalid expiration format')
  }

  const value = parseInt(match[1])
  const unit = match[2]

  const now = new Date()

  switch (unit) {
    case 'd':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000)
    case 'h':
      return new Date(now.getTime() + value * 60 * 60 * 1000)
    case 'm':
      return new Date(now.getTime() + value * 60 * 1000)
    case 's':
      return new Date(now.getTime() + value * 1000)
    default:
      throw new Error('Invalid time unit')
  }
}

/**
 * Get refresh token expiration date
 */
export function getRefreshTokenExpiration(): Date {
  return getTokenExpiration(REFRESH_TOKEN_EXPIRES_IN)
}
