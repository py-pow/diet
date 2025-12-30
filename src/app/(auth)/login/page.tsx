export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Giriş Yap</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Şifre</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm">Beni hatırla</span>
            </label>
            <a href="/forgot-password" className="text-sm text-green-600 hover:underline">
              Şifremi unuttum
            </a>
          </div>

          <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition">
            Giriş Yap
          </button>

          <p className="text-center text-sm text-gray-600">
            Hesabınız yok mu?{' '}
            <a href="/register" className="text-green-600 hover:underline">
              Kayıt olun
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
