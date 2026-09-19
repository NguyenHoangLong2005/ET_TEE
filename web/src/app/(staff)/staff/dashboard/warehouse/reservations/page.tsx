"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";

type Reservation = {
  id: string;
  order?: { id?: string; orderId?: string; orderCode?: string };
  productId: string;
  quantity: number;
  status: string;
};
export default function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError(""); setLoading(true);
    try { setItems(await staffList<Reservation>("/api/staff/warehouse/reservations", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const act = async (item: Reservation, action: "approve" | "reject") => {
    let reason: string | undefined;
    if (action === "reject") {
      const entered = window.prompt("Lý do từ chối giữ hàng:");
      if (entered === null) return;
      if (!entered.trim()) { setError("Cần nhập lý do từ chối."); return; }
      reason = entered.trim();
    } else if (!window.confirm(`Xác nhận giữ ${item.quantity} sản phẩm ${item.productId}?`)) return;
    setBusy(item.id); setError(""); setNotice("");
    try {
      await staffAction(`/api/staff/warehouse/reservations/${item.id}/${action}`, "POST", reason === undefined ? undefined : { reason });
      setNotice(action === "approve" ? "Đã duyệt giữ hàng." : "Đã từ chối yêu cầu."); await load();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  };
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10"><div className="mx-auto max-w-6xl space-y-6"><Link href="/staff/dashboard/warehouse" className="text-sm text-orange-300">← Bộ phận kho</Link><nav className="flex flex-wrap gap-2 text-sm mt-3"><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link><Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link></nav><div className="flex justify-between gap-3"><h1 className="text-3xl font-bold">Duyệt yêu cầu giữ hàng</h1><button onClick={() => void load()} className="rounded bg-orange-600 px-4 py-2">Làm mới</button></div>{error && <p role="alert" className="rounded bg-red-950 p-3 text-red-200">{error}</p>}{notice && <p role="status" className="rounded bg-emerald-950 p-3 text-emerald-200">{notice}</p>}{loading ? <p>Đang tải yêu cầu...</p> : <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[690px] text-sm"><thead className="bg-slate-800"><tr>{["Yêu cầu", "Đơn hàng", "Sản phẩm", "Số lượng", "Trạng thái", "Thao tác"].map(x => <th key={x} className="p-3 text-left">{x}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t border-slate-800"><td className="p-3">#{item.id}</td><td className="p-3">{item.order?.orderCode ?? `#${item.order?.id ?? item.order?.orderId ?? "?"}`}</td><td className="p-3">#{item.productId}</td><td className="p-3">{item.quantity}</td><td className="p-3">{item.status}</td><td className="space-x-2 p-3"><button disabled={busy !== null} onClick={() => void act(item, "approve")} className="rounded bg-emerald-700 px-3 py-2 disabled:opacity-50">Duyệt</button><button disabled={busy !== null} onClick={() => void act(item, "reject")} className="rounded bg-red-700 px-3 py-2 disabled:opacity-50">Từ chối</button></td></tr>)}{!items.length && <tr><td colSpan={6} className="p-5 text-center text-slate-400">Không có yêu cầu đang chờ.</td></tr>}</tbody></table></div>}</div></main>;
}
