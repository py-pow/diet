import { z } from 'zod'
import {
  validateTcKimlikNo,
  validateTurkishPhone,
  validateTurkishPostalCode,
} from '@/lib/utils/userInfo'

// ============================================
// CUSTOM VALIDATORS
// ============================================

const tcKimlikSchema = z
  .string()
  .length(11, 'TC Kimlik No 11 haneli olmalıdır')
  .regex(/^\d+$/, 'TC Kimlik No sadece rakamlardan oluşmalıdır')
  .refine(validateTcKimlikNo, 'Geçersiz TC Kimlik No')

const turkishPhoneSchema = z
  .string()
  .min(10, 'Telefon numarası en az 10 haneli olmalıdır')
  .refine(validateTurkishPhone, 'Geçersiz telefon numarası')

const turkishPostalCodeSchema = z
  .string()
  .refine(validateTurkishPostalCode, 'Geçersiz posta kodu')

// ============================================
// AUTH SCHEMAS
// ============================================

export const registerSchema = z.object({
  // Organization
  organizationName: z.string().min(2, 'Kurum adı en az 2 karakter olmalıdır'),
  subdomain: z
    .string()
    .min(3, 'Alt domain en az 3 karakter olmalıdır')
    .max(20, 'Alt domain en fazla 20 karakter olmalıdır')
    .regex(/^[a-z0-9-]+$/, 'Alt domain sadece küçük harf, rakam ve tire içerebilir')
    .refine(
      (val) => !['www', 'api', 'admin', 'app', 'mail', 'ftp'].includes(val),
      'Bu alt domain kullanılamaz'
    ),

  // User
  email: z.string().email('Geçersiz email adresi'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .regex(/[0-9]/, 'Şifre en az bir rakam içermelidir'),
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  phone: turkishPhoneSchema,

  // Personal info (KVKK)
  tcKimlikNo: tcKimlikSchema,
  birthDate: z.string().refine((date) => {
    const birthDate = new Date(date)
    const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    return age >= 18 && age <= 120
  }, 'Yaşınız 18 ile 120 arasında olmalıdır'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    errorMap: () => ({ message: 'Geçersiz cinsiyet' }),
  }),

  // Address (KVKK)
  addressLine1: z.string().min(5, 'Adres en az 5 karakter olmalıdır'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'Şehir adı en az 2 karakter olmalıdır'),
  district: z.string().min(2, 'İlçe adı en az 2 karakter olmalıdır'),
  postalCode: turkishPostalCodeSchema,

  // KVKK consent
  kvkkConsent: z.boolean().refine((val) => val === true, {
    message: 'KVKK aydınlatma metnini kabul etmelisiniz',
  }),
})

export const loginSchema = z.object({
  email: z.string().email('Geçersiz email adresi'),
  password: z.string().min(1, 'Şifre gereklidir'),
  rememberMe: z.boolean().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Geçersiz email adresi'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token gereklidir'),
  password: z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .regex(/[0-9]/, 'Şifre en az bir rakam içermelidir'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gereklidir'),
  newPassword: z
    .string()
    .min(8, 'Yeni şifre en az 8 karakter olmalıdır')
    .regex(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .regex(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .regex(/[0-9]/, 'Şifre en az bir rakam içermelidir'),
})

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır').optional(),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır').optional(),
  phone: turkishPhoneSchema.optional(),
  avatar: z.string().url('Geçersiz URL').optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  addressLine1: z.string().min(5, 'Adres en az 5 karakter olmalıdır').optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'Şehir adı en az 2 karakter olmalıdır').optional(),
  district: z.string().min(2, 'İlçe adı en az 2 karakter olmalıdır').optional(),
  postalCode: turkishPostalCodeSchema.optional(),
})

// ============================================
// PATIENT SCHEMAS
// ============================================

export const createPatientSchema = z.object({
  email: z.string().email('Geçersiz email adresi'),
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  phone: turkishPhoneSchema,

  // Personal info (KVKK)
  tcKimlikNo: tcKimlikSchema,
  birthDate: z.string().refine((date) => {
    const birthDate = new Date(date)
    const age = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    return age >= 0 && age <= 120
  }, 'Yaş 0 ile 120 arasında olmalıdır'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),

  // Address (KVKK)
  addressLine1: z.string().min(5, 'Adres en az 5 karakter olmalıdır'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'Şehir adı en az 2 karakter olmalıdır'),
  district: z.string().min(2, 'İlçe adı en az 2 karakter olmalıdır'),
  postalCode: turkishPostalCodeSchema,

  // Health info
  height: z.number().min(50).max(250).optional(),
  initialWeight: z.number().min(20).max(300).optional(),
  targetWeight: z.number().min(20).max(300).optional(),
  bloodType: z.string().optional(),
  activityLevel: z.enum(['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTREMELY_ACTIVE']).optional(),
  occupation: z.string().optional(),
  smokingStatus: z.boolean().optional(),
  alcoholStatus: z.boolean().optional(),

  // Medical history
  medicalConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),

  // Emergency contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: turkishPhoneSchema.optional(),
  emergencyContactRelation: z.string().optional(),

  // Notes
  notes: z.string().optional(),

  // KVKK consent
  kvkkConsent: z.boolean().refine((val) => val === true, {
    message: 'KVKK aydınlatma metnini kabul etmelisiniz',
  }),
})

export const updatePatientSchema = createPatientSchema.partial().omit({
  tcKimlikNo: true,
  kvkkConsent: true,
})

// ============================================
// DIET PLAN SCHEMAS
// ============================================

export const createDietPlanSchema = z.object({
  patientId: z.string().cuid('Geçersiz hasta ID'),
  name: z.string().min(3, 'Diyet planı adı en az 3 karakter olmalıdır'),
  description: z.string().optional(),
  targetCalories: z.number().min(800).max(5000),
  targetProtein: z.number().min(0).max(500).optional(),
  targetCarbs: z.number().min(0).max(1000).optional(),
  targetFat: z.number().min(0).max(500).optional(),
  startDate: z.string().refine((date) => {
    return new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0))
  }, 'Başlangıç tarihi bugünden önce olamaz'),
  endDate: z.string(),
  notes: z.string().optional(),
})

export const updateDietPlanSchema = createDietPlanSchema.partial().omit({ patientId: true })

export const createMealSchema = z.object({
  dietPlanId: z.string().cuid(),
  type: z.enum(['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'EVENING_SNACK']),
  name: z.string().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Geçersiz saat formatı (HH:MM)').optional(),
  day: z.number().min(1).max(7).optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
})

export const addFoodToMealSchema = z.object({
  foodId: z.string().cuid(),
  amount: z.number().min(0.1),
  unit: z.string().min(1),
  notes: z.string().optional(),
})

// ============================================
// APPOINTMENT SCHEMAS
// ============================================

export const createAppointmentSchema = z.object({
  patientId: z.string().cuid('Geçersiz hasta ID'),
  title: z.string().min(3, 'Başlık en az 3 karakter olmalıdır'),
  description: z.string().optional(),
  type: z.enum(['IN_PERSON', 'VIDEO_CALL', 'PHONE_CALL']),
  startTime: z.string().refine((date) => {
    return new Date(date) > new Date()
  }, 'Randevu zamanı şu andan sonra olmalıdır'),
  duration: z.number().min(15).max(240), // 15 minutes to 4 hours
  location: z.string().optional(),
  notes: z.string().optional(),
})

export const updateAppointmentSchema = createAppointmentSchema.partial().omit({ patientId: true })

export const cancelAppointmentSchema = z.object({
  cancelReason: z.string().min(5, 'İptal nedeni en az 5 karakter olmalıdır'),
})

// ============================================
// MESSAGE SCHEMAS
// ============================================

export const sendMessageSchema = z.object({
  receiverId: z.string().cuid('Geçersiz alıcı ID'),
  patientId: z.string().cuid('Geçersiz hasta ID').optional(),
  subject: z.string().min(3, 'Konu en az 3 karakter olmalıdır').optional(),
  body: z.string().min(1, 'Mesaj boş olamaz'),
  replyToId: z.string().cuid().optional(),
})

// ============================================
// ORGANIZATION SCHEMAS
// ============================================

export const updateOrganizationSettingsSchema = z.object({
  timezone: z.string().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }).optional(),
  appointmentDuration: z.number().min(15).max(240).optional(),
  bufferTime: z.number().min(0).max(60).optional(),
  allowOnlineBooking: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  enableAiDietPlans: z.boolean().optional(),
  enableVideoConsult: z.boolean().optional(),
  enablePatientPortal: z.boolean().optional(),
  kvkkContactEmail: z.string().email().optional(),
  kvkkContactPhone: turkishPhoneSchema.optional(),
  dataRetentionDays: z.number().min(365).max(7300).optional(), // 1-20 years
})

export const updateOrganizationBrandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  companyName: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  email: z.string().email().optional(),
  phone: turkishPhoneSchema.optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  twitter: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  customCss: z.string().optional(),
})

export const addCustomDomainSchema = z.object({
  customDomain: z.string().regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/, 'Geçersiz domain adı'),
})

export const inviteUserSchema = z.object({
  email: z.string().email('Geçersiz email adresi'),
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  role: z.enum(['DIETITIAN', 'ASSISTANT']),
})

// ============================================
// WEIGHT LOG SCHEMAS
// ============================================

export const createWeightLogSchema = z.object({
  patientId: z.string().cuid(),
  weight: z.number().min(20).max(300),
  bmi: z.number().min(10).max(60).optional(),
  bodyFat: z.number().min(0).max(100).optional(),
  chest: z.number().min(0).max(300).optional(),
  waist: z.number().min(0).max(300).optional(),
  hips: z.number().min(0).max(300).optional(),
  thigh: z.number().min(0).max(300).optional(),
  arm: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  logDate: z.string().optional(),
})

// ============================================
// FOOD LOG SCHEMAS
// ============================================

export const createFoodLogSchema = z.object({
  patientId: z.string().cuid(),
  mealType: z.enum(['BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'EVENING_SNACK']),
  mealTime: z.string(),
  foodName: z.string().min(1),
  amount: z.number().min(0.1),
  unit: z.string().min(1),
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
})

// ============================================
// LAB RESULT SCHEMAS
// ============================================

export const createLabResultSchema = z.object({
  patientId: z.string().cuid(),
  testType: z.enum(['BLOOD_TEST', 'URINE_TEST', 'THYROID', 'VITAMIN', 'MINERAL', 'OTHER']),
  testName: z.string().min(1),
  testDate: z.string(),
  results: z.record(z.any()),
  fileUrl: z.string().url().optional(),
  notes: z.string().optional(),
})
