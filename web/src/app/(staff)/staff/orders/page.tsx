"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiClient } from "@/lib/api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type OrderItem = {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  status: string;
  paymentStatus: string;
  total: number;
  placedAt: string;
  version: number;
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

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const nextStatus: Record<string, string> = {
    pending_confirmation: "confirmed",
    confirmed: "picking",
    picking: "packed",
    packed: "handed_to_carrier",
    handed_to_carrier: "shipping",
    shipping: "delivered",
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ size: "50" });
      if (keyword.trim()) params.set("keyword", keyword.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`${API_BASE}/api/cskh/orders?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể tải danh sách đơn hàng");
      }

      setOrders(payload.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const advanceOrder = async (order: OrderItem) => {
    const status = nextStatus[order.status];
    if (!status) return;
    try {
      setError(null);
      await apiClient.post(`/api/cskh/orders/${order.id}/status`, {
        status,
        expectedVersion: order.version,
        note: `Cập nhật bởi staff: ${status}`,
      });
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái đơn hàng");
    }
  };

  useEffect(() => {
    loadOrders();
  }, [keyword, statusFilter]);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SHOP_OWNER", "CSKH_STAFF"]} allowedPermissions={["order.view"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
            MERCHANT PORTAL
          </span>
          <h1 className="text-2xl font-bold text-white">Quản lý Đơn hàng & Đóng gói</h1>
        </div>
        <Link href="/staff/dashboard" className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition">
          ← Quay lại Dashboard
        </Link>
      </div>

      <div className="flex gap-4 border-b border-slate-800 pb-3">
        <Link href="/staff/dashboard" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">📊 Tổng quan</Link>
        <Link href="/staff/products" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">📦 Quản lý Sản phẩm & Tồn kho</Link>
        <Link href="/staff/orders" className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">🚚 Quản lý Đơn hàng & Đóng gói</Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200 text-sm">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="font-bold text-white">Danh sách đơn hàng</h3>
          <div className="flex flex-col md:flex-row gap-2 text-xs">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm đơn hàng hoặc khách hàng"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipping">Shipping</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-300 text-sm">Đang tải đơn hàng...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Mã đơn</th>
                  <th className="p-3">Khách hàng</th>
                  <th className="p-3">Tổng tiền</th>
                  <th className="p-3">Thanh toán</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-slate-400">Không có đơn hàng nào</td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td className="p-3 font-semibold text-white">{order.orderCode}</td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-white">{order.customerName}</div>
                          <div className="text-slate-400">{order.customerPhone}</div>
                        </div>
                      </td>
                      <td className="p-3 text-amber-300">{formatCurrency(order.total)}</td>
                      <td className="p-3">{order.paymentStatus}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${order.status === "pending" ? "bg-amber-500/10 text-amber-300" : order.status === "confirmed" ? "bg-sky-500/10 text-sky-300" : order.status === "shipping" ? "bg-violet-500/10 text-violet-300" : order.status === "delivered" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3">{new Date(order.placedAt).toLocaleString("vi-VN")}</td>
                      <td className="p-3">
                        {nextStatus[order.status] ? (
                          <button
                            type="button"
                            onClick={() => advanceOrder(order)}
                            className="rounded-lg bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-violet-500"
                          >
                            → {nextStatus[order.status]}
                          </button>
                        ) : <span className="text-slate-500">-</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </ProtectedRoute>
  );
}
