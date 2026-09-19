"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";

type Adjustment = {
  id: number;
  inventory: { id: number; productName: string };
  difference: number;
  reason: string;
  status: string;
  requestedBy: number | null;
  approvedBy: number | null;
};

export default function WarehouseAdjustmentsPage() {
  const [items, setItems] = useState<Adjustment[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError(""); setLoading(true);
    try { setItems(await staffList<Adjustment>("/api/staff/warehouse/adjustments", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const approve = async (item: Adjustment) => {
    const raw = window.prompt("ID người phê duyệt (demo: nhập ID hợp lệ; hệ thống chưa xác thực quyền):");
    if (raw === null) return;
    const approvedBy = Number(raw);
    if (!Number.isSafeInteger(approvedBy) || approvedBy <= 0) { setError("ID phê duyệt phải là số nguyên dương."); return; }
    if (!window.confirm(`Xác nhận duyệt chênh lệch ${item.difference} cho ${item.inventory?.productName ?? item.inventory?.id}?`)) return;
    setBusy(item.id); setError(""); setNotice("");
    try {
      await staffAction(`/api/staff/warehouse/adjustments/${item.id}/approve`, "POST", { approvedBy });
      setNotice(`Đã duyệt phiếu #${item.id}.`); await load();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  };
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10"><div className="mx-auto max-w-6xl space-y-6">
    <Link href="/staff/dashboard/warehouse" className="text-sm text-orange-300">← Bộ phận kho</Link>
    <nav className="flex flex-wrap gap-2 text-sm mt-3">
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
      <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
    </nav>
    <div className="flex items-center justify-between gap-3"><h1 className="text-3xl font-bold">Phiếu điều chỉnh tồn kho</h1><button onClick={() => void load()} className="rounded bg-orange-600 px-4 py-2">Làm mới</button></div>
    <p className="text-sm text-amber-200">Lưu ý: nhập ID trong bản demo không thay cho đăng nhập/phân quyền. Chỉ cấp quyền duyệt trên backend sau khi triển khai xác thực.</p>
    {error && <p role="alert" className="rounded border border-red-700 bg-red-950 p-3">{error}</p>}{notice && <p role="status" className="rounded border border-emerald-700 bg-emerald-950 p-3">{notice}</p>}
    {loading ? <p>Đang tải phiếu...</p> : <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[700px] text-sm"><thead className="bg-slate-800"><tr>{["Phiếu", "Sản phẩm", "Chênh lệch", "Lý do", "Trạng thái", "Thao tác"].map(x => <th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t border-slate-800"><td className="p-3">#{item.id}</td><td className="p-3">{item.inventory?.productName ?? `Tồn #${item.inventory?.id}`}</td><td className="p-3">{item.difference}</td><td className="p-3">{item.reason}</td><td className="p-3">{item.status}</td><td className="p-3">{item.status === "PENDING" ? <button disabled={busy !== null} onClick={() => void approve(item)} className="rounded bg-emerald-700 px-3 py-2 disabled:opacity-50">Duyệt</button> : "Đã xử lý"}</td></tr>)}{!items.length && <tr><td colSpan={6} className="p-5 text-center text-slate-400">Chưa có phiếu điều chỉnh.</td></tr>}</tbody></table></div>}
  </div></main>;
}
