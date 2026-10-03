"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
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

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
};

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
}
