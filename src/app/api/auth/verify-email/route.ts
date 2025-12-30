import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/utils/api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return errorResponse('Token gerekli', 400)
  }

  try {
    // Find user with valid verification token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    })

    if (!user) {
      return errorResponse('Geçersiz veya süresi dolmuş token', 400)
    }

    if (user.emailVerified) {
      return successResponse({
        message: 'Email adresi zaten doğrulanmış',
        alreadyVerified: true,
      })
    }

    // Verify email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    })

    return successResponse({
      message: 'Email adresiniz başarıyla doğrulandı',
      verified: true,
    })
  } catch (error: any) {
    console.error('Email verification error:', error)
    return errorResponse('Email doğrulama sırasında bir hata oluştu', 500)
  }
}
