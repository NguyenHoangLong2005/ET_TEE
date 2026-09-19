"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";

type ShippingException = {
  id: string; exceptionType: string; description: string; status: string;
  shipment?: { id: string; trackingCode?: string };
  resolutionNote?: string;
};
export default function ShippingExceptionsPage() {
  const [items, setItems] = useState<ShippingException[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ shipmentId: "", type: "", description: "" });
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { setItems(await staffList<ShippingException>("/api/staff/shipping/exceptions", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const shipmentId = form.shipmentId.trim();
    if (!shipmentId || !form.type.trim() || !form.description.trim()) { setError("Nhập ID kiện hợp lệ, loại và mô tả ngoại lệ."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await staffAction("/api/staff/shipping/exceptions", "POST", { shipmentId, type: form.type.trim(), description: form.description.trim() });
      setForm({ shipmentId: "", type: "", description: "" }); setNotice("Đã ghi nhận ngoại lệ."); await load();
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  };
  const resolve = async (id: string) => {
    const note=window.prompt("Nội dung xử lý ngoại lệ:");
    if (note === null) return;
    if (!note.trim()) { setError("Cần ghi rõ nội dung xử lý."); return; }
    setBusy(true); setError(""); setNotice("");
    try { await staffAction(`/api/staff/shipping/exceptions/${id}/resolve`, "PUT", { note: note.trim() }); setNotice(`Đã xử lý ngoại lệ #${id}.`); await load(); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10"><div className="mx-auto max-w-6xl space-y-6">
    <Link href="/staff/dashboard/shipping" className="text-sm text-sky-300">← Bộ phận vận chuyển</Link>
    <nav className="flex flex-wrap gap-2 text-sm mt-3">
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping">Tổng quan</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/orders">Đơn chờ giao</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/shipments">Kiện hàng</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/exceptions">Ngoại lệ</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/cod">Đối soát COD</Link>
    </nav>
    <div className="flex flex-wrap justify-between gap-3"><h1 className="text-3xl font-bold">Ngoại lệ giao hàng</h1><button onClick={() => void load()} className="rounded bg-sky-700 px-4 py-2">Làm mới</button></div>
    {error && <p role="alert" className="rounded border border-red-700 bg-red-950 p-3 text-red-200">{error}</p>}{notice && <p role="status" className="rounded border border-emerald-700 bg-emerald-950 p-3 text-emerald-200">{notice}</p>}
    <form onSubmit={create} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4">
      <input required type="text" value={form.shipmentId} onChange={e => setForm(v => ({ ...v, shipmentId:e.target.value }))} placeholder="ID kiện hàng" aria-label="ID kiện hàng" className="rounded border border-slate-700 bg-slate-950 px-3 py-2" />
      <input required value={form.type} onChange={e => setForm(v => ({ ...v, type:e.target.value }))} placeholder="Loại ngoại lệ" aria-label="Loại ngoại lệ" className="rounded border border-slate-700 bg-slate-950 px-3 py-2" />
      <input required value={form.description} onChange={e => setForm(v => ({ ...v, description:e.target.value }))} placeholder="Mô tả sự cố" aria-label="Mô tả sự cố" className="rounded border border-slate-700 bg-slate-950 px-3 py-2" />
      <button type="submit" disabled={busy} className="rounded bg-sky-700 px-4 py-2 font-semibold disabled:opacity-50">Ghi nhận ngoại lệ</button>
    </form>
    {loading ? <p>Đang tải ngoại lệ...</p> : <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[700px] text-sm"><thead className="bg-slate-800"><tr>{["ID", "Mã vận đơn", "Loại", "Mô tả", "Trạng thái", "Thao tác"].map(x => <th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t border-slate-800"><td className="p-3">#{item.id}</td><td className="p-3">{item.shipment?.trackingCode || `Kiện #${item.shipment?.id ?? "?"}`}</td><td className="p-3">{item.exceptionType}</td><td className="p-3">{item.description}</td><td className="p-3">{item.status}</td><td className="p-3">{item.status === "open" ? <button disabled={busy} onClick={() => void resolve(item.id)} className="rounded bg-emerald-700 px-3 py-2 disabled:opacity-50">Đánh dấu xử lý</button> : (item.resolutionNote || "Đã xử lý")}</td></tr>)}{!items.length && <tr><td colSpan={6} className="p-6 text-center text-slate-400">Không có ngoại lệ.</td></tr>}</tbody></table></div>}
  </div></main>;
}
