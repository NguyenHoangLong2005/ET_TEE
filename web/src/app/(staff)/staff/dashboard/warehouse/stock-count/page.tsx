"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { errorMessage, staffList, staffAction } from "@/lib/staff-api";

type Stocktake = {
  id: number;
  warehouseLocation: string;
  actualQuantity: number;
  status: string;
};

export default function WarehouseStockCountPage() {
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState("MAIN");

  const loadStocktakes = async () => {
    try {
      const data = await staffList<Stocktake>("/api/staff/warehouse/stocktakes");
      setStocktakes(data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadStocktakes(); }, []);

  const createStocktake = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await staffAction("/api/staff/warehouse/stocktakes", "POST", { warehouseLocation: location });
      await loadStocktakes();
    } catch (cause) {
      alert(errorMessage(cause));
    }
  };

  const recordCount = async (id: number) => {
    const input = window.prompt("Nhập số lượng kiểm đếm thực tế:");
    if (!input) return;
    try {
      await staffAction(`/api/staff/warehouse/stocktakes/${id}`, "PUT", { actualQuantity: Number(input) });
      await loadStocktakes();
    } catch (cause) {
      alert(errorMessage(cause));
    }
  };

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
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>
        <h1 className="text-3xl font-black text-white mt-3">Kiểm kê kho</h1>

        {error && <p className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        {loading && <p className="text-sm text-slate-400">Đang tải phiếu kiểm kê...</p>}

        <form onSubmit={createStocktake} className="flex flex-wrap gap-3 rounded-xl border-slate-800 bg-slate-900 p-5">
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Vị trí kho (vd: MAIN)" className="flex-1 rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Tạo phiếu kiểm kê</button>
        </form>

        <div className="space-y-3">
          {stocktakes.map((stocktake) => (
            <article key={stocktake.id} className="flex items-center justify-between gap-4 rounded-xl border-slate-800 bg-slate-900 p-5">
              <div>
                <p className="font-semibold text-white">Phiếu #{stocktake.id} · {stocktake.warehouseLocation ?? "-"}</p>
                <p className="mt-1 text-xs text-slate-400">Thực tế: {stocktake.actualQuantity ?? "chưa ghi nhận"} · Trạng thái: {stocktake.status}</p>
              </div>
              <button onClick={() => recordCount(stocktake.id)} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Ghi nhận kiểm đếm</button>
            </article>
          ))}
          {stocktakes.length === 0 && !loading && <p className="rounded-xl border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Chưa có phiếu kiểm kê nào.</p>}
        </div>
      </div>
    </main>
  );
}
