"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage, staffList, staffAction } from "@/lib/staff-api";

type Order = {
  id?: string; orderCode: string; customerName: string; shippingAddress: string; status: string;
};

export default function WarehousePickingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true); setError("");
    try {
      const result = await staffList<Order>("/api/staff/warehouse/orders");
      setOrders(result.filter((o) => o.status === "confirmed" || o.status === "picking"));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  const run = async (id: string, path: string) => {
    try {
      await staffAction(`/api/staff/warehouse/orders/${id}/${path}`, "POST");
      await loadOrders();
    } catch (cause) {
      alert(errorMessage(cause));
    }
  };

  return (
    <PickingView orders={orders} error={error} loading={loading} onRun={run} />
  );
}

function PickingView({
  orders, error, loading, onRun,
}: {
  orders: Order[]; error: string; loading: boolean; onRun: (id: string, path: string) => void;
}) {
  return (
    <main className="min-h-screen bg-[#15100f] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/staff/dashboard/warehouse" className="text-xs text-orange-300">← Về dữ liệu kho</Link>
        <nav className="flex flex-wrap gap-2 text-sm mt-3">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        <h1 className="text-3xl font-black text-white mt-3">Lấy hàng</h1>

        {error && <p className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        {loading && <p className="text-sm text-slate-400">Đang tải đơn hàng...</p>}

        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="flex flex-col gap-3 rounded-xl border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-slate-500">{order.orderCode}</p>
                <p className="mt-1 font-semibold text-white">{order.customerName ?? "Khách chưa đặt tên"}</p>
                <p className="mt-1 text-xs text-slate-400">{order.shippingAddress ?? "Chưa có địa chỉ"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-orange-300">{order.status}</span>
                {order.status === "confirmed" && (
                  <button onClick={() => order.id && onRun(order.id, "picking")} className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Bắt đầu lấy hàng</button>
                )}
                {order.status === "picking" && (
                  <button onClick={() => order.id && onRun(order.id, "picking/complete")} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Hoàn tất lấy hàng</button>
                )}
              </div>
            </article>
          ))}
          {orders.length === 0 && !loading && <p className="rounded-xl border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Không có đơn nào cần lấy hàng.</p>}
        </div>
      </div>
    </main>
  );
}
