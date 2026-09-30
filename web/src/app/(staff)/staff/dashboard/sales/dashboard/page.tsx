"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
<<<<<<< HEAD
import { useEffect, useState } from "react";
import { errorMessage, staffList } from "@/lib/staff-api";

interface Order {
  id?: string; status: string;
}

const NEW_STATUSES = ["pending_payment", "pending_confirmation"];
const DONE_STATUSES = ["delivered", "returned", "refunded"];
=======
import {
  ShoppingCart, Clock, CheckCircle2, XCircle, RefreshCw, ArrowRight,
  ChevronRight, PackageCheck, RotateCcw, Truck, AlertTriangle,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-config";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/dashboard/DashboardComponents";
import DataTable, { Column } from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";

interface Order {
  id: string | number;
  orderCode?: string;
  code?: string;
  status: string;
  customerName?: string;
  totalAmount?: number;
  createdAt?: string;
}

const NEW_STATUSES  = ["PENDING_PAYMENT", "PENDING_CONFIRMATION", "PENDING"];
const DONE_STATUSES = ["DELIVERED", "RETURNED", "REFUNDED"];
>>>>>>> main

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING:              "Chờ xử lý",
  PENDING_PAYMENT:      "Chờ thanh toán",
  PENDING_CONFIRMATION: "Chờ xác nhận",
  CONFIRMED:            "Đã xác nhận",
  PROCESSING:           "Đang xử lý",
  PICKING:              "Đang lấy hàng",
  PACKED:               "Đã đóng gói",
  SHIPPED:              "Đang giao",
  DELIVERED:            "Hoàn thành",
  CANCELLED:            "Đã hủy",
  RETURNED:             "Hoàn hàng",
  REFUNDED:             "Hoàn tiền",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  PENDING: "warning", PENDING_PAYMENT: "warning", PENDING_CONFIRMATION: "warning",
  CONFIRMED: "info", PROCESSING: "info", PICKING: "info", PACKED: "info",
  SHIPPED: "info", DELIVERED: "success",
  CANCELLED: "danger", RETURNED: "danger", REFUNDED: "danger",
};

const QUICK_ACTIONS = [
  { label: "Xử lý đơn",    icon: ShoppingCart,  href: "/staff/dashboard/sales/orders",   bg: "bg-blue-50",   iconColor: "text-blue-600"    },
  { label: "Xác nhận",     icon: CheckCircle2,  href: "/staff/dashboard/sales/orders",   bg: "bg-emerald-50",iconColor: "text-emerald-600" },
  { label: "Đang giao",    icon: Truck,         href: "/staff/dashboard/shipping",       bg: "bg-sky-50",    iconColor: "text-sky-600"     },
  { label: "Hoàn hàng",    icon: RotateCcw,     href: "/staff/dashboard/sales/returns",  bg: "bg-amber-50",  iconColor: "text-amber-600"   },
  { label: "Giao thành công",icon: PackageCheck, href: "/staff/dashboard/sales/delivered",bg: "bg-violet-50", iconColor: "text-violet-600"  },
  { label: "Ngoại lệ",     icon: AlertTriangle, href: "/staff/dashboard/shipping/exceptions",bg:"bg-rose-50",iconColor: "text-rose-600"   },
];

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return s; }
};

const fmtCurrency = (v?: number) =>
  typeof v === "number" ? v.toLocaleString("vi-VN") + " ₫" : "—";

export default function SalesDashboardPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/staff/sales/orders`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      const result = Array.isArray(payload)
        ? payload
        : payload !== null && typeof payload === "object" && "data" in payload
          ? (payload as { data: unknown }).data
          : null;
      setOrders(Array.isArray(result) ? (result as Order[]) : []);
    } catch {
      setOrders([]);
<<<<<<< HEAD
      try {
        const result = await staffList<Order>("/api/staff/sales/orders");
        if (!controller.signal.aborted) {
          setOrders(result);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          errorMessage(cause)
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadOrders();
    return () => controller.abort();
  }, [refreshKey]);

  const newOrders = orders.filter((order) => NEW_STATUSES.includes(order.status)).length;
  const confirmed = orders.filter((order) => order.status === "confirmed").length;
  const processing = orders.filter((order) => !NEW_STATUSES.includes(order.status) && order.status !== "confirmed" && order.status !== "cancelled" && !DONE_STATUSES.includes(order.status)).length;
  const cancelled = orders.filter((order) => order.status === "cancelled").length;
  const showValue = (value: number) => (loading || error ? "—" : value);

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard bán hàng</h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/sales/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/sales/orders">Đơn cần xử lý</Link>
        </nav>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{loading ? "Đang tải..." : "Tải lại"}</button>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4 text-sm text-red-200">
          <p className="font-semibold">Không thể tải số liệu bán hàng</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2">Kiểm tra /api/staff/sales/orders cùng host với Next.js và log Spring Boot.</p>
=======
    } finally {
      setLoading(false);
      setLastSync(new Date());
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  /* ─── KPI derivations ─── */
  const newOrders   = orders.filter((o) => NEW_STATUSES.includes(o.status)).length;
  const confirmed   = orders.filter((o) => o.status === "CONFIRMED").length;
  const processing  = orders.filter(
    (o) => !NEW_STATUSES.includes(o.status) && o.status !== "CONFIRMED" &&
           o.status !== "CANCELLED" && !DONE_STATUSES.includes(o.status)
  ).length;
  const cancelled   = orders.filter((o) => o.status === "CANCELLED").length;

  const urgentCount = newOrders + confirmed;

  /* ─── Table columns ─── */
  const columns: Column<Order>[] = [
    {
      key: "orderCode",
      header: "Mã đơn",
      render: (o) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          {o.orderCode || o.code || `#${o.id}`}
        </span>
      ),
    },
    {
      key: "customerName",
      header: "Khách hàng",
      render: (o) => (
        <span className="text-slate-700">{o.customerName || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (o) => (
        <StatusBadge
          tone={STATUS_TONE[o.status] ?? "neutral"}
          label={ORDER_STATUS_LABEL[o.status] ?? o.status}
        />
      ),
    },
    {
      key: "totalAmount",
      header: "Giá trị",
      align: "right",
      render: (o) => (
        <span className="font-mono text-slate-900 font-semibold text-sm">{fmtCurrency(o.totalAmount)}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Thời gian",
      align: "right",
      render: (o) => (
        <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">{fmtDate(o.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (o) => (
        <Link
          href={`/staff/dashboard/sales/orders/${o.id}`}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white transition-all"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-800">

      {/* ─── Header ─── */}
      <PageHeader
        title="Bảng Điều Khiển Bán Hàng"
        subtitle={`Tổng quan xử lý đơn hàng tại chi nhánh${lastSync ? ` · Cập nhật lúc ${lastSync.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
        badge={<span className="bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">BÁN HÀNG</span>}
        breadcrumbs={[
          { label: "Staff Hub", href: "/staff/dashboard" },
          { label: "Bán hàng",  href: "/staff/dashboard/sales" },
          { label: "Dashboard" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/staff/dashboard/sales/orders">
              <Button variant="primary" size="sm" icon={<ShoppingCart className="w-4 h-4" />}>
                Xử lý đơn hàng
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={loadOrders}
              disabled={loading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            >
              Tải lại
            </Button>
          </div>
        }
      />

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Tổng đơn hàng"
          value={loading ? "—" : orders.length}
          icon={ShoppingCart}
          color="slate"
          subtitle="Tổng số đơn trong hệ thống"
        />
        <StatCard
          title="Chờ xác nhận"
          value={loading ? "—" : newOrders}
          icon={Clock}
          color={newOrders > 0 ? "warning" : "success"}
          subtitle="Cần xử lý ngay"
        />
        <StatCard
          title="Đã xác nhận"
          value={loading ? "—" : confirmed}
          icon={CheckCircle2}
          color="info"
          subtitle="Đang chờ kho xử lý"
        />
        <StatCard
          title="Đang xử lý"
          value={loading ? "—" : processing}
          icon={Truck}
          color="blue"
          subtitle="Picking / Packing / Giao"
        />
        <StatCard
          title="Đã hủy"
          value={loading ? "—" : cancelled}
          icon={XCircle}
          color={cancelled > 0 ? "danger" : "success"}
          subtitle="Đơn bị hủy hôm nay"
        />
      </div>

      {/* ─── Alert banner nếu có đơn cần xử lý ─── */}
      {!loading && urgentCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">
                {urgentCount} đơn hàng đang chờ xử lý
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {newOrders > 0 && `${newOrders} đơn mới`}{newOrders > 0 && confirmed > 0 && " · "}{confirmed > 0 && `${confirmed} đơn đã xác nhận chờ kho`}
              </p>
            </div>
          </div>
          <Link href="/staff/dashboard/sales/orders">
            <Button size="sm" variant="primary" icon={<ArrowRight className="w-3.5 h-3.5" />}>
              Xử lý ngay
            </Button>
          </Link>
>>>>>>> main
        </div>
      )}

      {/* ─── Main 2-col Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Orders table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Đơn hàng gần đây
            </h3>
            <Link href="/staff/dashboard/sales/orders" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <DataTable<Order>
            columns={columns}
            data={orders.slice(0, 10)}
            loading={loading}
            rowKey={(o, idx) => o.id || idx}
            emptyTitle="Chưa có đơn hàng"
            emptyMessage="Đơn hàng mới sẽ xuất hiện tại đây khi phát sinh."
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-900 mb-5">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 gap-3 flex-1">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-all group text-center"
              >
                <div className={`p-3 rounded-xl ${action.bg} group-hover:scale-110 transition-transform`}>
                  <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-slate-700 leading-tight">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
<<<<<<< HEAD

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
=======
>>>>>>> main
