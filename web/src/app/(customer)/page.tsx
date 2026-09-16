import Link from "next/link";

const categories = [
  { name: "Áo thun & Polo", count: "120+ sản phẩm", color: "from-violet-500/20 to-indigo-900/40" },
  { name: "Quần & Jogger", count: "85+ sản phẩm", color: "from-fuchsia-500/20 to-pink-900/40" },
  { name: "Áo khoác", count: "45+ sản phẩm", color: "from-amber-500/20 to-orange-900/40" },
  { name: "Giày & phụ kiện", count: "60+ sản phẩm", color: "from-emerald-500/20 to-teal-900/40" },
];

const highlights = [
  { label: "AI Recommendation", value: "98%" },
  { label: "Sản phẩm mới", value: "2.4k" },
  { label: "Khách hàng hài lòng", value: "4.9/5" },
  { label: "Tốc độ giao hàng", value: "48h" },
];

const featuredProducts = [
  "Signature Street Tee",
  "Urban Flow Overshirt",
  "Essential Denim Set",
  "Weekend Utility Tote",
];

export default function CustomerHomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/85 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              ET.TEE
            </span>
            <span className="hidden sm:inline-flex text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-300 font-semibold">
              Fashion AI
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="/" className="text-white font-semibold hover:text-violet-400 transition-colors">Trang chủ</Link>
            <Link href="/products" className="hover:text-violet-400 transition-colors">Sản phẩm</Link>
            <Link href="/cart" className="hover:text-violet-400 transition-colors">Giỏ hàng</Link>
            <Link href="/profile" className="hover:text-violet-400 transition-colors">Tài khoản</Link>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium transition">
              Đăng nhập
            </Link>
            <Link href="/register" className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-600/30 transition">
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-16 flex-1 w-full space-y-16">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-800 bg-gradient-to-br from-violet-950/80 via-slate-950 to-slate-900 p-8 md:p-12">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.4),transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.2),transparent_30%)]" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-center gap-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-300">
                ✨ Hệ thống gợi ý AI đang hoạt động
              </div>
              <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight text-white">
                Phong cách thời trang
                <span className="block bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                  dành riêng cho bạn
                </span>
              </h1>
              <p className="max-w-xl text-base md:text-lg text-slate-300 leading-relaxed">
                Khám phá bộ sưu tập theo xu hướng, sở thích cá nhân và gợi ý AI từ ET.TEE để mỗi sản phẩm đều phù hợp với phong cách, nhu cầu và túi tiền của bạn.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/products" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-600/30 transition-all hover:-translate-y-0.5">
                  Mua sắm ngay
                </Link>
                <Link href="/staff/dashboard" className="px-6 py-3 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold transition">
                  Kênh bán hàng
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-violet-950/30">
              <div className="rounded-[24px] border border-slate-800 bg-gradient-to-br from-slate-800 via-slate-900 to-violet-950/50 p-5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Recommendation score</span>
                  <span className="rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5">+24.8%</span>
                </div>
                <div className="mt-5 space-y-4">
                  {featuredProducts.map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500" />
                        <div>
                          <p className="font-semibold text-white text-sm">{item}</p>
                          <p className="text-[10px] text-slate-400">Style match #{index + 1}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-amber-300">89%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-center shadow-lg shadow-slate-950/30">
              <div className="text-2xl md:text-3xl font-black text-white">{item.value}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</div>
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-violet-300 font-semibold">Danh mục</p>
              <h2 className="mt-2 text-3xl font-black text-white">Bộ sưu tập nổi bật</h2>
            </div>
            <Link href="/products" className="text-sm text-violet-300 hover:text-violet-200 font-semibold">
              Xem tất cả →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat, idx) => (
              <div key={idx} className={`p-6 rounded-3xl bg-gradient-to-br ${cat.color} border border-slate-800 hover:border-violet-500/30 transition cursor-pointer group`}>
                <div className="mb-4 h-24 rounded-2xl bg-slate-950/30 border border-white/10 flex items-center justify-center text-3xl">
                  {idx === 0 ? "👕" : idx === 1 ? "🩳" : idx === 2 ? "🧥" : "👟"}
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-violet-200 transition">{cat.name}</h3>
                <p className="text-xs text-slate-300 mt-1">{cat.count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { title: "AI Styling Engine", text: "Gợi ý outfit theo hình dáng, thời tiết và sở thích cá nhân." },
            { title: "Tối ưu tồn kho", text: "Nhân sự quản lý đơn hàng, biến thể và báo cáo tồn kho theo thời gian thực." },
            { title: "Trải nghiệm mượt", text: "Giao diện đơn giản, rõ ràng, thân thiện với cả khách hàng lẫn quản trị viên." },
          ].map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="mb-4 h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl">✓</div>
              <h3 className="text-xl font-bold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        ET.TEE Fashion Recommendation System © 2026 · Powered by Next.js & Spring Boot
      </footer>
    </div>
  );
}
