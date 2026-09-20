"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080"

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

type InventoryItem = {
  variantId: string;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  available: number;
  reorderLevel: number;
};

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("ettee_access_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function StaffDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [summaryResponse, lowStockResponse] = await Promise.all([
          fetch(`${API_BASE}/api/store-owner/dashboard/summary`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${API_BASE}/api/store-owner/inventory/low-stock?size=10`, {
            headers: getAuthHeaders(),
          }),
        ]);

        const summaryPayload = await summaryResponse.json();
        const lowStockPayload = await lowStockResponse.json();

        if (!summaryResponse.ok || !summaryPayload.success) {
          throw new Error(summaryPayload.message || "Không thể tải dashboard");
        }

        if (!lowStockResponse.ok || !lowStockPayload.success) {
          throw new Error(lowStockPayload.message || "Không thể tải tồn kho thấp");
        }

        setSummary(summaryPayload.data ?? null);
        setLowStock(lowStockPayload.data?.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const orderBreakdown = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.ordersByStatus || {}).map(([status, count]) => ({
      status,
      count,
    }));
  }, [summary]);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SHOP_OWNER"]} allowedPermissions={["report.view"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
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

      <div className="flex gap-4 border-b border-slate-800 pb-3">
        <Link href="/staff/dashboard" className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">📊 Tổng quan</Link>
        <Link href="/staff/products" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">📦 Quản lý Sản phẩm & Tồn kho</Link>
        <Link href="/staff/orders" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">🚚 Quản lý Đơn hàng & Đóng gói</Link>
        <link href="/staff/sales" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">💰 Báo cáo & Doanh thu</link>
        <link href="/staff/shipping" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">🚢 Quản lý Vận chuyển</link>
        <link href="/staff/warehouse" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">🏭 Quản lý Kho</link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200 text-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300 text-sm">
          Đang tải thống kê cửa hàng...
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-medium">Tổng đơn hàng</span>
              <div className="text-2xl font-black text-white">{summary.totalOrders}</div>
              <span className="text-xs text-emerald-400 font-medium">{summary.cancelRate}% hủy đơn</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-medium">Doanh thu</span>
              <div className="text-2xl font-black text-white">{formatCurrency(summary.revenue)}</div>
              <span className="text-xs text-emerald-400 font-medium">Trong khoảng thời gian đã chọn</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-medium">Tồn kho thấp</span>
              <div className="text-2xl font-black text-amber-300">{summary.lowStockVariantCount}</div>
              <span className="text-xs text-amber-400 font-medium">Cần bổ sung nhanh</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-medium">Tỷ lệ hoàn trả</span>
              <div className="text-2xl font-black text-sky-300">{summary.returnRate}%</div>
              <span className="text-xs text-sky-400 font-medium">Theo dữ liệu hiện tại</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-8">
            <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h3 className="font-bold text-white">Phân bố trạng thái đơn</h3>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {orderBreakdown.map((item) => (
                  <div key={item.status} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs text-slate-400">{item.status}</p>
                    <div className="mt-2 text-2xl font-black text-white">{item.count}</div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
              <h3 className="text-lg font-bold text-white mb-4">Tồn kho thấp</h3>
              <div className="space-y-3">
                {lowStock.length === 0 ? (
                  <p className="text-sm text-slate-400">Không có SKU nào ở mức thấp.</p>
                ) : (
                  lowStock.slice(0, 6).map((item) => (
                    <div key={`${item.variantId}-${item.locationId}`} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <p className="text-xs text-slate-400">Variant {item.variantId.slice(0, 8)}</p>
                      <div className="mt-1 flex justify-between text-sm">
                        <span className="text-slate-300">Có sẵn</span>
                        <span className="text-amber-300 font-semibold">{item.available}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        </>
      ) : null}
      </div>
    </ProtectedRoute>
  );
}