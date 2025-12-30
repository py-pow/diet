import { NextRequest } from 'next/server'
import { prisma, hasFeature } from '@/lib/prisma'
import { updateOrganizationBrandingSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  requireAuth,
  requireOrganizationAccess,
  validateRequest,
  requireFeature,
} from '@/lib/utils/api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  const hasAccess = await requireOrganizationAccess(user.id, params.id)
  if (!hasAccess) {
    return errorResponse('Bu organizasyona erişim yetkiniz yok', 403)
  }

  try {
    let branding = await prisma.organizationBranding.findUnique({
      where: { organizationId: params.id },
    })

    // Create default branding if not exists
    if (!branding) {
      branding = await prisma.organizationBranding.create({
        data: {
          organizationId: params.id,
        },
      })
    }

    return successResponse({ branding })
  } catch (error: any) {
    console.error('Get branding error:', error)
    return errorResponse('Marka ayarları alınırken bir hata oluştu', 500)
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

  // Only organization owner can update branding
  if (user.role !== 'ORGANIZATION_OWNER' && user.role !== 'SUPER_ADMIN') {
    return errorResponse('Sadece organizasyon sahibi marka ayarlarını değiştirebilir', 403)
  }

  const hasAccess = await requireOrganizationAccess(user.id, params.id)
  if (!hasAccess) {
    return errorResponse('Bu organizasyona erişim yetkiniz yok', 403)
  }

  // Check if organization has white_label feature
  const featureError = await requireFeature(params.id, 'white_label')
  if (featureError) {
    return featureError
  }

  // Validate request
  const { data, error: validationError } = await validateRequest(
    request,
    updateOrganizationBrandingSchema
  )
  if (validationError) {
    return validationError
  }

  try {
    // Upsert branding
    const branding = await prisma.organizationBranding.upsert({
      where: { organizationId: params.id },
      update: data,
      create: {
        organizationId: params.id,
        ...data,
      },
    })

    // Log audit event
    await prisma.adminAuditLog.create({
      data: {
        userId: user.id,
        action: 'organization.branding_update',
        resource: 'OrganizationBranding',
        resourceId: branding.id,
        changes: {
          before: {},
          after: data,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    return successResponse({
      message: 'Marka ayarları başarıyla güncellendi',
      branding,
    })
  } catch (error: any) {
    console.error('Update branding error:', error)
    return errorResponse('Marka ayarları güncellenirken bir hata oluştu', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  if (user.role !== 'ORGANIZATION_OWNER' && user.role !== 'SUPER_ADMIN') {
    return errorResponse('Sadece organizasyon sahibi marka ayarlarını sıfırlayabilir', 403)
  }

  const hasAccess = await requireOrganizationAccess(user.id, params.id)
  if (!hasAccess) {
    return errorResponse('Bu organizasyona erişim yetkiniz yok', 403)
  }

  try {
    // Reset to defaults
    const branding = await prisma.organizationBranding.update({
      where: { organizationId: params.id },
      data: {
        logoUrl: null,
        faviconUrl: null,
        primaryColor: '#10b981',
        secondaryColor: '#3b82f6',
        accentColor: '#8b5cf6',
        companyName: null,
        tagline: null,
        description: null,
        email: null,
        phone: null,
        address: null,
        website: null,
        facebook: null,
        instagram: null,
        twitter: null,
        linkedin: null,
        customCss: null,
      },
    })

    return successResponse({
      message: 'Marka ayarları varsayılana sıfırlandı',
      branding,
    })
  } catch (error: any) {
    console.error('Reset branding error:', error)
    return errorResponse('Marka ayarları sıfırlanırken bir hata oluştu', 500)
  }
}
