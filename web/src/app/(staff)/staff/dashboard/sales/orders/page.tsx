"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";

type Order = {
  id?: string; orderCode?: string; customerName?: string; customerEmail?: string;
  phone?: string; shippingAddress?: string; status: string; paymentStatus?: string;
  total?: number; slaDeadline?: string;
};
type OrderNote = { id?: string; content: string; createdAt?: string; createdBy?: string };
const pendingStatuses = ["pending_confirmation", "pending_payment"];
const doneStatuses = ["delivered", "returned", "refunded"];

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "sla">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (mode: "all" | "new" | "sla" = filter, signal?: AbortSignal) => {
    setLoading(true); setError("");
    const endpoint = mode === "sla" ? "/api/staff/sales/sla" : mode === "new" ? "/api/staff/sales/orders/new" : "/api/staff/sales/orders";
    try { setOrders(await staffList<Order>(endpoint, signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [filter]);
  useEffect(() => {
    const controller = new AbortController(); void load(filter, controller.signal);
    return () => controller.abort();
  }, [filter, load]);

  const perform = async (id: string, route: string, method: "POST" | "PUT", payload?: unknown) => {
    setBusy(id); setError(""); setNotice("");
    try { await staffAction(`/api/staff/sales/orders/${id}/${route}`, method, payload); setNotice("Đã lưu thao tác thành công."); await load(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  };
  const verify = (order: Order) => {
    const id = order.id; if (id == null) return;
    const customerName = window.prompt("Tên người nhận:", order.customerName ?? ""); if (customerName === null) return;
    const phone = window.prompt("Số điện thoại người nhận:", order.phone ?? ""); if (phone === null) return;
    const shippingAddress = window.prompt("Địa chỉ giao hàng:", order.shippingAddress ?? ""); if (shippingAddress === null) return;
    if (!phone.trim() || !shippingAddress.trim()) { setError("Vui lòng nhập số điện thoại và địa chỉ."); return; }
    void perform(id, "verify", "PUT", { customerName: customerName.trim(), phone: phone.trim(), shippingAddress: shippingAddress.trim() });
  };
  const cancel = (order: Order) => {
    const id = order.id; if (id == null) return;
    const reason = window.prompt(`Lý do hủy đơn #${id}:`); if (reason === null) return;
    if (!reason.trim()) { setError("Vui lòng nhập lý do hủy."); return; }
    if (window.confirm(`Xác nhận hủy đơn #${id}?`)) void perform(id, "cancel", "POST", { reason: reason.trim() });
  };
  const reserve = (order: Order) => {
    const id = order.id; if (id == null) return;
    const productId = window.prompt("ID sản phẩm cần giữ (UUID):"); if (productId === null) return;
    const quantity = window.prompt("Số lượng cần giữ:"); if (quantity === null) return;
    if (!productId.trim() || !quantity.trim()) { setError("Vui lòng nhập đầy đủ."); return; }
    void perform(id, "reservations", "POST", { productId: productId.trim(), quantity: Number(quantity) });
  };
  const addNote = (order: Order) => {
    const id = order.id; if (id == null) return;
    const content = window.prompt("Nội dung ghi chú xử lý:"); if (content === null) return;
    if (!content.trim()) { setError("Không được để trống ghi chú."); return; }
    void perform(id, "notes", "POST", { content: content.trim(), userId: null });
  };
  const openNotes = async (order: Order) => {
    const id = order.id; if (id == null) return;
    setSelected(order); setNotes([]); setError("");
    try { setNotes(await staffList<OrderNote>(`/api/staff/sales/orders/${id}/notes`)); }
    catch (cause) { setError(errorMessage(cause)); }
  };
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/staff/dashboard/sales" className="text-sm text-sky-300">← Bộ phận bán hàng</Link>
        <nav className="flex flex-wrap gap-2 text-sm mt-3">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/sales/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/sales/orders">Đơn cần xử lý</Link>
        </nav>
        <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Xử lý đơn hàng</h1><p className="mt-2 text-sm text-slate-400">Kiểm tra, xác minh, xác nhận/hủy, ghi chú, yêu cầu giữ hàng và SLA.</p></div><button type="button" onClick={() => void load()} className="rounded bg-sky-700 px-4 py-2">Làm mới</button></header>
        <div className="flex flex-wrap gap-2">{[{"key":"all","label":"Tất cả "},{"key":"new","label":"Đơn mới "},{"key":"sla","label":"Cảnh báo SLA "}].map(tab => <button type="button" key={tab.key} onClick={() => setFilter(tab.key as "all" | "new" | "sla")} className={`rounded px-4 py-2 text-sm ${filter === tab.key ? "bg-sky-600" : "bg-slate-800"}`}>{tab.label}</button>)}</div>
        {error && <p role="alert" className="rounded border border-red-700 bg-red-950 p-3 text-red-200">{error}</p>}{notice && <p role="status" className="rounded border border-emerald-700 bg-emerald-950 p-3 text-emerald-200">{notice}</p>}
        {loading ? <p role="status">Đang tải đơn...</p> : <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-800"><tr>{["Mã đơn", "Người nhận", "Liên hệ / Địa chỉ", "Trạng thái", "SLA", "Tổng tiền", "Thao tác"].map(x => <th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{orders.map(order => { const id=order.id; const canVerify=pendingStatuses.includes(order.status); const canConfirm=order.status === "pending_confirmation"; const canCancel=!(["delivered", "cancelled"].includes(order.status)); return <tr key={id ?? order.orderCode} className="border-t border-slate-800 align-top"><td className="p-3 font-bold">{order.orderCode ?? `#${id ?? "?"}`}</td><td className="p-3">{order.customerName || order.customerEmail || "—"}</td><td className="max-w-xs p-3 text-xs">{order.phone || "—"}<br />{order.shippingAddress || "Chưa có địa chỉ"}</td><td className="p-3">{order.status}</td><td className="p-3 text-xs">{order.slaDeadline ? new Date(order.slaDeadline).toLocaleString("vi-VN") : "—"}</td><td className="p-3">{Number(order.total || 0).toLocaleString("vi-VN")} ₫</td><td className="p-3"><div className="flex flex-wrap gap-2">{canVerify && <button disabled={busy !== null || id == null} onClick={() => verify(order)} className="rounded bg-sky-700 px-2 py-1.5 disabled:opacity-50">Xác minh</button>}{canConfirm && <button disabled={busy !== null || id == null} onClick={() => id != null && window.confirm(`Xác nhận đơn #${id}?`) && void perform(id,"confirm","POST")} className="rounded bg-emerald-700 px-2 py-1.5 disabled:opacity-50">Xác nhận</button>}{canCancel && <button disabled={busy !== null || id == null} onClick={() => cancel(order)} className="rounded bg-red-700 px-2 py-1.5 disabled:opacity-50">Hủy</button>}{order.status === "confirmed" && <button disabled={busy !== null || id == null} onClick={() => reserve(order)} className="rounded bg-amber-700 px-2 py-1.5 disabled:opacity-50">Giữ hàng</button>}{order.status !== "cancelled" && order.status !== "delivered" && <button disabled={busy !== null || id == null} onClick={() => openNotes(order)} className="rounded bg-slate-700 px-2 py-1.5 disabled:opacity-50">Ghi chú</button>}</div></td></tr>; })}{!orders.length && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Không có đơn nào.</td></tr>}</tbody></table></div>}
        {selected && <section className="rounded-xl border border-slate-700 bg-slate-900 p-5"><div className="flex justify-between gap-3"><h2 className="font-bold">Ghi chú đơn {selected.orderCode ?? `#${selected.id}`}</h2><button onClick={() => setSelected(null)} className="text-sm text-slate-300">Đóng</button></div><div className="mt-3 space-y-2">{notes.map(note => <p key={note.id} className="rounded bg-slate-800 p-3 text-sm">{note.content} <span className="text-xs text-slate-400">{note.createdAt || ""}</span></p>)}{!notes.length && <p className="text-sm text-slate-400">Chưa có ghi chú.</p>}</div></section>}
      </div>
    </main>
  );
}
