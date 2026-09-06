import Link from "next/link";

export default function CustomerHomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              ET.TEE FASHION
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
              Customer Portal
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="/" className="text-white font-semibold hover:text-violet-400 transition-colors">
              Trang chủ
            </Link>
            <Link href="/products" className="hover:text-violet-400 transition-colors">
              Sản phẩm
            </Link>
            <Link href="/cart" className="hover:text-violet-400 transition-colors">
              Giỏ hàng
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/staff/dashboard"
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              🏪 Kênh Bán Hàng
            </Link>
            <Link
              href="/admin/users"
              className="px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-600/20 hover:bg-violet-600/30 text-xs font-semibold text-violet-300 transition"
            >
              🛡️ System Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 flex-1 w-full space-y-16">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900/40 via-slate-900 to-pink-950/30 border border-slate-800 p-10 md:p-16 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-300">
              ✨ AI Recommendation System Active
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Khám Phá Phong Cách <br />
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                Dành Riêng Cho Bạn
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg leading-relaxed">
              Trải nghiệm thời trang thông minh với mô hình gợi ý AI kết hợp (FashionCLIP + SASRec). Tự động phối đồ theo vóc dáng và sở thích cá nhân.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link
                href="/products"
                className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition-all hover:scale-105"
              >
                Mua sắm ngay
              </Link>
              <Link
                href="/cart"
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition"
              >
                Xem Giỏ Hàng
              </Link>
            </div>
          </div>
        </section>

        {/* Categories Showcase */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>Danh Mục Nổi Bật</span>
            <span className="text-xs font-normal text-slate-400">Categorized Range</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Tops & Shirts", count: "120+ Sản phẩm", color: "from-blue-600/20 to-indigo-900/40" },
              { name: "Bottoms & Pants", count: "85+ Sản phẩm", color: "from-purple-600/20 to-pink-900/40" },
              { name: "Outerwear", count: "45+ Sản phẩm", color: "from-amber-600/20 to-orange-900/40" },
              { name: "Footwear", count: "60+ Sản phẩm", color: "from-emerald-600/20 to-teal-900/40" },
            ].map((cat, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl bg-gradient-to-br ${cat.color} border border-slate-800 hover:border-slate-700 transition cursor-pointer group`}
              >
                <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{cat.count}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        ET.TEE Fashion Recommendation System © 2026 - Powered by Next.js & Spring Boot
      </footer>
    </div>
  );
}
