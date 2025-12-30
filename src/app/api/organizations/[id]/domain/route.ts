import { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { addCustomDomainSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  requireAuth,
  requireOrganizationAccess,
  validateRequest,
  requireFeature,
} from '@/lib/utils/api'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  if (user.role !== 'ORGANIZATION_OWNER' && user.role !== 'SUPER_ADMIN') {
    return errorResponse('Sadece organizasyon sahibi domain ekleyebilir', 403)
  }

  const hasAccess = await requireOrganizationAccess(user.id, params.id)
  if (!hasAccess) {
    return errorResponse('Bu organizasyona erişim yetkiniz yok', 403)
  }

  // Check if organization has custom_domain feature
  const featureError = await requireFeature(params.id, 'custom_domain')
  if (featureError) {
    return featureError
  }

  // Validate request
  const { data, error: validationError } = await validateRequest(request, addCustomDomainSchema)
  if (validationError) {
    return validationError
  }

  try {
    // Check if domain is already taken
    const existingDomain = await prisma.organization.findFirst({
      where: {
        customDomain: data.customDomain,
        id: { not: params.id },
      },
    })

    if (existingDomain) {
      return errorResponse('Bu domain başka bir organizasyon tarafından kullanılıyor', 409)
    }

    // Generate DNS TXT record for verification
    const txtRecord = `diet-verify=${nanoid(32)}`

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: {
        customDomain: data.customDomain,
        domainVerified: false,
        dnsTxtRecord: txtRecord,
      },
    })

    // Log audit event
    await prisma.adminAuditLog.create({
      data: {
        userId: user.id,
        action: 'organization.domain_add',
        resource: 'Organization',
        resourceId: organization.id,
        changes: {
          before: {},
          after: { customDomain: data.customDomain },
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    return successResponse({
      message: 'Domain eklendi. DNS kayıtlarını yapılandırın.',
      domain: data.customDomain,
      txtRecord,
      instructions: [
        `DNS ayarlarınıza aşağıdaki TXT kaydını ekleyin:`,
        `Host: @ veya ${data.customDomain}`,
        `Type: TXT`,
        `Value: ${txtRecord}`,
        ``,
        `Ayrıca domain'in A kaydını veya CNAME kaydını sunucumuza yönlendirin.`,
      ],
    })
  } catch (error: any) {
    console.error('Add domain error:', error)
    return errorResponse('Domain eklenirken bir hata oluştu', 500)
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
    return errorResponse('Sadece organizasyon sahibi domain kaldırabilir', 403)
  }

  const hasAccess = await requireOrganizationAccess(user.id, params.id)
  if (!hasAccess) {
    return errorResponse('Bu organizasyona erişim yetkiniz yok', 403)
  }

  try {
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: {
        customDomain: null,
        domainVerified: false,
        dnsTxtRecord: null,
      },
    })

    // Log audit event
    await prisma.adminAuditLog.create({
      data: {
        userId: user.id,
        action: 'organization.domain_remove',
        resource: 'Organization',
        resourceId: organization.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    return successResponse({
      message: 'Domain kaldırıldı',
    })
  } catch (error: any) {
    console.error('Remove domain error:', error)
    return errorResponse('Domain kaldırılırken bir hata oluştu', 500)
  }
}
