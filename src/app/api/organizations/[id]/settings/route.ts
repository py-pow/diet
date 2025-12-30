import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateOrganizationSettingsSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  requireAuth,
  requireOrganizationAccess,
  validateRequest,
} from '@/lib/utils/api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  // Check organization access
  const hasAccess = await requireOrganizationAccess(user.id, params.id)
  if (!hasAccess) {
    return errorResponse('Bu organizasyona erişim yetkiniz yok', 403)
  }

  try {
    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: params.id },
    })

    if (!settings) {
      return errorResponse('Ayarlar bulunamadı', 404)
    }

    return successResponse({ settings })
  } catch (error: any) {
    console.error('Get settings error:', error)
    return errorResponse('Ayarlar alınırken bir hata oluştu', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  // Only organization owner can update settings
  if (user.role !== 'ORGANIZATION_OWNER' && user.role !== 'SUPER_ADMIN') {
    return errorResponse('Sadece organizasyon sahibi ayarları değiştirebilir', 403)
  }

  // Check organization access
  const hasAccess = await requireOrganizationAccess(user.id, params.id)
  if (!hasAccess) {
    return errorResponse('Bu organizasyona erişim yetkiniz yok', 403)
  }

  // Validate request
  const { data, error: validationError } = await validateRequest(
    request,
    updateOrganizationSettingsSchema
  )
  if (validationError) {
    return validationError
  }

  try {
    const settings = await prisma.organizationSettings.update({
      where: { organizationId: params.id },
      data,
    })

    // Log audit event
    await prisma.adminAuditLog.create({
      data: {
        userId: user.id,
        action: 'organization.settings_update',
        resource: 'OrganizationSettings',
        resourceId: settings.id,
        changes: {
          before: {},
          after: data,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    return successResponse({
      message: 'Ayarlar başarıyla güncellendi',
      settings,
    })
  } catch (error: any) {
    console.error('Update settings error:', error)
    return errorResponse('Ayarlar güncellenirken bir hata oluştu', 500)
  }
}
