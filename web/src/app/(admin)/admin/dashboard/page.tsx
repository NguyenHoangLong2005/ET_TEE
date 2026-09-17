"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAuthHeaders, getStoredUser } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type DashboardSummary = {
  revenue: number;
  totalOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  cancelRate: number;
  returnRate: number;
  lowStockVariantCount: number;
  ordersByStatus: Record<string, number>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/store-owner/dashboard/summary`, {
          headers: getAuthHeaders(),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Không thể tải dashboard");
        }

        setSummary(payload.data ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, []);

  const orderStatusCards = summary
    ? Object.entries(summary.ordersByStatus ?? {}).map(([status, count]) => ({
        status,
        count,
      }))
    : [];

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SHOP_OWNER"]} allowedPermissions={["dashboard.view", "report.view"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 text-xs font-bold uppercase tracking-[0.2em]">
              Admin dashboard
            </span>
            <div>
              <h1 className="text-3xl font-black text-white">ET.TEE Operations Center</h1>
              <p className="text-sm text-slate-400">Xin chào, {user?.fullName || "Admin"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/users" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-semibold border border-slate-800 transition">
              Quản lý user
            </Link>
            <Link href="/admin/ai-config" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition">
              AI config
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200 text-sm">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300 text-sm">
            Đang tải dashboard vận hành...
          </div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Doanh thu</p>
                <div className="mt-3 text-3xl font-black text-white">{formatCurrency(summary.revenue)}</div>
                <div className="mt-2 text-xs text-emerald-300">Tổng doanh thu hệ thống</div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Đơn hàng</p>
                <div className="mt-3 text-3xl font-black text-white">{summary.totalOrders}</div>
                <div className="mt-2 text-xs text-sky-300">Đã ghi nhận trong hệ thống</div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tồn kho thấp</p>
                <div className="mt-3 text-3xl font-black text-amber-300">{summary.lowStockVariantCount}</div>
                <div className="mt-2 text-xs text-amber-200">Cần bổ sung nhanh</div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tỷ lệ hủy/hoàn</p>
                <div className="mt-3 text-3xl font-black text-rose-300">{summary.cancelRate}% / {summary.returnRate}%</div>
                <div className="mt-2 text-xs text-rose-200">Theo xu hướng vận hành hiện tại</div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Phân bố trạng thái đơn hàng</h2>
                  <span className="text-xs text-slate-400">Real-time snapshot</span>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {orderStatusCards.map((item) => (
                    <div key={item.status} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.status}</p>
                      <div className="mt-2 text-3xl font-black text-white">{item.count}</div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xl font-bold text-white">Hành động nhanh</h2>

                <div className="mt-5 space-y-3">
                  {[
                    { title: "Quản lý sản phẩm", href: "/staff/products" },
                    { title: "Quản lý đơn hàng", href: "/staff/orders" },
                    { title: "Phân quyền RBAC", href: "/admin/users" },
                    { title: "AI model config", href: "/admin/ai-config" },
                  ].map((action) => (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="block rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 hover:border-violet-500/30 hover:text-violet-200 transition"
                    >
                      {action.title}
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
