"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, staffAction, staffList, staffRequest } from "@/lib/staff-api";

type Order = { id?: string; orderCode?: string; customerName?: string; customerEmail?: string; phone?: string; shippingAddress?: string; status: string };
type Label = { orderId?: string; orderCode?: string; receiver?: string; phone?: string; address?: string; codAmount?: number };
const orderId = (order: Order) => order.id;
export default function PackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [label, setLabel] = useState<Label | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError(""); setLoading(true);
    try { setOrders(await staffList<Order>("/api/staff/warehouse/orders", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const completePacking = async (id: string) => {
    if (!window.confirm(`Xác nhận đơn #${id} đã lấy đủ và đóng gói xong?`)) return;
    setBusy(id); setError(""); setNotice("");
    try {
      await staffAction(`/api/staff/warehouse/orders/${id}/packing`, "POST");
      setNotice(`Đã hoàn tất đóng gói đơn #${id}.`); await load();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  };
  const openLabel = async (id: string) => {
    setBusy(id); setError("");
    try { setLabel(await staffRequest<Label>(`/api/staff/warehouse/orders/${id}/label`)); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  };
  const visible = orders.filter(o => o.status === "picking" || o.status === "packed");
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10 print:bg-white print:p-0 print:text-black"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap justify-between gap-4 print:hidden"><div><Link href="/staff/dashboard/warehouse" className="text-sm text-orange-300">← Bộ phận kho</Link><h1 className="mt-3 text-3xl font-bold">Đóng gói và in tem</h1></div><button className="rounded bg-orange-600 px-4 py-2" onClick={() => void load()}>Làm mới</button></div>
    <nav className="flex flex-wrap gap-2 text-sm mt-3 print:hidden">
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
    </nav>
    <p className="text-sm text-slate-400 print:hidden">Theo backend hiện tại, hoàn tất picking và packing đều đưa đơn về PACKED. Chọn một trong hai thao tác, không cần thực hiện cả hai.</p>
    {error && <p role="alert" className="rounded bg-red-950 p-3 text-red-200 print:hidden">{error}</p>}{notice && <p role="status" className="rounded bg-emerald-950 p-3 text-emerald-200 print:hidden">{notice}</p>}
    <section className="space-y-3 print:hidden">{loading ? <p>Đang tải đơn...</p> : visible.map(o => { const id=orderId(o); return <div key={id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5"><div><p className="font-bold">{o.orderCode ?? `Đơn #${id}`}</p><p className="text-sm text-slate-400">{o.customerName || o.customerEmail || "Khách hàng"} · {o.status}</p><p className="text-xs text-slate-400">{o.shippingAddress || "Chưa có địa chỉ"}</p></div><div className="flex flex-wrap gap-2">{o.status === "picking" && <button disabled={id == null || busy !== null} onClick={() => id != null && void completePacking(id)} className="rounded bg-emerald-700 px-4 py-2 text-sm disabled:opacity-50">Hoàn tất đóng gói</button>}{o.status === "packed" && <button disabled={id == null || busy !== null} onClick={() => id != null && void openLabel(id)} className="rounded bg-orange-700 px-4 py-2 text-sm disabled:opacity-50">Xem / in tem</button>}</div></div>; })}{!loading && !visible.length && <p className="rounded border border-slate-800 p-5 text-slate-400">Chưa có đơn đang picking hoặc đã đóng gói.</p>}</section>
    {label && <section className="rounded-xl border border-slate-600 bg-white p-6 text-black print:border-black" aria-label="Tem giao hàng"><h2 className="text-xl font-black">TEM GIAO HÀNG ET.TEE</h2><div className="mt-4 space-y-2 text-sm"><p>Mã đơn: {label.orderCode || label.orderId}</p><p>Người nhận: {label.receiver || "—"}</p><p>Điện thoại: {label.phone || "—"}</p><p>Địa chỉ: {label.address || "—"}</p><p>COD: {Number(label.codAmount || 0).toLocaleString("vi-VN")} ₫</p></div><button type="button" onClick={() => window.print()} className="mt-5 rounded bg-slate-900 px-4 py-2 text-sm text-white print:hidden">In tem</button><button type="button" onClick={() => setLabel(null)} className="ml-2 rounded border px-4 py-2 text-sm print:hidden">Đóng tem</button></section>}
  </div></main>;
}
