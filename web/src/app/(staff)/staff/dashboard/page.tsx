"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { errorMessage, staffList } from "@/lib/staff-api";

const API_BASE = "";

type Order = { id: string; status: string; total?: number };
type Inventory = { id: string; variantId: string; locationId: string | null; quantityOnHand: number; quantityReserved: number; reorderLevel: number };
type Shipment = { id: string; status: string; codAmount: number; codReconciled: boolean };

export default function StaffDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [o, i, s] = await Promise.all([
          staffList<Order>("/api/staff/sales/orders", controller.signal),
          staffList<Inventory>("/api/staff/warehouse/inventory", controller.signal),
          staffList<Shipment>("/api/staff/shipping/shipments", controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setOrders(o);
          setInventory(i);
          setShipments(s);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Không thể tải dashboard");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const totalOrders = orders.length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;
  const returnedOrders = orders.filter((o) => o.status === "returned").length;
  const cancelRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;
  const returnRate = totalOrders > 0 ? Math.round((returnedOrders / totalOrders) * 100) : 0;
  const lowStockVariantCount = inventory.filter((item) => item.quantityOnHand <= item.reorderLevel).length;

  const ordersByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      map[o.status] = (map[o.status] ?? 0) + 1;
    }
    return map;
  }, [orders]);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SHOP_OWNER"]} allowedPermissions={["report.view"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">STAFF PORTAL</span>
            <h1 className="text-2xl font-bold text-white">Trang Tổng quan Nhân viên</h1>
          </div>
          <Link href="/" className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition">← Về Trang Khách Hàng</Link>
        </div>

        <div className="flex gap-4 border-b border-slate-800 pb-3">
          <Link href="/staff/dashboard" className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">📊 Tổng quan</Link>
          <Link href="/staff/warehouse" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">🏭 Kho hàng</Link>
          <Link href="/staff/shipping" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">🚚 Vận chuyển</Link>
          <Link href="/staff/sales" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">🛒 Bán hàng</Link>
          <Link href="/staff/products" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">📦 Quản lý Sản phẩm & Tồn kho</Link>
          <Link href="/staff/orders" className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition">🚚 Quản lý Đơn hàng & Đóng gói</Link>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300 text-sm">Đang tải thống kê...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-medium">Tổng đơn hàng</span>
                <div className="text-2xl font-black text-white">{totalOrders}</div>
                <span className="text-xs text-emerald-400 font-medium">{cancelRate}% hủy đơn</span>
              </div>
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-medium">Đã hủy</span>
                <div className="text-2xl font-black text-white">{cancelledOrders}</div>
                <span className="text-xs text-rose-400 font-medium">Đơn đã hủy</span>
              </div>
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-medium">Tồn kho thấp</span>
                <div className="text-2xl font-black text-amber-300">{lowStockVariantCount}</div>
                <span className="text-xs text-amber-400 font-medium">Cần bổ sung nhanh</span>
              </div>
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-medium">Tỷ lệ trả hàng</span>
                <div className="text-2xl font-black text-sky-300">{returnRate}%</div>
                <span className="text-xs text-sky-400 font-medium">Theo dữ liệu hiện tại</span>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-8">
              <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800"><h3 className="font-bold text-white">Phân bố trạng thái đơn</h3></div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(ordersByStatus).map(([status, count]) => (
                    <div key={status} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs text-slate-400">{status}</p>
                      <div className="mt-2 text-2xl font-black text-white">{count}</div>
                    </div>
                  ))}
                </div>
              </section>
              <aside className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
                <h3 className="text-lg font-bold text-white mb-4">Tồn kho thấp</h3>
                <div className="space-y-3">
                  {inventory.filter((item) => item.quantityOnHand <= item.reorderLevel).length === 0 ? (
                    <p className="text-sm text-slate-400">Không có SKU nào ở mức thấp.</p>
                  ) : (
                    inventory.filter((item) => item.quantityOnHand <= item.reorderLevel).slice(0, 6).map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <p className="text-xs text-slate-400">{item.variantId.slice(0, 20)}</p>
                        <div className="mt-1 flex justify-between text-sm">
                          <span className="text-slate-300">Có sẵn</span>
                          <span className="text-amber-300 font-semibold">{item.quantityOnHand}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
