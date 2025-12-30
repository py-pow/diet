import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🥗 Diet SaaS
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-Powered Dietitian Management Platform
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold mb-2">Hasta Yönetimi</h3>
            <p className="text-gray-600">
              KVKK uyumlu hasta kayıtları, detaylı sağlık geçmişi takibi
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">AI Diyet Planları</h3>
            <p className="text-gray-600">
              OpenAI ve Anthropic ile kişiselleştirilmiş diyet önerileri
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Detaylı Raporlar</h3>
            <p className="text-gray-600">
              Kilo takibi, besin günlüğü, laboratuvar sonuçları
            </p>
          </div>
        </div>

        <div className="mt-16 bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">🚀 Özellikler</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Multi-tenant architecture (subdomain/custom domain)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>KVKK compliant patient records</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>AI-powered diet plan generation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Appointment scheduling</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>White-label customization</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Video consultation (optional)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Turkish localization</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Stripe & İyzico payment integration</span>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">📝 API Documentation</h2>
          <p className="text-gray-600 mb-4">
            Complete REST API with 24+ endpoints
          </p>
          <div className="bg-gray-100 p-4 rounded-lg inline-block text-left">
            <p className="font-mono text-sm">✅ Authentication API (13 endpoints)</p>
            <p className="font-mono text-sm">✅ Organization Management (11 endpoints)</p>
            <p className="font-mono text-sm">✅ Patient Management (CRUD)</p>
            <p className="font-mono text-sm">⏳ Diet Plan API</p>
            <p className="font-mono text-sm">⏳ Appointment API</p>
            <p className="font-mono text-sm">⏳ AI Integration</p>
          </div>
        </div>
      </div>
    </div>
  )
}
