import { PrismaClient, SubscriptionPlan } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get organization by subdomain or custom domain
 */
export async function getOrganizationByHost(host: string) {
  // Remove port if exists
  const hostname = host.split(':')[0]

  // Check if it's a subdomain
  const subdomain = hostname.split('.')[0]

  // Try to find by custom domain first
  let organization = await prisma.organization.findFirst({
    where: {
      customDomain: hostname,
      domainVerified: true,
    },
    include: {
      settings: true,
      branding: true,
    },
  })

  // If not found, try subdomain
  if (!organization && subdomain !== hostname) {
    organization = await prisma.organization.findFirst({
      where: {
        subdomain,
      },
      include: {
        settings: true,
        branding: true,
      },
    })
  }

  return organization
}

/**
 * Check if organization has a specific feature based on plan
 */
export function hasFeature(plan: SubscriptionPlan, feature: string): boolean {
  const features: Record<SubscriptionPlan, string[]> = {
    FREE: ['basic_diet_plans', 'patient_management'],
    STARTER: [
      'basic_diet_plans',
      'patient_management',
      'ai_diet_plans',
      'appointments',
      'messaging',
    ],
    PROFESSIONAL: [
      'basic_diet_plans',
      'patient_management',
      'ai_diet_plans',
      'appointments',
      'messaging',
      'video_consultation',
      'white_label',
      'custom_domain',
      'advanced_reports',
    ],
    ENTERPRISE: [
      'basic_diet_plans',
      'patient_management',
      'ai_diet_plans',
      'appointments',
      'messaging',
      'video_consultation',
      'white_label',
      'custom_domain',
      'advanced_reports',
      'api_access',
      'priority_support',
      'custom_integrations',
    ],
  }

  return features[plan]?.includes(feature) || false
}

/**
 * Check usage limits and return if limit is exceeded
 */
export async function checkUsageLimit(
  organizationId: string,
  type: 'users' | 'patients' | 'storage' | 'aiQueries'
): Promise<{ exceeded: boolean; current: number; max: number }> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      maxUsers: true,
      maxPatients: true,
      maxStorage: true,
      maxAiQueries: true,
      currentUsers: true,
      currentPatients: true,
      currentStorage: true,
      currentAiQueries: true,
      aiQueriesResetAt: true,
    },
  })

  if (!organization) {
    throw new Error('Organization not found')
  }

  // Reset AI queries if a month has passed
  if (type === 'aiQueries') {
    const now = new Date()
    const resetDate = new Date(organization.aiQueriesResetAt)
    const monthDiff = (now.getFullYear() - resetDate.getFullYear()) * 12 +
                      (now.getMonth() - resetDate.getMonth())

    if (monthDiff >= 1) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          currentAiQueries: 0,
          aiQueriesResetAt: now,
        },
      })
      return { exceeded: false, current: 0, max: organization.maxAiQueries }
    }
  }

  const maxField = `max${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof organization
  const currentField = `current${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof organization

  const max = organization[maxField] as number
  const current = organization[currentField] as number

  return {
    exceeded: current >= max,
    current,
    max,
  }
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  organizationId: string,
  type: 'users' | 'patients' | 'storage' | 'aiQueries',
  amount: number = 1
) {
  const field = `current${type.charAt(0).toUpperCase() + type.slice(1)}`

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      [field]: {
        increment: amount,
      },
    },
  })
}

/**
 * Decrement usage counter
 */
export async function decrementUsage(
  organizationId: string,
  type: 'users' | 'patients' | 'storage',
  amount: number = 1
) {
  const field = `current${type.charAt(0).toUpperCase() + type.slice(1)}`

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      [field]: {
        decrement: amount,
      },
    },
  })
}

/**
 * Check if organization's trial has expired
 */
export async function isTrialExpired(organizationId: string): Promise<boolean> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { status: true, trialEndsAt: true },
  })

  if (!organization) {
    throw new Error('Organization not found')
  }

  if (organization.status !== 'TRIAL') {
    return false
  }

  if (!organization.trialEndsAt) {
    return false
  }

  return new Date() > organization.trialEndsAt
}

/**
 * Get organization usage statistics
 */
export async function getOrganizationUsage(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      maxUsers: true,
      maxPatients: true,
      maxStorage: true,
      maxAiQueries: true,
      currentUsers: true,
      currentPatients: true,
      currentStorage: true,
      currentAiQueries: true,
      aiQueriesResetAt: true,
    },
  })

  if (!organization) {
    throw new Error('Organization not found')
  }

  return {
    users: {
      current: organization.currentUsers,
      max: organization.maxUsers,
      percentage: (organization.currentUsers / organization.maxUsers) * 100,
    },
    patients: {
      current: organization.currentPatients,
      max: organization.maxPatients,
      percentage: (organization.currentPatients / organization.maxPatients) * 100,
    },
    storage: {
      current: organization.currentStorage,
      max: organization.maxStorage,
      percentage: (organization.currentStorage / organization.maxStorage) * 100,
    },
    aiQueries: {
      current: organization.currentAiQueries,
      max: organization.maxAiQueries,
      percentage: (organization.currentAiQueries / organization.maxAiQueries) * 100,
      resetAt: organization.aiQueriesResetAt,
    },
  }
}

export default prisma
