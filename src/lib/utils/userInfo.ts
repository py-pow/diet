import { headers } from 'next/headers'
import UAParser from 'ua-parser-js'

/**
 * Get client IP address from request headers
 * Works with proxies (Vercel, Cloudflare, etc.)
 */
export function getClientIp(): string {
  const headersList = headers()

  // Check various proxy headers
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const cfConnectingIp = headersList.get('cf-connecting-ip') // Cloudflare

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwardedFor.split(',')[0].trim()
  }

  if (realIp) {
    return realIp.trim()
  }

  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }

  return '0.0.0.0'
}

/**
 * Parse user agent to get browser, OS, device info
 */
export function parseUserAgent(userAgent?: string) {
  const headersList = headers()
  const ua = userAgent || headersList.get('user-agent') || ''

  const parser = new UAParser(ua)
  const result = parser.getResult()

  return {
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || '',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || '',
    device: result.device.type || 'desktop',
    deviceVendor: result.device.vendor || '',
    deviceModel: result.device.model || '',
    raw: ua,
  }
}

/**
 * Get complete user registration/login info
 */
export function getUserRegistrationInfo() {
  const ip = getClientIp()
  const userAgent = parseUserAgent()

  return {
    ip,
    browser: `${userAgent.browser} ${userAgent.browserVersion}`.trim(),
    device: userAgent.device,
    os: `${userAgent.os} ${userAgent.osVersion}`.trim(),
    userAgent: userAgent.raw,
  }
}

/**
 * Validate Turkish TC Kimlik No (Turkish ID Number)
 * Algorithm: https://www.turkiye.gov.tr/tc-kimlik-no-dogrulama
 */
export function validateTcKimlikNo(tcKimlikNo: string): boolean {
  // Remove spaces and dashes
  const tc = tcKimlikNo.replace(/[\s-]/g, '')

  // Must be 11 digits
  if (!/^\d{11}$/.test(tc)) {
    return false
  }

  // First digit cannot be 0
  if (tc[0] === '0') {
    return false
  }

  const digits = tc.split('').map(Number)

  // Sum of first 10 digits
  const sum10 = digits.slice(0, 10).reduce((a, b) => a + b, 0)

  // 11th digit must be last digit of sum of first 10 digits
  if (sum10 % 10 !== digits[10]) {
    return false
  }

  // Sum of 1st, 3rd, 5th, 7th, 9th digits multiplied by 7
  const oddSum = (digits[0] + digits[2] + digits[4] + digits[6] + digits[8]) * 7

  // Sum of 2nd, 4th, 6th, 8th digits
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7]

  // 10th digit must be last digit of (oddSum - evenSum)
  const digit10 = (oddSum - evenSum) % 10
  if (digit10 < 0 || digit10 !== digits[9]) {
    return false
  }

  return true
}

/**
 * Validate Turkish phone number
 * Formats: +905xxxxxxxxx, 905xxxxxxxxx, 05xxxxxxxxx, 5xxxxxxxxx
 */
export function validateTurkishPhone(phone: string): boolean {
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '')

  // Check various formats
  const patterns = [
    /^\+90[1-9]\d{9}$/, // +905xxxxxxxxx
    /^90[1-9]\d{9}$/,   // 905xxxxxxxxx
    /^0[1-9]\d{9}$/,    // 05xxxxxxxxx
    /^[1-9]\d{9}$/,     // 5xxxxxxxxx
  ]

  return patterns.some(pattern => pattern.test(cleaned))
}

/**
 * Format Turkish phone to standard format: +905xxxxxxxxx
 */
export function formatTurkishPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '')

  // Already in correct format
  if (/^\+90[1-9]\d{9}$/.test(cleaned)) {
    return cleaned
  }

  // Remove leading 90 or 0
  let number = cleaned
  if (number.startsWith('90')) {
    number = number.substring(2)
  } else if (number.startsWith('0')) {
    number = number.substring(1)
  }

  return `+90${number}`
}

/**
 * Normalize Turkish phone (remove formatting)
 */
export function normalizeTurkishPhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

/**
 * Validate Turkish postal code
 */
export function validateTurkishPostalCode(postalCode: string): boolean {
  // Turkish postal codes are 5 digits
  return /^\d{5}$/.test(postalCode)
}

/**
 * Get location info from IP address (optional - requires external API)
 * You can use services like ipapi.co, ip-api.com, etc.
 */
export async function getIpInfo(ip: string) {
  try {
    // Using ip-api.com (free, no API key required)
    // For production, consider using a paid service
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,timezone`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching IP info:', error)
    return null
  }
}

/**
 * Mask sensitive data for logging
 */
export function maskTcKimlikNo(tcKimlikNo: string): string {
  if (tcKimlikNo.length !== 11) {
    return tcKimlikNo
  }
  return `${tcKimlikNo.substring(0, 3)}****${tcKimlikNo.substring(9)}`
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  if (cleaned.length < 6) {
    return phone
  }
  return `${cleaned.substring(0, 3)}****${cleaned.substring(cleaned.length - 3)}`
}

export function maskEmail(email: string): string {
  const [username, domain] = email.split('@')
  if (!domain) {
    return email
  }
  const maskedUsername = username.length > 2
    ? `${username.substring(0, 2)}****${username.substring(username.length - 1)}`
    : username
  return `${maskedUsername}@${domain}`
}
