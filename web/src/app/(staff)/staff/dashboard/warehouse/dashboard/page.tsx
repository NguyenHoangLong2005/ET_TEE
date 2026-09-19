"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, staffList } from "@/lib/staff-api";

type Inventory = { id: string; variantId: string };
type Order = { id: string; status: string };

export default function WarehouseDashboardPage() {
  const [inventory, setInventory] = useState<Inventory[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const load = useCallback(async (signal: AbortSignal) => {
    setError("");
    const results = await Promise.allSettled([
      staffList<Inventory>("/api/staff/warehouse/inventory", signal),
      staffList<Order>("/api/staff/warehouse/orders", signal),
    ]);
    if (signal.aborted) return;
    setInventory(results[0].status === "fulfilled" ? results[0].value : null);
    setOrders(results[1].status === "fulfilled" ? results[1].value : null);
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failures.length) setError(failures.map(result => errorMessage(result.reason)).join(" · "));
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load, refresh]);
  const packed = orders?.filter(order => order.status === "PACKED").length;
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-10"><div className="mx-auto max-w-6xl space-y-7">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/staff/dashboard/warehouse" className="text-xs font-bold uppercase text-orange-300">← Về bộ phận kho</Link><h1 className="mt-3 text-3xl font-bold">Tổng quan kho</h1><p className="mt-2 text-sm text-slate-400">Dữ liệu từ API; khi lỗi hiển thị dấu — thay vì số 0.</p></div><button onClick={() => setRefresh(n => n + 1)} className="rounded bg-orange-600 px-4 py-2">Tải lại</button></header>
    {error && <p role="alert" className="rounded border border-red-800 bg-red-950 p-4 text-sm text-red-200">{error}</p>}
    <section className="grid gap-4 md:grid-cols-3">{[{label:"Dòng tồn kho",value:inventory?.length},{label:"Đơn kho cần xử lý",value:orders?.length},{label:"Đơn đã đóng gói",value:packed}].map(item => <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{item.label}</p><p className="mt-3 text-3xl font-bold">{item.value ?? "—"}</p></div>)}</section>
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-bold">Luồng kho</h2><p className="mt-2 text-sm text-slate-400">Đã xác nhận → Lấy hàng → Đóng gói → Bàn giao vận chuyển. Backend hiện dùng PICKING → PACKED cho cả thao tác hoàn tất picking và packing.</p><nav className="mt-5 flex flex-wrap gap-2">{[{name:"Tổng quan",href:""},{name:"Đơn cần xử lý",href:"orders"},{name:"Nhập kho",href:"receiving"},{name:"Kiểm đếm/Kiểm kê",href:"stock-count"},{name:"Quản lý vị trí",href:"inventory"},{name:"Duyệt chênh lệch",href:"adjustments"},{name:"Giữ hàng",href:"reservations"},{name:"Lấy hàng",href:"picking"},{name:"Đóng gói",href:"packing"},{name:"Bàn giao",href:"shipments"},{name:"Đề xuất nhập thêm",href:"replenishment"}].map(item => <Link key={item.href} href={`/staff/dashboard/warehouse/${item.href}`} className="rounded border border-orange-500/40 px-3 py-2 text-sm text-orange-300 hover:bg-orange-500/10">{item.name} →</Link>)}</nav></section>
  </div></main>;
}
