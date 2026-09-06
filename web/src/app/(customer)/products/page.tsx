import Link from "next/link";

export default function CustomerProductsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Danh Sách Sản Phẩm</h1>
          <p className="text-sm text-slate-400 mt-1">
            Kết nối trực tiếp API Spring Boot Backend (GET /api/products)
          </p>
        </div>
        <Link
          href="/"
          className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
        >
          ← Quay lại Trang chủ
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: 1, name: "Classic Oversized Cotton T-Shirt", price: "$29.99", brand: "Urban Wear", color: "Black" },
          { id: 2, name: "Slim Fit Denim Jeans", price: "$59.99", brand: "Denim Co", color: "Blue" },
          { id: 3, name: "Minimalist Windbreaker Jacket", price: "$89.99", brand: "Outdoor Tech", color: "Charcoal" }
        ].map((item) => (
          <div key={item.id} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 hover:border-violet-500/50 transition">
            <div className="h-48 rounded-xl bg-slate-900 flex items-center justify-center text-slate-600 font-semibold border border-slate-800">
              [Hình ảnh Sản phẩm {item.id}]
            </div>
            <div>
              <span className="text-xs font-semibold text-violet-400">{item.brand}</span>
              <h3 className="font-bold text-white text-lg">{item.name}</h3>
              <p className="text-sm font-extrabold text-amber-300 mt-1">{item.price}</p>
            </div>
            <button className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition">
              Thêm vào Giỏ hàng
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
