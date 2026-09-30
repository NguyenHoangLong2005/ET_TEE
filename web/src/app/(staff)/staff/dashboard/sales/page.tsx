"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
<<<<<<< HEAD
import { useEffect, useState } from "react";
import { errorMessage, staffRequest } from "@/lib/staff-api";

type SalesOrder = { id?: string; customerName?: string; status?: string; totalAmount?: number };
type Product = { id?: string; name?: string; brand?: string; variants?: { sku?: string }[] };
=======
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import {
  ShoppingCart, DollarSign, Clock, CheckCircle2,
  RefreshCw, ArrowUpRight, PackageCheck, AlertCircle, TrendingUp, Plus
} from "lucide-react";

interface OrderItem {
  id: number;
  orderCode: string;
  customerName: string;
  totalAmount: number;
  status: string;
  itemCount?: number;
  createdAt: string;
  address?: { fullName?: string };
}

const fmtMoney = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M₫`
    : v.toLocaleString("vi-VN") + "₫";
>>>>>>> main

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
};

<<<<<<< HEAD
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
=======
export default function SalesDashboardPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>("/api/staff/sales/orders");
      const list = Array.isArray(data) ? data : (data?.data ?? data?.items ?? data?.content ?? []);
      
      const mapped: OrderItem[] = list.map((o: any) => ({
        id: o.id || o.orderId,
        orderCode: o.orderCode || `#${o.id || o.orderId}`,
        customerName: o.customerName || o.address?.fullName || "Khách hàng",
        totalAmount: o.totalAmount || o.total || 0,
        status: o.status || o.orderStatus || "PENDING",
        itemCount: o.itemCount || o.items?.length,
        createdAt: o.createdAt || "",
        address: o.address,
      }));
      setOrders(mapped);
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải danh sách đơn hàng bán hàng");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const pending = orders.filter(o => ["PENDING", "PENDING_CONFIRMATION", "PENDING_PAYMENT"].includes(o.status)).length;
    const processing = orders.filter(o => ["PROCESSING", "CONFIRMED", "PICKING", "PACKED"].includes(o.status)).length;
    const delivered = orders.filter(o => ["DELIVERED", "COMPLETED"].includes(o.status)).length;
    const cancelled = orders.filter(o => ["CANCELLED", "REFUNDED"].includes(o.status)).length;
    const revenue = orders
      .filter(o => ["DELIVERED", "COMPLETED"].includes(o.status))
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return { pending, processing, delivered, cancelled, revenue };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o =>
      o.orderCode.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  const columns: Column<OrderItem>[] = [
    {
      key: 'orderCode',
      header: 'Mã Đơn',
      render: (o) => (
        <span className="font-mono font-bold text-blue-600">
          {o.orderCode}
        </span>
      )
    },
    {
      key: 'customer',
      header: 'Khách Hàng',
      render: (o) => (
        <span className="font-medium text-slate-800">
          {o.customerName}
        </span>
      )
    },
    {
      key: 'total',
      header: 'Giá Trị',
      render: (o) => (
        <span className="font-mono font-bold text-slate-900">
          {fmtMoney(o.totalAmount)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (o) => (
        <StatusBadge status={o.status} type="order" />
      )
    },
    {
      key: 'createdAt',
      header: 'Thời Gian',
      render: (o) => (
        <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
          {fmtDate(o.createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Chi Tiết',
      align: 'right',
      render: (o) => (
        <Link
          href={`/staff/dashboard/sales/orders`}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
        >
          <span>Xử lý</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      )
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50/60 p-6 md:p-8 text-slate-900 font-sans antialiased space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tổng Quan Bán Hàng (Sales Hub)"
        subtitle="Theo dõi chỉ số kinh doanh, quản lý và xử lý đơn hàng Online & POS"
        badge={<span className="bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">BÁN HÀNG</span>}
        breadcrumbs={[
          { label: 'Staff Hub', href: '/staff/dashboard' },
          { label: 'Bán hàng', href: '/staff/dashboard/sales' },
          { label: 'Tổng quan' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/staff/dashboard/sales/orders">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4" />
                <span>Xem tất cả đơn hàng</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chờ xác nhận"
          value={stats.pending}
          icon={AlertCircle}
          color="warning"
          subtitle="Cần xử lý ngay"
        />
        <StatCard
          title="Đang đóng gói / xử lý"
          value={stats.processing}
          icon={Clock}
          color="blue"
          subtitle="Đang chuẩn bị hàng"
        />
        <StatCard
          title="Giao thành công"
          value={stats.delivered}
          icon={CheckCircle2}
          color="success"
          subtitle="Đã hoàn thành"
        />
        <StatCard
          title="Doanh thu hoàn tất"
          value={fmtMoney(stats.revenue)}
          icon={DollarSign}
          color="purple"
          subtitle="Từ các đơn hoàn tất"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/staff/dashboard/sales/orders", icon: ShoppingCart, label: "Tất cả đơn hàng", sub: "Xem danh sách và xử lý", accent: "bg-blue-50 text-blue-700" },
          { href: "/staff/dashboard/sales/orders", icon: AlertCircle, label: "Đơn chờ xác nhận", sub: "Cần gọi điện xác minh", accent: "bg-amber-50 text-amber-700" },
          { href: "/staff/dashboard/sales/orders", icon: PackageCheck, label: "Đang đóng gói", sub: "Chuẩn bị giao bưu tá", accent: "bg-indigo-50 text-indigo-700" },
          { href: "/staff/support", icon: Plus, label: "CSKH & Hỗ trợ", sub: "Tra cứu & đền bù", accent: "bg-emerald-50 text-emerald-700" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all group shadow-2xs block"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${item.accent}`}>
              <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs font-bold text-slate-900">{item.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
          </Link>
        ))}
      </div>

      {/* Main Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>Đơn hàng gần đây</span>
          </h2>
          <Link
            href="/staff/dashboard/sales/orders"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
          >
            <span>Quản lý toàn bộ đơn hàng</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable<OrderItem>
          columns={columns}
          data={filteredOrders}
          loading={loading}
          rowKey={(o) => o.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm kiếm theo mã đơn hoặc tên khách hàng..."
          emptyTitle="Chưa có đơn hàng nào"
          emptyMessage="Tất cả đơn hàng mới đã được xử lý hoặc chưa phát sinh đơn mới."
        />
      </div>
    </main>
  );
>>>>>>> main
}
