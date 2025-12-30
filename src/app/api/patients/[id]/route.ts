import { NextRequest } from 'next/server'
import { prisma, decrementUsage } from '@/lib/prisma'
import { updatePatientSchema } from '@/lib/validations'
import {
  successResponse,
  errorResponse,
  requireAuth,
  requireRole,
  validateRequest,
} from '@/lib/utils/api'
import { formatTurkishPhone, getUserRegistrationInfo } from '@/lib/utils/userInfo'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuth(request)
  if (error) {
    return error
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
        ...(user.role === 'DIETITIAN' ? { dietitianId: user.id } : {}),
      },
      include: {
        dietitian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        dietPlans: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { startDate: 'desc' },
        },
        weightLogs: {
          take: 10,
          orderBy: { logDate: 'desc' },
        },
        _count: {
          select: {
            dietPlans: true,
            appointments: true,
            weightLogs: true,
            foodLogs: true,
            labResults: true,
          },
        },
      },
    })

    if (!patient) {
      return errorResponse('Hasta bulunamadı', 404)
    }

    // Log data access
    const userInfo = getUserRegistrationInfo()
    await prisma.dataAccessLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        resourceType: 'patient',
        resourceId: patient.id,
        reason: 'TREATMENT',
        action: 'view',
        ipAddress: userInfo.ip,
        userAgent: userInfo.userAgent,
      },
    })

    return successResponse({ patient })
  } catch (error: any) {
    console.error('Get patient error:', error)
    return errorResponse('Hasta bilgileri alınırken bir hata oluştu', 500)
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

  const roleError = requireRole(user, ['ORGANIZATION_OWNER', 'DIETITIAN', 'ASSISTANT'])
  if (roleError) {
    return roleError
  }

  // Validate request
  const { data, error: validationError } = await validateRequest(request, updatePatientSchema)
  if (validationError) {
    return validationError
  }

  try {
    // Check if patient exists and belongs to organization
    const existingPatient = await prisma.patient.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
        ...(user.role === 'DIETITIAN' ? { dietitianId: user.id } : {}),
      },
    })

    if (!existingPatient) {
      return errorResponse('Hasta bulunamadı', 404)
    }

    // Prepare update data
    const updateData: any = {}

    if (data.firstName) updateData.firstName = data.firstName
    if (data.lastName) updateData.lastName = data.lastName
    if (data.email) updateData.email = data.email
    if (data.phone) updateData.phone = formatTurkishPhone(data.phone)
    if (data.birthDate) updateData.birthDate = new Date(data.birthDate)
    if (data.gender) updateData.gender = data.gender
    if (data.addressLine1) updateData.addressLine1 = data.addressLine1
    if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2
    if (data.city) updateData.city = data.city
    if (data.district) updateData.district = data.district
    if (data.postalCode) updateData.postalCode = data.postalCode
    if (data.height) updateData.height = data.height
    if (data.initialWeight) updateData.initialWeight = data.initialWeight
    if (data.targetWeight) updateData.targetWeight = data.targetWeight
    if (data.bloodType) updateData.bloodType = data.bloodType
    if (data.activityLevel) updateData.activityLevel = data.activityLevel
    if (data.occupation) updateData.occupation = data.occupation
    if (data.smokingStatus !== undefined) updateData.smokingStatus = data.smokingStatus
    if (data.alcoholStatus !== undefined) updateData.alcoholStatus = data.alcoholStatus
    if (data.emergencyContactName) updateData.emergencyContactName = data.emergencyContactName
    if (data.emergencyContactPhone)
      updateData.emergencyContactPhone = formatTurkishPhone(data.emergencyContactPhone)
    if (data.emergencyContactRelation) updateData.emergencyContactRelation = data.emergencyContactRelation
    if (data.notes !== undefined) updateData.notes = data.notes

    if (data.medicalConditions || data.allergies || data.medications) {
      updateData.medicalHistory = {
        conditions: data.medicalConditions || existingPatient.medicalHistory?.conditions || [],
        allergies: data.allergies || existingPatient.medicalHistory?.allergies || [],
        medications: data.medications || existingPatient.medicalHistory?.medications || [],
      }
    }

    // Update patient
    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: updateData,
    })

    // Log data access
    const userInfo = getUserRegistrationInfo()
    await prisma.dataAccessLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        resourceType: 'patient',
        resourceId: patient.id,
        reason: 'TREATMENT',
        action: 'update',
        ipAddress: userInfo.ip,
        userAgent: userInfo.userAgent,
      },
    })

    return successResponse({
      message: 'Hasta bilgileri güncellendi',
      patient,
    })
  } catch (error: any) {
    console.error('Update patient error:', error)
    return errorResponse('Hasta güncellenirken bir hata oluştu', 500)
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

  // Only organization owner can delete patients
  const roleError = requireRole(user, ['ORGANIZATION_OWNER'])
  if (roleError) {
    return roleError
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      },
    })

    if (!patient) {
      return errorResponse('Hasta bulunamadı', 404)
    }

    // Soft delete (set isActive to false)
    await prisma.patient.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    // Decrement patient count
    await decrementUsage(user.organizationId, 'patients')

    // Log data access
    const userInfo = getUserRegistrationInfo()
    await prisma.dataAccessLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        resourceType: 'patient',
        resourceId: patient.id,
        reason: 'AUDIT',
        action: 'delete',
        ipAddress: userInfo.ip,
        userAgent: userInfo.userAgent,
      },
    })

    return successResponse({
      message: 'Hasta silindi',
    })
  } catch (error: any) {
    console.error('Delete patient error:', error)
    return errorResponse('Hasta silinirken bir hata oluştu', 500)
  }
}
