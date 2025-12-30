import { NextRequest } from 'next/server'
import { prisma, getOrganizationUsage } from '@/lib/prisma'
import { updateProfileSchema } from '@/lib/validations'
import { successResponse, errorResponse, requireAuth, validateRequest } from '@/lib/utils/api'
import { formatTurkishPhone } from '@/lib/utils/userInfo'

export async function GET(request: NextRequest) {
  // Get authenticated user
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  try {
    // Get full user details
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        tcKimlikNo: true,
        birthDate: true,
        gender: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        district: true,
        postalCode: true,
        country: true,
        role: true,
        emailVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        twoFactorEnabled: true,
        isActive: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            customDomain: true,
            domainVerified: true,
            status: true,
            plan: true,
            trialEndsAt: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            settings: true,
            branding: true,
          },
        },
      },
    })

    if (!userDetails) {
      return errorResponse('Kullanıcı bulunamadı', 404)
    }

    // Get usage statistics
    const usage = await getOrganizationUsage(user.organizationId)

    // Get active sessions count
    const activeSessions = await prisma.userSession.count({
      where: {
        userId: user.id,
        isValid: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    return successResponse({
      user: {
        ...userDetails,
        tcKimlikNo: userDetails.tcKimlikNo
          ? `${userDetails.tcKimlikNo.substring(0, 3)}****${userDetails.tcKimlikNo.substring(9)}`
          : null, // Mask TC Kimlik
      },
      usage,
      activeSessions,
    })
  } catch (error: any) {
    console.error('Get current user error:', error)
    return errorResponse('Kullanıcı bilgileri alınırken bir hata oluştu', 500)
  }
}

export async function PATCH(request: NextRequest) {
  // Get authenticated user
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  // Validate request
  const { data, error: validationError } = await validateRequest(request, updateProfileSchema)
  if (validationError) {
    return validationError
  }

  try {
    // Prepare update data
    const updateData: any = {}

    if (data.firstName) updateData.firstName = data.firstName
    if (data.lastName) updateData.lastName = data.lastName
    if (data.phone) updateData.phone = formatTurkishPhone(data.phone)
    if (data.avatar) updateData.avatar = data.avatar
    if (data.birthDate) updateData.birthDate = new Date(data.birthDate)
    if (data.gender) updateData.gender = data.gender
    if (data.addressLine1) updateData.addressLine1 = data.addressLine1
    if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2
    if (data.city) updateData.city = data.city
    if (data.district) updateData.district = data.district
    if (data.postalCode) updateData.postalCode = data.postalCode

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        birthDate: true,
        gender: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        district: true,
        postalCode: true,
        country: true,
      },
    })

    // Log audit event
    await prisma.adminAuditLog.create({
      data: {
        userId: user.id,
        action: 'user.profile_update',
        resource: 'User',
        resourceId: user.id,
        changes: {
          before: {}, // Could fetch old values if needed
          after: updateData,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
      },
    })

    return successResponse({
      message: 'Profil başarıyla güncellendi',
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('Update profile error:', error)
    return errorResponse('Profil güncellenirken bir hata oluştu', 500)
  }
}
