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
    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
      },
    })

    if (!user) {
      return errorResponse('Geçersiz veya süresi dolmuş token', 400)
    }

    return successResponse({
      valid: true,
      email: user.email,
    })
  } catch (error: any) {
    console.error('Verify reset token error:', error)
    return errorResponse('Token doğrulama sırasında bir hata oluştu', 500)
  }
}
