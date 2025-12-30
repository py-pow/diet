import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, requireAuth } from '@/lib/utils/api'

export async function POST(request: NextRequest) {
  // Get authenticated user
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (refreshToken) {
      // Invalidate session
      await prisma.userSession.updateMany({
        where: {
          userId: user.id,
          refreshToken,
        },
        data: {
          isValid: false,
        },
      })
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        data: { message: 'Başarıyla çıkış yapıldı' },
      },
      { status: 200 }
    )

    // Clear cookies
    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response
  } catch (error: any) {
    console.error('Logout error:', error)

    // Still clear cookies even if there's an error
    const response = NextResponse.json(
      {
        success: true,
        data: { message: 'Başarıyla çıkış yapıldı' },
      },
      { status: 200 }
    )

    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response
  }
}
