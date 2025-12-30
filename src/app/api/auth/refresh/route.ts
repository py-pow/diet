import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/utils/api'
import { generateAccessToken, getTokenExpiration } from '@/lib/utils/jwt'

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const cookieToken = request.cookies.get('refreshToken')?.value
    let bodyToken: string | undefined

    try {
      const body = await request.json()
      bodyToken = body.refreshToken
    } catch {
      // Ignore JSON parse errors
    }

    const refreshToken = cookieToken || bodyToken

    if (!refreshToken) {
      return errorResponse('Refresh token gerekli', 401)
    }

    // Find session
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            organizationId: true,
            isActive: true,
          },
        },
      },
    })

    if (!session) {
      return errorResponse('Geçersiz refresh token', 401)
    }

    // Check if session is valid
    if (!session.isValid) {
      return errorResponse('Session geçersiz. Lütfen tekrar giriş yapın.', 401)
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Invalidate expired session
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isValid: false },
      })

      return errorResponse('Session süresi dolmuş. Lütfen tekrar giriş yapın.', 401)
    }

    // Check if user is active
    if (!session.user.isActive) {
      return errorResponse('Kullanıcı hesabı aktif değil', 401)
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      organizationId: session.user.organizationId,
    })

    // Update session
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        accessToken,
        lastActivityAt: new Date(),
      },
    })

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        data: {
          accessToken,
        },
      },
      { status: 200 }
    )

    // Update access token cookie
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: getTokenExpiration('7d'),
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Refresh token error:', error)
    return errorResponse('Token yenileme sırasında bir hata oluştu', 500)
  }
}
