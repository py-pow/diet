export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Ücretsiz Başlayın</h1>
        <p className="text-center text-gray-600 mb-8">
          14 gün ücretsiz deneme - Kredi kartı gerekmez
        </p>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Kurum Adı</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Diyetisyenim"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Alt Domain</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="diyetisyenim"
              />
              <p className="text-xs text-gray-500 mt-1">diyetisyenim.diet.com</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ad</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ahmet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Soyad</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Yılmaz"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="ahmet@ornek.com"
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

          <div className="flex items-start">
            <input type="checkbox" className="mr-2 mt-1" />
            <span className="text-sm text-gray-600">
              <a href="/kvkk" className="text-green-600 hover:underline">KVKK Aydınlatma Metni</a>ni okudum ve kabul ediyorum
            </span>
          </div>

          <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition">
            Kayıt Ol
          </button>

          <p className="text-center text-sm text-gray-600">
            Zaten hesabınız var mı?{' '}
            <a href="/login" className="text-green-600 hover:underline">
              Giriş yapın
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
