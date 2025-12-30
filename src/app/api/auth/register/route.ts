import { NextRequest } from 'next/server'
import { hash } from 'bcryptjs'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { successResponse, errorResponse, validateRequest, applyRateLimit } from '@/lib/utils/api'
import { getUserRegistrationInfo, formatTurkishPhone } from '@/lib/utils/userInfo'
import { sendWelcomeEmail, sendEmailVerification } from '@/lib/utils/email'

export async function POST(request: NextRequest) {
  // Rate limiting: 3 registrations per hour per IP
  const ip = request.headers.get('x-forwarded-for') || 'anonymous'
  const rateLimitError = applyRateLimit(`register:${ip}`, 3, 60 * 60 * 1000)
  if (rateLimitError) {
    return rateLimitError
  }

  // Validate request
  const { data, error } = await validateRequest(request, registerSchema)
  if (error) {
    return error
  }

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return errorResponse('Bu email adresi zaten kullanılıyor', 409)
    }

    // Check if subdomain already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { subdomain: data.subdomain },
    })

    if (existingOrg) {
      return errorResponse('Bu alt domain zaten kullanılıyor', 409)
    }

    // Check if TC Kimlik No already exists
    const existingTcKimlik = await prisma.user.findUnique({
      where: { tcKimlikNo: data.tcKimlikNo },
    })

    if (existingTcKimlik) {
      return errorResponse('Bu TC Kimlik No zaten kayıtlı', 409)
    }

    // Get user registration info (IP, browser, device, OS)
    const userInfo = getUserRegistrationInfo()

    // Hash password
    const hashedPassword = await hash(data.password, 12)

    // Format phone
    const formattedPhone = formatTurkishPhone(data.phone)

    // Create organization and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          subdomain: data.subdomain,
          ownerEmail: data.email,
          ownerName: `${data.firstName} ${data.lastName}`,
          ownerPhone: formattedPhone,
          status: 'TRIAL',
          plan: 'FREE',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          currentUsers: 1, // Owner
        },
      })

      // Create organization settings
      await tx.organizationSettings.create({
        data: {
          organizationId: organization.id,
        },
      })

      // Create user (organization owner)
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: formattedPhone,
          tcKimlikNo: data.tcKimlikNo,
          birthDate: new Date(data.birthDate),
          gender: data.gender,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          district: data.district,
          postalCode: data.postalCode,
          role: 'ORGANIZATION_OWNER',
          organizationId: organization.id,
          registrationIp: userInfo.ip,
          registrationBrowser: userInfo.browser,
          registrationDevice: userInfo.device,
          registrationOs: userInfo.os,
          emailVerificationToken: nanoid(32),
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      })

      // Create KVKK consent record
      await tx.consentRecord.create({
        data: {
          organizationId: organization.id,
          patientId: user.id, // Owner is also recorded as patient for KVKK
          type: 'KVKK_EXPLICIT',
          status: 'GRANTED',
          consentText: 'KVKK Aydınlatma Metni - Kişisel verileriniz... [Full text here]',
          consentVersion: '1.0',
          ipAddress: userInfo.ip,
          userAgent: userInfo.userAgent,
        },
      })

      return { organization, user }
    })

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(
      data.email,
      data.firstName,
      data.subdomain
    ).catch(console.error)

    // Send email verification (async, don't wait)
    sendEmailVerification(
      data.email,
      data.firstName,
      result.user.emailVerificationToken!
    ).catch(console.error)

    return successResponse(
      {
        message: 'Kayıt başarılı! Email adresinizi doğrulamanız gerekiyor.',
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          subdomain: result.organization.subdomain,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
        },
      },
      201
    )
  } catch (error: any) {
    console.error('Registration error:', error)

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0]
      if (field === 'email') {
        return errorResponse('Bu email adresi zaten kullanılıyor', 409)
      }
      if (field === 'subdomain') {
        return errorResponse('Bu alt domain zaten kullanılıyor', 409)
      }
      if (field === 'tcKimlikNo') {
        return errorResponse('Bu TC Kimlik No zaten kayıtlı', 409)
      }
    }

    return errorResponse('Kayıt sırasında bir hata oluştu', 500)
  }
}
