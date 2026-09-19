"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, staffList, staffAction } from "@/lib/staff-api";

type Order = { id?: string; orderCode: string; customerName: string; status: string };
export default function WarehouseHandoverPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { setOrders(await staffList<Order>("/api/staff/warehouse/orders", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const handover = async (id: string | undefined) => {
    if (!id) return;
    if (!window.confirm(`Xác nhận bàn giao đơn #${id} sang bộ phận vận chuyển?`)) return;
    setBusy(id); setError(""); setNotice("");
    try { await staffAction(`/api/staff/warehouse/orders/${id}/handover`, "POST"); setNotice(`Đã bàn giao đơn #${id}.`); await load(); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(null); }
  };
  const packed = orders.filter(o => o.status === "packed");
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/staff/dashboard/warehouse" className="text-sm text-orange-300">← Bộ phận kho</Link>
        <nav className="flex flex-wrap gap-2 text-sm mt-3">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>
        <div className="flex justify-between gap-3"><h1 className="text-3xl font-bold">Bàn giao hãng vận chuyển</h1><button onClick={() => void load()} className="rounded bg-orange-600 px-4 py-2">Làm mới</button></div>
        <p className="text-sm text-slate-400">Danh sách đơn PACKED sẵn sàng bàn giao. Khi xác nhận, đơn chuyển sang HANDED_TO_CARRIER.</p>
        {error && <p role="alert" className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        {loading && <p className="text-sm text-slate-400">Đang tải...</p>}
        <div className="space-y-3">
          {packed.map((order) => (
            <article key={order.id} className="flex items-center justify-between gap-4 rounded-xl border-slate-800 bg-slate-900 p-5">
              <div>
                <p className="font-semibold text-white">{order.orderCode}</p>
                <p className="text-xs text-slate-400">{order.customerName}</p>
              </div>
                  <button disabled={order.id == null} onClick={() => handover(order.id)} className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Bàn giao</button>
            </article>
          ))}
          {packed.length === 0 && !loading && <p className="rounded-xl border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Không có đơn nào sẵn sàng bàn giao.</p>}
        </div>
      </div>
    </main>
  );
}
