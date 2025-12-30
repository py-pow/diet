# 🥗 Diet - AI-Powered Dietitian Management SaaS

**Diyetisyenler için yapay zeka destekli, çok kiracılı (multi-tenant) SaaS platformu.**

---

## 📋 Proje Özeti

**Repo:** apposense
**Proje:** Diet
**Durum:** Backend API Complete (24+ endpoints)

Diet SaaS, diyetisyenlerin hasta yönetimi, diyet planları, randevular ve raporlamayı tek bir platformdan yönetmelerine olanak sağlar. AI destekli diyet planı oluşturma, KVKK uyumlu veri saklama ve white-label özelleştirme gibi gelişmiş özellikleri içerir.

---

## ✅ Tamamlanan Özellikler

### 1. **Authentication API** (13 Endpoints)
- ✅ `POST /api/auth/register` - Kayıt (IP, browser, device, TC Kimlik tracking)
- ✅ `POST /api/auth/login` - Giriş (brute force protection)
- ✅ `POST /api/auth/logout` - Çıkış
- ✅ `DELETE /api/auth/logout/all` - Tüm cihazlardan çıkış
- ✅ `POST /api/auth/refresh` - Token yenileme
- ✅ `POST /api/auth/forgot-password` - Şifre sıfırlama
- ✅ `POST /api/auth/reset-password` - Şifre sıfırlama
- ✅ `GET /api/auth/reset-password/verify` - Token kontrolü
- ✅ `POST /api/auth/verify-email/send` - Email doğrulama
- ✅ `GET /api/auth/verify-email` - Email doğrula
- ✅ `GET /api/auth/me` - Mevcut kullanıcı
- ✅ `PATCH /api/auth/me` - Profil güncelle
- ✅ `POST /api/auth/change-password` - Şifre değiştir

### 2. **Organization Management API** (11 Endpoints)
- ✅ `GET /api/organizations` - Organizasyon listesi/detay
- ✅ `GET /api/organizations/[id]/settings` - Ayarlar
- ✅ `PATCH /api/organizations/[id]/settings` - Ayar güncelle
- ✅ `GET /api/organizations/[id]/branding` - Marka ayarları
- ✅ `PATCH /api/organizations/[id]/branding` - Marka güncelle
- ✅ `DELETE /api/organizations/[id]/branding` - Marka sıfırla
- ✅ `POST /api/organizations/[id]/domain` - Domain bağla
- ✅ `GET /api/organizations/[id]/domain/verify` - Domain doğrula
- ✅ `DELETE /api/organizations/[id]/domain` - Domain kaldır
- ✅ `GET /api/organizations/[id]/users` - Kullanıcı listesi
- ✅ `POST /api/organizations/[id]/users` - Kullanıcı ekle

### 3. **Patient Management API** (CRUD)
- ✅ `GET /api/patients` - Hasta listesi (pagination, search)
- ✅ `POST /api/patients` - Hasta oluştur (KVKK consent)
- ✅ `GET /api/patients/[id]` - Hasta detay
- ✅ `PATCH /api/patients/[id]` - Hasta güncelle
- ✅ `DELETE /api/patients/[id]` - Hasta sil (soft delete)

### 4. **Database Schema** (30+ Tablo)
- ✅ Multi-tenant architecture
- ✅ User tracking (IP, browser, device, TC Kimlik, adres, telefon)
- ✅ KVKK compliance tables
- ✅ Security & audit logs
- ✅ Session management
- ✅ Consent records

### 5. **Security Features**
- ✅ Brute force protection (5 failed attempts)
- ✅ Rate limiting
- ✅ Session tracking
- ✅ IP & browser detection
- ✅ TC Kimlik validation
- ✅ Turkish phone validation
- ✅ Audit trail
- ✅ KVKK compliance
- ✅ Data access logging

### 6. **Frontend** (Basic)
- ✅ Landing page
- ✅ Login page
- ✅ Register page
- ✅ Tailwind CSS setup

---

## 🎯 Sonraki Adımlar

### Yapılacaklar:
- ⏳ Diet Plan API (CRUD + AI generation)
- ⏳ Meal & Food Management API
- ⏳ Appointment API
- ⏳ Weight Log & Food Log API
- ⏳ Lab Results API
- ⏳ Message/Chat API
- ⏳ AI Integration (OpenAI + Anthropic)
- ⏳ Payment Integration (Stripe + İyzico)
- ⏳ Dashboard Frontend
- ⏳ Food Database Seed

---

## 📁 Proje Yapısı

```
diet/
├── prisma/
│   └── schema.prisma          # 30+ model (Organization, User, Patient, etc.)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # 13 authentication endpoints
│   │   │   ├── organizations/ # 11 organization endpoints
│   │   │   └── patients/      # Patient CRUD endpoints
│   │   ├── (auth)/            # Login, register pages
│   │   ├── (dashboard)/       # Dashboard pages (TODO)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── lib/
│       ├── prisma.ts          # Prisma client + helpers
│       ├── validations/
│       │   └── index.ts       # Zod schemas (TC Kimlik, phone, etc.)
│       └── utils/
│           ├── api.ts         # API helpers (auth, rate limit, pagination)
│           ├── userInfo.ts    # User tracking (IP, browser, TC validation)
│           ├── jwt.ts         # JWT token generation
│           └── email.ts       # Email sending (Resend)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── .env.example
```

---

## 🔧 Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Environment Variables

`.env` dosyası oluştur ve `.env.example` dosyasındaki değişkenleri doldur:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-jwt-secret"
NEXTAUTH_SECRET="your-nextauth-secret"
RESEND_API_KEY="re_..."
# ... diğer değişkenler
```

### 3. Database Kurulumu

```bash
# Prisma client oluştur
npx prisma generate

# Database'i oluştur
npx prisma db push

# (Opsiyonel) Prisma Studio ile veritabanını görüntüle
npx prisma studio
```

### 4. Geliştirme Sunucusunu Başlat

```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde çalışacak.

---

## 🌐 API Dokümantasyonu

### Authentication

#### Kayıt
```bash
POST /api/auth/register
Content-Type: application/json

{
  "organizationName": "Diyetisyenim",
  "subdomain": "diyetisyenim",
  "email": "ahmet@ornek.com",
  "password": "Secure123",
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "phone": "+905551234567",
  "tcKimlikNo": "12345678901",
  "birthDate": "1990-01-01",
  "gender": "MALE",
  "addressLine1": "Örnek Mahallesi No:1",
  "city": "İstanbul",
  "district": "Kadıköy",
  "postalCode": "34000",
  "kvkkConsent": true
}
```

#### Giriş
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "ahmet@ornek.com",
  "password": "Secure123",
  "rememberMe": true
}
```

#### Token Yenileme
```bash
POST /api/auth/refresh
Cookie: refreshToken=...
```

### Organization Management

#### Organizasyon Ayarları
```bash
GET /api/organizations/[id]/settings
Authorization: Bearer {token}
```

```bash
PATCH /api/organizations/[id]/settings
Authorization: Bearer {token}
Content-Type: application/json

{
  "timezone": "Europe/Istanbul",
  "appointmentDuration": 30,
  "enableAiDietPlans": true
}
```

#### Marka Özelleştirme (White Label)
```bash
PATCH /api/organizations/[id]/branding
Authorization: Bearer {token}
Content-Type: application/json

{
  "logoUrl": "https://...",
  "primaryColor": "#10b981",
  "companyName": "Diyetisyenim"
}
```

### Patient Management

#### Hasta Listesi
```bash
GET /api/patients?page=1&limit=10&search=ahmet
Authorization: Bearer {token}
```

#### Hasta Oluştur
```bash
POST /api/patients
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "hasta@ornek.com",
  "firstName": "Mehmet",
  "lastName": "Demir",
  "phone": "+905551234567",
  "tcKimlikNo": "12345678901",
  "birthDate": "1985-05-15",
  "gender": "MALE",
  "addressLine1": "...",
  "city": "İstanbul",
  "district": "Beşiktaş",
  "postalCode": "34000",
  "height": 175,
  "initialWeight": 85,
  "targetWeight": 75,
  "kvkkConsent": true
}
```

---

## 📊 Teknik Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** JWT + HTTP-only cookies
- **Validation:** Zod
- **Email:** Resend
- **Payment:** Stripe + İyzico (TODO)
- **AI:** OpenAI + Anthropic (TODO)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (recommended)

---

## 🔒 Güvenlik Özellikleri

1. **Brute Force Protection**: 5 başarısız girişten sonra 15 dakika kilitleme
2. **Rate Limiting**: API endpoint'leri için rate limiting
3. **Session Management**: Güvenli session tracking
4. **KVKK Compliance**: Tüm kişisel veriler için consent ve access logging
5. **Audit Trail**: Tüm önemli işlemler için audit log
6. **TC Kimlik Validation**: Algoritmik TC Kimlik No doğrulama
7. **IP & Browser Tracking**: Kayıt ve giriş işlemlerinde otomatik tracking
8. **HTTP-only Cookies**: XSS saldırılarına karşı koruma

---

## 🌍 Multi-Tenant Mimari

Her organizasyon için:
- Unique subdomain (ornek.diet.com)
- Custom domain desteği (ornek.com)
- Isolated data (organizasyon bazlı veri izolasyonu)
- White-label customization
- Usage limits (plan bazlı)

---

## 📝 License

MIT License

---

## 🙋 Destek

Sorularınız için: [GitHub Issues](https://github.com/py-pow/apposense/issues)

---

**Geliştirici:** Diet SaaS Team
**Versiyon:** 1.0.0
**Son Güncelleme:** 2024
