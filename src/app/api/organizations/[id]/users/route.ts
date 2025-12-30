import { NextRequest } from 'next/server'
import { hash } from 'bcryptjs'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { inviteUserSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  requireAuth,
  requireOrganizationAccess,
  validateRequest,
  checkAndIncrementUsage,
  getPaginationParams,
  paginateResults,
} from '@/lib/utils/api'
import { sendUserInvitationEmail } from '@/lib/utils/email'

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
    const { searchParams } = new URL(request.url)
    const pagination = getPaginationParams(searchParams)
    const role = searchParams.get('role')

    const where: any = {
      organizationId: params.id,
    }

    if (role) {
      where.role = role
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          emailVerified: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ])

    return successResponse(paginateResults(users, total, pagination))
  } catch (error: any) {
    console.error('Get users error:', error)
    return errorResponse('Kullanıcı listesi alınırken bir hata oluştu', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  // Only organization owner can invite users
  if (user.role !== 'ORGANIZATION_OWNER' && user.role !== 'SUPER_ADMIN') {
    return errorResponse('Sadece organizasyon sahibi kullanıcı ekleyebilir', 403)
  }

  const hasAccess = await requireOrganizationAccess(user.id, params.id)
  if (!hasAccess) {
    return errorResponse('Bu organizasyona erişim yetkiniz yok', 403)
  }

  // Check usage limit
  const usageError = await checkAndIncrementUsage(params.id, 'users')
  if (usageError) {
    return usageError
  }

  // Validate request
  const { data, error: validationError } = await validateRequest(request, inviteUserSchema)
  if (validationError) {
    return validationError
  }

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return errorResponse('Bu email adresi zaten kullanılıyor', 409)
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      select: { name: true },
    })

    if (!organization) {
      return errorResponse('Organizasyon bulunamadı', 404)
    }

    // Generate temporary password
    const temporaryPassword = nanoid(12)
    const hashedPassword = await hash(temporaryPassword, 12)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        organizationId: params.id,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    })

    // Get inviter details
    const inviter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true },
    })

    // Send invitation email (async)
    sendUserInvitationEmail(
      data.email,
      data.firstName,
      `${inviter?.firstName} ${inviter?.lastName}`,
      organization.name,
      data.role,
      temporaryPassword
    ).catch(console.error)

    // Log audit event
    await prisma.adminAuditLog.create({
      data: {
        userId: user.id,
        action: 'organization.user_invite',
        resource: 'User',
        resourceId: newUser.id,
        changes: {
          before: {},
          after: { ...data, organizationId: params.id },
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    return successResponse(
      {
        message: 'Kullanıcı davet edildi. Geçici şifre email olarak gönderildi.',
        user: newUser,
        temporaryPassword, // Only for testing, remove in production
      },
      201
    )
  } catch (error: any) {
    console.error('Invite user error:', error)
    return errorResponse('Kullanıcı davet edilirken bir hata oluştu', 500)
  }
}
