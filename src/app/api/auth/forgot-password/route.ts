import { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/lib/validations'
import { successResponse, validateRequest, applyRateLimit } from '@/lib/utils/api'
import { sendPasswordResetEmail } from '@/lib/utils/email'

export async function POST(request: NextRequest) {
  // Rate limiting: 3 requests per hour per IP
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rateLimitError = applyRateLimit(`forgot-password:${ip}`, 3, 60 * 60 * 1000)
  if (rateLimitError) {
    return rateLimitError
  }

  // Validate request
  const { data, error } = await validateRequest(request, forgotPasswordSchema)
  if (error) {
    return error
  }

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    })

    // Always return success even if user doesn't exist (security)
    if (!user || !user.isActive) {
      return successResponse({
        message: 'Eğer bu email adresi kayıtlıysa, şifre sıfırlama linki gönderildi.',
      })
    }

    // Generate reset token
    const resetToken = nanoid(32)
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Save reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    })

    // Send password reset email (async)
    sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken
    ).catch(console.error)

    // Log security event
    await prisma.securityLog.create({
      data: {
        event: 'password.reset_requested',
        severity: 'medium',
        userId: user.id,
        email: user.email,
        details: {
          tokenExpires: resetExpires,
        },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    return successResponse({
      message: 'Eğer bu email adresi kayıtlıysa, şifre sıfırlama linki gönderildi.',
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)

    // Don't reveal error details to user
    return successResponse({
      message: 'Eğer bu email adresi kayıtlıysa, şifre sıfırlama linki gönderildi.',
    })
  }
}
