import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { prisma, isTrialExpired } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'
import { successResponse, errorResponse, validateRequest, applyRateLimit } from '@/lib/utils/api'
import { getUserRegistrationInfo } from '@/lib/utils/userInfo'
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiration,
  getTokenExpiration,
} from '@/lib/utils/jwt'

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION = 15 * 60 * 1000 // 15 minutes

export async function POST(request: NextRequest) {
  // Rate limiting: 10 login attempts per minute per IP
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rateLimitError = applyRateLimit(`login:${ip}`, 10, 60 * 1000)
  if (rateLimitError) {
    return rateLimitError
  }

  // Validate request
  const { data, error } = await validateRequest(request, loginSchema)
  if (error) {
    return error
  }

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            status: true,
            trialEndsAt: true,
          },
        },
      },
    })

    if (!user) {
      return errorResponse('Geçersiz email veya şifre', 401)
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      )
      return errorResponse(
        `Hesabınız çok fazla başarısız giriş denemesi nedeniyle kilitlendi. ${minutesLeft} dakika sonra tekrar deneyin.`,
        403
      )
    }

    // Verify password
    const isPasswordValid = await compare(data.password, user.password)

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1
      const updates: any = {
        failedLoginAttempts: failedAttempts,
      }

      // Lock account if max attempts reached
      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCK_DURATION)
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      })

      // Log security event
      await prisma.securityLog.create({
        data: {
          event: 'login.failed',
          severity: failedAttempts >= MAX_LOGIN_ATTEMPTS ? 'high' : 'medium',
          userId: user.id,
          email: user.email,
          details: {
            attempt: failedAttempts,
            locked: failedAttempts >= MAX_LOGIN_ATTEMPTS,
          },
          ipAddress: ip,
          userAgent: request.headers.get('user-agent') || '',
          blocked: failedAttempts >= MAX_LOGIN_ATTEMPTS,
        },
      })

      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        return errorResponse(
          'Çok fazla başarısız giriş denemesi. Hesabınız 15 dakika süreyle kilitlendi.',
          403
        )
      }

      return errorResponse(
        `Geçersiz email veya şifre. ${MAX_LOGIN_ATTEMPTS - failedAttempts} deneme hakkınız kaldı.`,
        401
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse('Hesabınız askıya alınmış. Lütfen yöneticinizle iletişime geçin.', 403)
    }

    // Check organization status
    if (user.organization.status === 'SUSPENDED') {
      return errorResponse('Organizasyonunuz askıya alınmış. Lütfen faturaları kontrol edin.', 403)
    }

    if (user.organization.status === 'CANCELLED') {
      return errorResponse('Organizasyonunuz iptal edilmiş.', 403)
    }

    // Check if trial expired
    if (await isTrialExpired(user.organizationId)) {
      return errorResponse('Deneme süreniz dolmuş. Lütfen bir abonelik planı seçin.', 403)
    }

    // Get user info
    const userInfo = getUserRegistrationInfo()

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    })

    const refreshToken = generateRefreshToken()
    const refreshTokenExpires = getRefreshTokenExpiration()

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        accessToken,
        ipAddress: userInfo.ip,
        userAgent: userInfo.userAgent,
        browser: userInfo.browser,
        device: userInfo.device,
        os: userInfo.os,
        expiresAt: refreshTokenExpires,
      },
    })

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: userInfo.ip,
        lastLoginBrowser: userInfo.browser,
        lastLoginDevice: userInfo.device,
        lastLoginOs: userInfo.os,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    // Log security event
    await prisma.securityLog.create({
      data: {
        event: 'login.success',
        severity: 'low',
        userId: user.id,
        email: user.email,
        details: {
          browser: userInfo.browser,
          device: userInfo.device,
          os: userInfo.os,
        },
        ipAddress: userInfo.ip,
        userAgent: userInfo.userAgent,
      },
    })

    // Create response with cookies
    const response = NextResponse.json(
      {
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            avatar: user.avatar,
            emailVerified: user.emailVerified,
          },
          organization: {
            id: user.organization.id,
            name: user.organization.name,
            subdomain: user.organization.subdomain,
            status: user.organization.status,
          },
        },
      },
      { status: 200 }
    )

    // Set HTTP-only cookies
    const cookieExpires = data.rememberMe
      ? getTokenExpiration('30d')
      : getTokenExpiration('7d')

    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: cookieExpires,
      path: '/',
    })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: cookieExpires,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return errorResponse('Giriş sırasında bir hata oluştu', 500)
  }
}
