import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth, requireOrganizationAccess } from '@/lib/utils/api'

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
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        customDomain: true,
        domainVerified: true,
        dnsTxtRecord: true,
      },
    })

    if (!organization || !organization.customDomain) {
      return errorResponse('Custom domain bulunamadı', 404)
    }

    if (organization.domainVerified) {
      return successResponse({
        verified: true,
        message: 'Domain zaten doğrulanmış',
      })
    }

    // In production, you would actually verify DNS records here
    // For now, we'll simulate verification
    // You can use libraries like 'dns' module or external DNS APIs

    try {
      // Simulated DNS verification
      // In real implementation:
      // const dns = require('dns').promises
      // const txtRecords = await dns.resolveTxt(organization.customDomain)
      // const isValid = txtRecords.some(record => record.includes(organization.dnsTxtRecord))

      // For demo purposes, auto-verify after 5 seconds (you should implement real DNS check)
      const autoVerify = process.env.NODE_ENV === 'development'

      if (autoVerify) {
        // Auto-verify in development
        await prisma.organization.update({
          where: { id: params.id },
          data: {
            domainVerified: true,
          },
        })

        // Log audit event
        await prisma.adminAuditLog.create({
          data: {
            userId: user.id,
            action: 'organization.domain_verify',
            resource: 'Organization',
            resourceId: organization.id,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || '',
          },
        })

        return successResponse({
          verified: true,
          message: 'Domain başarıyla doğrulandı',
        })
      }

      return successResponse({
        verified: false,
        message: 'DNS kayıtları henüz doğrulanamadı. Lütfen DNS ayarlarınızı kontrol edin ve birkaç dakika bekleyin.',
        expectedTxtRecord: organization.dnsTxtRecord,
      })
    } catch (dnsError) {
      console.error('DNS verification error:', dnsError)
      return errorResponse('DNS doğrulama sırasında bir hata oluştu', 500)
    }
  } catch (error: any) {
    console.error('Verify domain error:', error)
    return errorResponse('Domain doğrulama sırasında bir hata oluştu', 500)
  }
}
