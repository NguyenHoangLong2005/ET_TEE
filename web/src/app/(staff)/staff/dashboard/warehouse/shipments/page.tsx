"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";

type Order = { id?: number; orderId?: number; orderCode?: string; customerName?: string; customerEmail?: string; shippingAddress?: string; status: string };
export default function WarehouseHandoverPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { setOrders(await staffList<Order>("/api/staff/warehouse/orders", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const handover = async (id: number) => {
    if (!window.confirm(`Xác nhận bàn giao đơn #${id} sang bộ phận vận chuyển?`)) return;
    setBusy(id); setError(""); setNotice("");
    try { await staffAction(`/api/staff/warehouse/orders/${id}/handover`, "POST"); setNotice(`Đã bàn giao đơn #${id}.`); await load(); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(null); }
  };
  const packed = orders.filter(o => o.status === "PACKED");
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10"><div className="mx-auto max-w-6xl space-y-6"><Link href="/staff/dashboard/warehouse" className="text-sm text-orange-300">← Bộ phận kho</Link><nav className="flex flex-wrap gap-2 text-sm mt-3"><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link></nav><div className="flex justify-between gap-3"><h1 className="text-3xl font-bold">Bàn giao hãng vận chuyển</h1><button onClick={() => void load()} className="rounded bg-orange-600 px-4 py-2">Làm mới</button></div><p className="text-sm text-slate-400">Danh sách đơn PACKED sẵn sàng bàn giao. Khi xác nhận, đơn chuyển sang HANDED_TO_CARRIER.</p>{error && <p role="alert" className="rounded bg-red-950 p-3 text-red-200">{error}</p>}{notice && <p role="status" className="rounded bg-emerald-950 p-3 text-emerald-200">{notice}</p>}{loading ? <p>Đang tải...</p> : <div className="space-y-3">{packed.map(order => { const id=order.id ?? order.orderId; return <div key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5"><div><p className="font-semibold">{order.orderCode ?? `Đơn #${id}`}</p><p className="text-sm text-slate-400">{order.customerName || order.customerEmail || "Khách hàng"} · {order.shippingAddress || "Chưa có địa chỉ"}</p></div><button disabled={id == null || busy !== null} onClick={() => id != null && void handover(id)} className="rounded bg-emerald-700 px-4 py-2 text-sm disabled:opacity-50">Xác nhận bàn giao</button></div>; })}{!packed.length && <p className="rounded border border-slate-800 p-5 text-slate-400">Không có đơn chờ bàn giao.</p>}</div>}<Link href="/staff/dashboard/shipping/orders" className="inline-block text-sm text-sky-300">Xem đơn chờ vận chuyển →</Link></div></main>;
}
