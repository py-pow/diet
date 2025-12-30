import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'
import { prisma, hasFeature, checkUsageLimit, incrementUsage } from '@/lib/prisma'
import { UserRole, SubscriptionPlan } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// ============================================
// RESPONSE HELPERS
// ============================================

export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

export function errorResponse(message: string, status: number = 400, errors?: any) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errors,
    },
    { status }
  )
}

// ============================================
// AUTH MIDDLEWARE
// ============================================

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  organizationId: string
}

/**
 * Get authenticated user from request
 */
export async function requireAuth(request: NextRequest): Promise<{
  user: AuthUser
  error?: NextResponse
}> {
  try {
    // Get token from cookie or Authorization header
    const cookieToken = request.cookies.get('accessToken')?.value
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    const token = cookieToken || bearerToken

    if (!token) {
      return {
        user: null as any,
        error: errorResponse('Unauthorized - No token provided', 401),
      }
    }

    // Verify token
    const decoded = verify(token, JWT_SECRET) as any

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      return {
        user: null as any,
        error: errorResponse('Unauthorized - User not found or inactive', 401),
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    }
  } catch (error) {
    return {
      user: null as any,
      error: errorResponse('Unauthorized - Invalid token', 401),
    }
  }
}

/**
 * Require specific role
 */
export function requireRole(user: AuthUser, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(user.role)) {
    return errorResponse('Forbidden - Insufficient permissions', 403)
  }
  return null
}

/**
 * Check if user belongs to organization
 */
export async function requireOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true, role: true },
  })

  if (!user) {
    return false
  }

  // Super admins can access all organizations
  if (user.role === 'SUPER_ADMIN') {
    return true
  }

  // Check if user belongs to organization
  return user.organizationId === organizationId
}

/**
 * Require feature access based on subscription plan
 */
export async function requireFeature(organizationId: string, feature: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, status: true },
  })

  if (!organization) {
    return errorResponse('Organization not found', 404)
  }

  // Check if organization is active
  if (organization.status === 'SUSPENDED' || organization.status === 'CANCELLED') {
    return errorResponse('Organization is suspended or cancelled', 403)
  }

  // Check if plan includes feature
  if (!hasFeature(organization.plan, feature)) {
    return errorResponse(`This feature requires a higher subscription plan`, 403)
  }

  return null
}

// ============================================
// RATE LIMITING
// ============================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || record.resetAt < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    // Limit exceeded
    return false
  }

  // Increment count
  record.count++
  return true
}

/**
 * Apply rate limiting to request
 */
export function applyRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute
) {
  if (!rateLimit(identifier, limit, windowMs)) {
    return errorResponse('Rate limit exceeded. Please try again later.', 429)
  }
  return null
}

// ============================================
// USAGE LIMITS
// ============================================

/**
 * Check and increment usage
 */
export async function checkAndIncrementUsage(
  organizationId: string,
  type: 'users' | 'patients' | 'storage' | 'aiQueries',
  amount: number = 1
) {
  const usage = await checkUsageLimit(organizationId, type)

  if (usage.exceeded) {
    return errorResponse(
      `Usage limit exceeded. Current: ${usage.current}, Max: ${usage.max}`,
      403
    )
  }

  // Increment usage
  await incrementUsage(organizationId, type, amount)

  return null
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

export function paginateResults<T>(data: T[], total: number, params: PaginationParams) {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
      hasMore: params.page * params.limit < total,
    },
  }
}

// ============================================
// QUERY FILTERS
// ============================================

export function buildDateRangeFilter(
  searchParams: URLSearchParams,
  field: string = 'createdAt'
) {
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate && !endDate) {
    return {}
  }

  const filter: any = {}

  if (startDate) {
    filter.gte = new Date(startDate)
  }

  if (endDate) {
    filter.lte = new Date(endDate)
  }

  return { [field]: filter }
}

export function buildSearchFilter(searchParams: URLSearchParams, fields: string[]) {
  const search = searchParams.get('search')

  if (!search) {
    return {}
  }

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: search,
        mode: 'insensitive',
      },
    })),
  }
}

// ============================================
// API ROUTE WRAPPER
// ============================================

type ApiHandler = (
  request: NextRequest,
  context: { params: any; user?: AuthUser }
) => Promise<NextResponse>

interface ApiRouteOptions {
  requireAuth?: boolean
  allowedRoles?: UserRole[]
  rateLimit?: { limit: number; windowMs: number }
}

/**
 * Wrap API route with common middleware
 */
export function withApiRoute(handler: ApiHandler, options: ApiRouteOptions = {}) {
  return async (request: NextRequest, context: { params: any }) => {
    try {
      // Apply rate limiting
      if (options.rateLimit) {
        const identifier = request.headers.get('x-forwarded-for') || 'anonymous'
        const rateLimitError = applyRateLimit(
          identifier,
          options.rateLimit.limit,
          options.rateLimit.windowMs
        )
        if (rateLimitError) {
          return rateLimitError
        }
      }

      // Check authentication
      let user: AuthUser | undefined

      if (options.requireAuth) {
        const authResult = await requireAuth(request)
        if (authResult.error) {
          return authResult.error
        }
        user = authResult.user

        // Check role
        if (options.allowedRoles && options.allowedRoles.length > 0) {
          const roleError = requireRole(user, options.allowedRoles)
          if (roleError) {
            return roleError
          }
        }
      }

      // Call handler
      return await handler(request, { ...context, user })
    } catch (error: any) {
      console.error('API Error:', error)

      // Handle Prisma errors
      if (error.code === 'P2002') {
        return errorResponse('A record with this value already exists', 409)
      }

      if (error.code === 'P2025') {
        return errorResponse('Record not found', 404)
      }

      return errorResponse(
        error.message || 'Internal server error',
        error.statusCode || 500
      )
    }
  }
}

// ============================================
// VALIDATION
// ============================================

export async function validateRequest<T>(
  request: NextRequest,
  schema: any
): Promise<{ data: T; error?: NextResponse }> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    return { data: validatedData }
  } catch (error: any) {
    if (error.errors) {
      // Zod validation error
      const formattedErrors = error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }))
      return {
        data: null as any,
        error: errorResponse('Validation error', 400, formattedErrors),
      }
    }

    return {
      data: null as any,
      error: errorResponse('Invalid request body', 400),
    }
  }
}
