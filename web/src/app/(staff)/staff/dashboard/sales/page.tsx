"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage, staffRequest } from "@/lib/staff-api";

type SalesOrder = { id?: string; customerName?: string; status?: string; totalAmount?: number };
type Product = { id?: string; name?: string; brand?: string; variants?: { sku?: string }[] };

export default function StaffSalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    staffRequest<Product[]>("/api/staff/products")
      .then((data) => setProducts(data ?? []))
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

  return <StaffRolePage title="Bán hàng" eyebrow="KHU VỰC BÁN HÀNG" description="Kiểm tra đơn mới, xác minh thông tin nhận hàng, xác nhận hoặc hủy đơn, ghi chú xử lý, tạo yêu cầu giữ hàng, theo dõi SLA đơn hàng." links={["/staff/dashboard/sales/dashboard", "/staff/dashboard/sales/orders"]} products={products} error={error} />;
}

function StaffRolePage({ title, eyebrow, description, links, products, error }: { title: string; eyebrow: string; description: string; links: string[]; products: Product[]; error: string }) {
  const tasks = ["Kiểm tra đơn mới", "Xác minh thông tin nhận hàng", "Xác nhận hoặc hủy đơn", "Ghi chú xử lý", "Tạo yêu cầu giữ hàng", "Theo dõi SLA đơn hàng"];
  return <main className="min-h-screen bg-[#111313] px-5 py-8 text-stone-100 md:px-10">
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-400/15 via-stone-900 to-[#111313] p-7 md:p-10">
        <div className="relative z-10 flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">ET.TEE / {eyebrow}</p>
            <Link href="/staff/dashboard" className="rounded-lg bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-300/20">Về trang tổng quan</Link>
          </div>
          <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-white md:text-6xl">Trung tâm {title.toLowerCase()}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300">{description}</p>
          <nav className="mt-7 flex flex-wrap gap-3">{links.map((link) => (
            <Link key={link} href={link} className="border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/20">{link.endsWith("dashboard") || link.endsWith("sales") ? "Tổng quan" : "Đơn cần xử lý"}</Link>
          ))}</nav>
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Sản phẩm đang quản lý" value={String(products.length)} note="Dữ liệu trực tiếp" />
        <Stat label="Tình trạng kết nối" value={error ? "Lỗi kết nối" : "Đã kết nối"} note={error ? "Cần kiểm tra máy chủ" : "Hệ thống đang phản hồi"} />
        <Stat label="Đơn hàng" value="Chưa có dữ liệu" note="Đang chờ kết nối API" />
      </section>
      <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
        <h2 className="text-xl font-bold text-white">Việc cần xử lý</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">{tasks.map((task, index) => (
          <div key={task} className="rounded-xl border border-stone-800 bg-[#151716] p-4">
            <span className="text-xs font-bold text-amber-300">0{index + 1}</span>
            <p className="mt-3 text-sm font-semibold text-stone-200">{task}</p>
            <p className="mt-2 text-xs text-stone-600">Mở chức năng tương ứng trên menu</p>
          </div>
        ))}</div>
      </section>
      {error && <p className="mt-4 border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
        <div className="flex flex-col gap-2 border-b border-stone-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Danh mục sản phẩm</p>
            <h2 className="mt-2 text-xl font-bold text-white">Thông tin từ hệ thống</h2>
          </div>
          <p className="text-xs text-stone-500">{products.length} sản phẩm đang hiển thị</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">{products.map((product) => (
          <article key={product.id ?? product.name} className="rounded-xl border border-stone-800 bg-[#151716] p-5 transition hover:border-amber-300/40">
            <p className="text-xs text-stone-500">Mã sản phẩm {product.id ?? "-"} · {product.brand ?? "Chưa có thương hiệu"}</p>
            <h2 className="mt-2 font-bold text-white">{product.name ?? "Sản phẩm chưa đặt tên"}</h2>
            <p className="mt-3 text-xs text-stone-500">Mã hàng: {(product.variants ?? []).map((variant) => variant.sku).filter(Boolean).join(", ") || "Chưa có mã hàng"}</p>
          </article>
        ))}</div>
      </section>
    </div>
  </main>;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5"><p className="text-xs text-stone-500">{label}</p><p className="mt-3 text-xl font-black text-white">{value}</p><p className="mt-2 text-xs text-amber-300">{note}</p></div>;
}
