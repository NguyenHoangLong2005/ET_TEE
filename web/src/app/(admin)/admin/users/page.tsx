import Link from "next/link";

export default function AdminUsersPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-bold">
            SYSTEM ADMIN PORTAL
          </span>
          <h1 className="text-2xl font-bold text-white">Quản Trị Hệ Thống & AI Config</h1>
        </div>
        <Link
          href="/"
          className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
        >
          ← Về Trang Khách Hàng
        </Link>
      </div>

      {/* Admin Submenu */}
      <div className="flex gap-4 border-b border-slate-800 pb-3">
        <Link
          href="/admin/users"
          className="px-4 py-2 rounded-lg bg-violet-600/20 text-violet-300 font-bold text-xs border border-violet-500/30"
        >
          👤 Quản lý Tài khoản & Phân quyền
        </Link>
        <Link
          href="/admin/ai-config"
          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition"
        >
          🤖 Cấu hình Mô hình AI (FashionCLIP / SASRec)
        </Link>
      </div>

      {/* Users Table Mockup */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-sm text-white">Danh Sách Người Dùng & Phân Quyền (RBAC)</h3>
          <button className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold">
            + Thêm Nhân Viên Mới
          </button>
        </div>
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3">Username</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            <tr>
              <td className="p-3 font-semibold text-white">admin_master</td>
              <td className="p-3">admin@fashionapp.com</td>
              <td className="p-3"><span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">SYSTEM_ADMIN</span></td>
              <td className="p-3"><span className="text-emerald-400 font-medium">Active</span></td>
            </tr>
            <tr>
              <td className="p-3 font-semibold text-white">staff_store01</td>
              <td className="p-3">staff01@fashionapp.com</td>
              <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">STORE_STAFF</span></td>
              <td className="p-3"><span className="text-emerald-400 font-medium">Active</span></td>
            </tr>
            <tr>
              <td className="p-3 font-semibold text-white">demo_user</td>
              <td className="p-3">demo@fashionapp.com</td>
              <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">CUSTOMER</span></td>
              <td className="p-3"><span className="text-emerald-400 font-medium">Active</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
