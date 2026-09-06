import Link from "next/link";

export default function StaffDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
            MERCHANT PORTAL
          </span>
          <h1 className="text-2xl font-bold text-white">Trang Quản Lý Cửa Hàng</h1>
        </div>
        <Link
          href="/"
          className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
        >
          ← Về Trang Khách Hàng
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Tổng Đơn Hàng", value: "148", note: "+12% so với tháng trước" },
          { label: "Doanh Thu (VND)", value: "45.800.000đ", note: "Thanh toán thành công" },
          { label: "Sản Phẩm Trong Kho", value: "310 SKU", note: "4 vị trí kho" },
          { label: "Đơn Hàng Cần Đóng Gói", value: "18 Đơn", note: "Cần xử lý ngay" },
        ].map((m, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-medium">{m.label}</span>
            <div className="text-2xl font-black text-white">{m.value}</div>
            <span className="text-xs text-emerald-400 font-medium">{m.note}</span>
          </div>
        ))}
      </div>

      {/* Navigation Submenu */}
      <div className="flex gap-4 border-b border-slate-800 pb-3">
        <Link
          href="/staff/dashboard"
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30"
        >
          📊 Tổng quan
        </Link>
        <Link
          href="/staff/products"
          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition"
        >
          📦 Quản lý Sản phẩm & Tồn kho
        </Link>
        <Link
          href="/staff/orders"
          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition"
        >
          🚚 Quản lý Đơn hàng & Đóng gói
        </Link>
      </div>

      {/* Quick Action Placeholder */}
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <h3 className="font-bold text-white">Hệ Thống Quản Lý Bán Hàng & Vận Hành Kho (Staff Module)</h3>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          Dành riêng cho chủ cửa hàng & nhân viên kiểm duyệt đơn, nhập kho, tạo voucher khuyến mãi và theo dõi tình trạng giao vận.
        </p>
      </div>
    </div>
  );
}
