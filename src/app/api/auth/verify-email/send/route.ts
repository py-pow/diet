import { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth, applyRateLimit } from '@/lib/utils/api'
import { sendEmailVerification } from '@/lib/utils/email'

export async function POST(request: NextRequest) {
  // Get authenticated user
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  // Rate limiting: 3 requests per hour per user
  const rateLimitError = applyRateLimit(`verify-email:${user.id}`, 3, 60 * 60 * 1000)
  if (rateLimitError) {
    return rateLimitError
  }

  try {
    // Get user details
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        emailVerified: true,
      },
    })

    if (!userDetails) {
      return errorResponse('Kullanıcı bulunamadı', 404)
    }

    if (userDetails.emailVerified) {
      return errorResponse('Email adresi zaten doğrulanmış', 400)
    }

    // Generate new verification token
    const verificationToken = nanoid(32)
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update user
    await prisma.user.update({
      where: { id: userDetails.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    })

    // Send email (async)
    sendEmailVerification(
      userDetails.email,
      userDetails.firstName,
      verificationToken
    ).catch(console.error)

    return successResponse({
      message: 'Doğrulama emaili gönderildi',
    })
  } catch (error: any) {
    console.error('Send verification email error:', error)
    return errorResponse('Email gönderme sırasında bir hata oluştu', 500)
  }
}
