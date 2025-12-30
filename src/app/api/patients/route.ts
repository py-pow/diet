import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPatientSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  requireAuth,
  requireRole,
  validateRequest,
  checkAndIncrementUsage,
  getPaginationParams,
  paginateResults,
  buildSearchFilter,
} from '@/lib/utils/api'
import { getUserRegistrationInfo, formatTurkishPhone } from '@/lib/utils/userInfo'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  try {
    const { searchParams } = new URL(request.url)
    const pagination = getPaginationParams(searchParams)

    const where: any = {
      organizationId: user.organizationId,
    }

    // Dietitians only see their own patients
    if (user.role === 'DIETITIAN') {
      where.dietitianId = user.id
    }

    // Search filter
    const search = buildSearchFilter(searchParams, ['firstName', 'lastName', 'email', 'phone'])
    if (search.OR) {
      where.AND = [search]
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          dietitian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              dietPlans: true,
              appointments: true,
              weightLogs: true,
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.patient.count({ where }),
    ])

    return successResponse(paginateResults(patients, total, pagination))
  } catch (error: any) {
    console.error('Get patients error:', error)
    return errorResponse('Hasta listesi alınırken bir hata oluştu', 500)
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  // Only dietitians, assistants, and owners can create patients
  const roleError = requireRole(user, ['ORGANIZATION_OWNER', 'DIETITIAN', 'ASSISTANT'])
  if (roleError) {
    return roleError
  }

  // Check usage limit
  const usageError = await checkAndIncrementUsage(user.organizationId, 'patients')
  if (usageError) {
    return usageError
  }

  // Validate request
  const { data, error: validationError } = await validateRequest(request, createPatientSchema)
  if (validationError) {
    return validationError
  }

  try {
    // Check if TC Kimlik No already exists in this organization
    const existingTc = await prisma.patient.findFirst({
      where: {
        organizationId: user.organizationId,
        tcKimlikNo: data.tcKimlikNo,
      },
    })

    if (existingTc) {
      return errorResponse('Bu TC Kimlik No zaten kayıtlı', 409)
    }

    // Check if email already exists in this organization
    const existingEmail = await prisma.patient.findFirst({
      where: {
        organizationId: user.organizationId,
        email: data.email,
      },
    })

    if (existingEmail) {
      return errorResponse('Bu email adresi zaten kayıtlı', 409)
    }

    // Get user registration info
    const userInfo = getUserRegistrationInfo()

    // Determine dietitian (if user is dietitian, assign to self)
    const dietitianId = user.role === 'DIETITIAN' ? user.id : user.id

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        organizationId: user.organizationId,
        dietitianId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: formatTurkishPhone(data.phone),
        tcKimlikNo: data.tcKimlikNo,
        birthDate: new Date(data.birthDate),
        gender: data.gender,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        district: data.district,
        postalCode: data.postalCode,
        height: data.height,
        initialWeight: data.initialWeight,
        currentWeight: data.initialWeight, // Same as initial at creation
        targetWeight: data.targetWeight,
        bloodType: data.bloodType,
        activityLevel: data.activityLevel,
        occupation: data.occupation,
        smokingStatus: data.smokingStatus,
        alcoholStatus: data.alcoholStatus,
        medicalHistory: data.medicalConditions || data.allergies || data.medications
          ? {
              conditions: data.medicalConditions || [],
              allergies: data.allergies || [],
              medications: data.medications || [],
            }
          : undefined,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone
          ? formatTurkishPhone(data.emergencyContactPhone)
          : undefined,
        emergencyContactRelation: data.emergencyContactRelation,
        registrationIp: userInfo.ip,
        registrationBrowser: userInfo.browser,
        registrationDevice: userInfo.device,
        registrationOs: userInfo.os,
        notes: data.notes,
      },
      include: {
        dietitian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Create KVKK consent record
    await prisma.consentRecord.create({
      data: {
        organizationId: user.organizationId,
        patientId: patient.id,
        type: 'KVKK_EXPLICIT',
        status: 'GRANTED',
        consentText: 'KVKK Aydınlatma Metni - Kişisel verileriniz...',
        consentVersion: '1.0',
        ipAddress: userInfo.ip,
        userAgent: userInfo.userAgent,
      },
    })

    // Log data access
    await prisma.dataAccessLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        resourceType: 'patient',
        resourceId: patient.id,
        reason: 'TREATMENT',
        action: 'create',
        ipAddress: userInfo.ip,
        userAgent: userInfo.userAgent,
      },
    })

    return successResponse(
      {
        message: 'Hasta başarıyla eklendi',
        patient,
      },
      201
    )
  } catch (error: any) {
    console.error('Create patient error:', error)
    return errorResponse('Hasta eklenirken bir hata oluştu', 500)
  }
}
