"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";

type Inventory = {
  id: number;
  productId: number;
  productName: string;
  warehouseLocation: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
};

export default function WarehouseInventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError(""); setLoading(true);
    try { setItems(await staffList<Inventory>("/api/staff/warehouse/inventory", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const updateLocation = async (item: Inventory) => {
    const location = window.prompt("Vị trí kho mới:", item.warehouseLocation || "");
    if (location === null || !location.trim()) return;
    setBusy(item.id); setNotice(""); setError("");
    try {
      await staffAction(`/api/staff/warehouse/inventory/${item.id}/location`, "PUT", { location: location.trim() });
      setNotice(`Đã cập nhật vị trí cho ${item.productName}.`);
      await load();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  };
  const requestAdjustment = async (item: Inventory) => {
    const raw = window.prompt(`Chênh lệch cần điều chỉnh cho ${item.productName} (ví dụ -2 hoặc 5):`);
    if (raw === null) return;
    const difference = Number(raw);
    if (!raw.trim() || !Number.isInteger(difference) || difference === 0) { setError("Chênh lệch phải là số nguyên khác 0."); return; }
    const reason = window.prompt("Lý do điều chỉnh (bắt buộc):");
    if (reason === null) return;
    if (!reason.trim()) { setError("Vui lòng nhập lý do."); return; }
    setBusy(item.id); setNotice(""); setError("");
    try {
      // User identity must come from backend authentication when implemented.
      await staffAction(`/api/staff/warehouse/inventory/${item.id}/adjustments`, "POST", {
        difference, reason: reason.trim(), requestedBy: null,
      });
      setNotice("Đã gửi yêu cầu điều chỉnh; tồn kho chỉ thay đổi sau khi được duyệt.");
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/staff/dashboard/warehouse" className="text-sm text-orange-300">← Về trang kho</Link>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold text-white">Tồn kho và vị trí hàng</h1><p className="mt-2 text-sm text-slate-400">Dữ liệu từ kho, không phải số liệu minh họa.</p></div>
          <button type="button" onClick={() => void load()} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Làm mới</button>
        </header>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>
        {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-200">{notice}</p>}
        {loading ? <p role="status">Đang tải tồn kho...</p> : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-slate-800 text-left text-slate-300"><tr>{["Sản phẩm / ID", "Vị trí", "Tồn thực tế", "Đã giữ", "Khả dụng", "Mức nhập lại", "Thao tác"].map((label) => <th scope="col" key={label} className="p-3">{label}</th>)}</tr></thead>
              <tbody>
                {items.map((item) => <tr key={item.id} className="border-t border-slate-800 align-top">
                  <td className="p-3 font-medium">{item.productName}<div className="text-xs text-slate-500">SP #{item.productId} · tồn #{item.id}</div></td>
                  <td className="p-3">{item.warehouseLocation || "Chưa gán"}</td>
                  <td className="p-3">{item.quantityOnHand}</td>
                  <td className="p-3">{item.quantityReserved}</td>
                  <td className="p-3">{item.quantityOnHand - item.quantityReserved}</td>
                  <td className="p-3">{item.reorderLevel}</td>
                  <td className="space-x-2 p-3"><button disabled={busy === item.id} onClick={() => void updateLocation(item)} className="rounded bg-sky-700 px-3 py-1.5 text-xs disabled:opacity-50">Sửa vị trí</button><button disabled={busy === item.id} onClick={() => void requestAdjustment(item)} className="rounded bg-orange-700 px-3 py-1.5 text-xs disabled:opacity-50">Đề nghị điều chỉnh</button></td>
                </tr>)}
                {items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Chưa có dữ liệu tồn kho.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
