import { NextRequest } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { changePasswordSchema } from '@/lib/validations'
import { successResponse, errorResponse, requireAuth, validateRequest } from '@/lib/utils/api'

export async function POST(request: NextRequest) {
  // Get authenticated user
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  // Validate request
  const { data, error: validationError } = await validateRequest(request, changePasswordSchema)
  if (validationError) {
    return validationError
  }

  try {
    // Get current user with password
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        password: true,
      },
    })

    if (!userDetails) {
      return errorResponse('Kullanıcı bulunamadı', 404)
    }

    // Verify current password
    const isPasswordValid = await compare(data.currentPassword, userDetails.password)

    if (!isPasswordValid) {
      // Log security event
      await prisma.securityLog.create({
        data: {
          event: 'password.change_failed',
          severity: 'medium',
          userId: user.id,
          email: user.email,
          details: {
            reason: 'Invalid current password',
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || '',
        },
      })

      return errorResponse('Mevcut şifre yanlış', 401)
    }

    // Check if new password is same as current
    if (data.currentPassword === data.newPassword) {
      return errorResponse('Yeni şifre mevcut şifre ile aynı olamaz', 400)
    }

    // Hash new password
    const hashedPassword = await hash(data.newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    })

    // Get current refresh token
    const currentRefreshToken = request.cookies.get('refreshToken')?.value

    // Invalidate all other sessions (keep current session)
    await prisma.userSession.updateMany({
      where: {
        userId: user.id,
        isValid: true,
        refreshToken: {
          not: currentRefreshToken || '',
        },
      },
      data: {
        isValid: false,
      },
    })

    // Log security event
    await prisma.securityLog.create({
      data: {
        event: 'password.changed',
        severity: 'medium',
        userId: user.id,
        email: user.email,
        details: {
          otherSessionsInvalidated: true,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    // Log audit event
    await prisma.adminAuditLog.create({
      data: {
        userId: user.id,
        action: 'user.password_change',
        resource: 'User',
        resourceId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    return successResponse({
      message: 'Şifreniz başarıyla değiştirildi. Diğer tüm oturumlar sonlandırıldı.',
    })
  } catch (error: any) {
    console.error('Change password error:', error)
    return errorResponse('Şifre değiştirme sırasında bir hata oluştu', 500)
  }
}
