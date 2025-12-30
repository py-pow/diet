import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth, requireRole } from '@/lib/utils/api'

export async function GET(request: NextRequest) {
  // Get authenticated user
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  try {
    // Super admins can see all organizations
    if (user.role === 'SUPER_ADMIN') {
      const organizations = await prisma.organization.findMany({
        include: {
          settings: true,
          branding: true,
          _count: {
            select: {
              users: true,
              patients: true,
              dietPlans: true,
              appointments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return successResponse({ organizations })
    }

    // Regular users only see their own organization
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        settings: true,
        branding: true,
        _count: {
          select: {
            users: true,
            patients: true,
            dietPlans: true,
            appointments: true,
          },
        },
      },
    })

    if (!organization) {
      return errorResponse('Organizasyon bulunamadı', 404)
    }

    return successResponse({ organization })
  } catch (error: any) {
    console.error('Get organizations error:', error)
    return errorResponse('Organizasyon bilgileri alınırken bir hata oluştu', 500)
  }
}
