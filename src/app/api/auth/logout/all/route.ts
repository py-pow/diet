import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils/api'

export async function DELETE(request: NextRequest) {
  // Get authenticated user
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  try {
    // Invalidate all sessions for this user
    await prisma.userSession.updateMany({
      where: {
        userId: user.id,
        isValid: true,
      },
      data: {
        isValid: false,
      },
    })

    // Log security event
    await prisma.securityLog.create({
      data: {
        event: 'logout.all_devices',
        severity: 'medium',
        userId: user.id,
        email: user.email,
        details: {
          reason: 'User initiated logout from all devices',
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        data: { message: 'Tüm cihazlardan başarıyla çıkış yapıldı' },
      },
      { status: 200 }
    )

    // Clear cookies
    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response
  } catch (error: any) {
    console.error('Logout all error:', error)

    const response = NextResponse.json(
      {
        success: true,
        data: { message: 'Tüm cihazlardan başarıyla çıkış yapıldı' },
      },
      { status: 200 }
    )

    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')

    return response
  }
}
