"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
const API_URL = "";

type Product = { id?: number; name?: string; brand?: string; variants?: { sku?: string }[] };

export default function StaffWarehousePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [pendingOrders, setPendingOrders] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`${API_URL}/api/staff/products`, { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.message ?? "Không thể tải dữ liệu kho."); setProducts(payload.data ?? []); }).catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Không thể kết nối backend.")); fetch(`${API_URL}/api/staff/warehouse/inventory`, { cache: "no-store" }).then(async (response) => { const payload = await response.json(); const rows = Array.isArray(payload) ? payload : payload.data ?? []; setInventoryCount(rows.length); }).catch(() => setInventoryCount(null)); fetch(`${API_URL}/api/staff/warehouse/orders`, { cache: "no-store" }).then(async (response) => { const payload = await response.json(); const rows = Array.isArray(payload) ? payload : payload.data ?? []; setPendingOrders(rows.length); }).catch(() => setPendingOrders(null)); }, []);
  const links = ["dashboard", "inventory", "orders", "packing", "picking", "receiving", "shipments", "stock-count", "reservations", "adjustments", "replenishment"];
  const tasks = ["Nhập kho", "Kiểm đếm", "Quản lý vị trí hàng", "Điều chỉnh chênh lệch có phê duyệt", "Giữ hàng cho đơn", "Picking", "Packing", "In tem", "Bàn giao hãng vận chuyển", "Kiểm kê", "Đề xuất nhập thêm"];
  return <main className="min-h-screen bg-[#15100f] px-5 py-8 text-slate-100 md:px-10">
    <div className="mx-auto max-w-7xl space-y-8">
      
      <header className="relative overflow-hidden rounded-3xl border border-orange-300/20 bg-gradient-to-br from-orange-400/15 via-stone-900 to-[#15100f] p-7 md:p-10">
      <div className="relative z-10">
        <div className="flex justify-end">
          <Link href="/staff/dashboard" className="rounded-lg bg-orange-300/10 px-4 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-300/20">Ve trang tong quan</Link>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-300" >ET.TEE / KHU VỰC KHO</p>
  
        <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-white md:text-6xl">Vận hành kho hàng</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300">Quản lý hàng hóa từ lúc nhập kho, kiểm đếm, lấy hàng đến khi đóng kiện và bàn giao.</p>
        <nav className="mt-7 flex flex-wrap gap-3">{links.map((item) => <Link key={item} href={`/staff/dashboard/warehouse/${item}`} className="border border-orange-300/30 bg-orange-300/10 px-4 py-2.5 text-sm font-semibold text-orange-200 transition hover:bg-orange-300/20">{warehouseLabel(item)}</Link>)}</nav></div></header><section className="grid gap-4 md:grid-cols-3"><Stat label="Sản phẩm đang quản lý" value={String(products.length)} note="Dữ liệu trực tiếp" /><Stat label="Mã hàng" value={String(products.reduce((total, product) => total + (product.variants?.length ?? 0), 0))} note="Theo biến thể sản phẩm" /><Stat label="Dòng tồn kho" value={inventoryCount === null ? "Chưa có dữ liệu" : String(inventoryCount)} note="Theo inventory" /><Stat label="Đơn kho cần xử lý" value={pendingOrders === null ? "Chưa có dữ liệu" : String(pendingOrders)} note="confirmed / picking / packed" /></section><section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6"><h2 className="text-xl font-bold text-white">Việc cần xử lý</h2><div className="mt-5 grid gap-3 md:grid-cols-3">{tasks.map((task, index) => <div key={task} className="rounded-xl border border-slate-800 bg-[#211713] p-4"><span className="text-xs font-bold text-orange-300">{String(index + 1).padStart(2, "0")}</span><p className="mt-3 text-sm font-semibold text-slate-200">{task}</p><p className="mt-2 text-xs text-slate-600">Mở chức năng tương ứng trên menu</p></div>)}</div></section>{error && <p className="rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">{error}</p>}<section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6"><div className="flex flex-col gap-2 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between"><div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Danh mục sản phẩm</p><h2 className="mt-2 text-xl font-bold text-white">Thông tin từ hệ thống</h2></div><p className="text-xs text-slate-500">{products.length} sản phẩm đang hiển thị</p></div><div className="mt-5 grid gap-3 md:grid-cols-2">{products.map((product) => <article key={product.id ?? product.name} className="rounded-xl border border-slate-800 bg-[#211713] p-5 transition hover:border-orange-300/40"><p className="text-xs text-slate-500">Mã sản phẩm {product.id ?? "-"} · {product.brand ?? "Chưa có thương hiệu"}</p><h2 className="mt-2 font-bold text-white">{product.name ?? "Sản phẩm chưa đặt tên"}</h2><p className="mt-3 text-xs text-slate-500">Mã hàng: {(product.variants ?? []).map((variant) => variant.sku).filter(Boolean).join(", ") || "Chưa có mã hàng"}</p></article>)}</div></section></div></main>;
}

function warehouseLabel(item: string) {
  const labels: Record<string, string> = { dashboard: "Tổng quan", inventory: "Tồn kho", orders: "Đơn cần xử lý", packing: "Đóng gói", picking: "Lấy hàng", receiving: "Nhập kho", shipments: "Bàn giao", "stock-count": "Kiểm kê", reservations: "Giữ hàng", adjustments: "Duyệt chênh lệch", replenishment: "Đề xuất nhập thêm" };
  return labels[item] ?? item;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-3 text-xl font-black text-white">{value}</p><p className="mt-2 text-xs text-orange-300">{note}</p></div>;
}