import { NextRequest } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { resetPasswordSchema } from '@/lib/validations'
import { successResponse, errorResponse, validateRequest } from '@/lib/utils/api'

export async function POST(request: NextRequest) {
  // Validate request
  const { data, error } = await validateRequest(request, resetPasswordSchema)
  if (error) {
    return error
  }

  try {
    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: data.token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    })

    if (!user) {
      return errorResponse('Geçersiz veya süresi dolmuş token', 400)
    }

    // Hash new password
    const hashedPassword = await hash(data.password, 12)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    })

    // Invalidate all sessions (force re-login)
    await prisma.userSession.updateMany({
      where: { userId: user.id },
      data: { isValid: false },
    })

    // Log security event
    await prisma.securityLog.create({
      data: {
        event: 'password.reset_completed',
        severity: 'medium',
        userId: user.id,
        email: user.email,
        details: {
          sessionsInvalidated: true,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    return successResponse({
      message: 'Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.',
    })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return errorResponse('Şifre sıfırlama sırasında bir hata oluştu', 500)
  }
}
