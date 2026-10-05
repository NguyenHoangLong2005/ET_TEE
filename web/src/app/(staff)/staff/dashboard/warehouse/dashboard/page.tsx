"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw, Box, AlertTriangle, ArrowRight, Inbox, Clock,
  MapPin, Archive, Truck, FileBox,
} from "lucide-react";
import { toast } from "sonner";
import { staffList } from "@/lib/staff-api";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/dashboard/DashboardComponents";

type WarehouseOrder = {
  id: number;
  orderCode?: string;
  customerName?: string;
  status: string;
  total?: number;
  createdAt?: string;
};

type InventoryRow = {
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
};

// Cùng tên và thứ tự với các tab ở trang Xuất hàng; bấm vào để mở đúng tab.
const WORKFLOW = [
  { id: "CONFIRMED", label: "Chờ lấy hàng", icon: MapPin, color: "text-primary-600", bg: "bg-primary-50", border: "border-primary-200" },
  { id: "PICKING", label: "Chờ đóng gói", icon: Archive, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  { id: "PACKED", label: "Chờ bàn giao", icon: Truck, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
];

const STEP_LABEL: Record<string, string> = { CONFIRMED: "Chờ lấy hàng", PICKING: "Chờ đóng gói", PACKED: "Chờ bàn giao" };

const QUICK_ACTIONS = [
  { name: "Xuất hàng", icon: Truck, href: "/staff/dashboard/warehouse/fulfillment", color: "text-blue-600", bg: "bg-blue-50" },
  { name: "Nhập kho", icon: Inbox, href: "/staff/dashboard/warehouse/receiving", color: "text-primary-700", bg: "bg-primary-50" },
  { name: "Đề xuất nhập", icon: FileBox, href: "/staff/dashboard/warehouse/replenishment", color: "text-rose-600", bg: "bg-rose-50" },
];

export default function WarehouseDashboard() {
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [ordersFailed, setOrdersFailed] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const [invRes, ordRes] = await Promise.allSettled([
      staffList<InventoryRow>("/api/staff/warehouse/inventory"),
      staffList<WarehouseOrder>("/api/staff/warehouse/orders"),
    ]);

    if (invRes.status === "fulfilled") {
      setInventoryCount(invRes.value.length);
      // Khớp cách backend tính đề xuất nhập: khả dụng (tồn - giữ) <= ngưỡng.
      setLowStockCount(
        invRes.value.filter((i) => (i.quantityOnHand ?? 0) - (i.quantityReserved ?? 0) <= (i.reorderLevel ?? 10)).length,
      );
    } else {
      setInventoryCount(null);
      setLowStockCount(null);
      toast.error(invRes.reason instanceof Error ? invRes.reason.message : "Không thể tải tồn kho");
    }

    if (ordRes.status === "fulfilled") {
      setOrders(ordRes.value);
      setOrdersFailed(false);
    } else {
      setOrders([]);
      setOrdersFailed(true);
      toast.error(ordRes.reason instanceof Error ? ordRes.reason.message : "Không thể tải đơn hàng kho");
    }

    setLastSync(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const countOf = (status: string) => (ordersFailed ? null : orders.filter((o) => o.status === status).length);
  const show = (v: number | null) => (loading || v === null ? "—" : v);

  const orderColumns: Column<WarehouseOrder>[] = [
    {
      key: "code",
      header: "Mã đơn",
      render: (o) => <span className="font-mono font-bold text-slate-900">{o.orderCode || `#${o.id}`}</span>,
    },
    {
      key: "customer",
      header: "Khách hàng",
      render: (o) => <span className="text-sm text-slate-700">{o.customerName || "—"}</span>,
    },
    {
      key: "status",
      header: "Bước hiện tại",
      render: (o) => <StatusBadge status={o.status} label={STEP_LABEL[o.status]} />,
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (o) => (
        <span className="text-sm text-slate-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("vi-VN") : "—"}</span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader
          title="Tổng Quan Kho Hàng"
          subtitle={`Xử lý đơn hàng, xuất nhập kho & tồn kho chi nhánh • Cập nhật lúc: ${lastSync ? lastSync.toLocaleTimeString("vi-VN") : "—"}`}
          badge={<span className="bg-primary-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/staff/dashboard/warehouse/receiving">
                <Button variant="primary" size="sm" icon={<Inbox className="w-4 h-4" />}>Nhập kho mới</Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchDashboardData()}
                disabled={loading}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
              >
                Làm mới
              </Button>
            </div>
          }
        />

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Đơn đang chờ ở từng bước</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {WORKFLOW.map((step, idx) => (
              <Link
                key={step.id}
                href={`/staff/dashboard/warehouse/fulfillment?tab=${step.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition"
              >
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${step.bg} ${step.border} border-2`}>
                  <step.icon className={`w-6 h-6 ${step.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Bước {idx + 1}: {step.label}</p>
                  <p className={`text-2xl font-black font-mono ${step.color}`}>{show(countOf(step.id))}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard title="Mặt hàng trong kho" value={show(inventoryCount)} icon={Box} color="warning" subtitle="Số dòng tồn kho đang quản lý" />
          <Link href="/staff/dashboard/warehouse/replenishment" className="block">
            <StatCard
              title="Cảnh báo tồn thấp"
              value={show(lowStockCount)}
              icon={AlertTriangle}
              color={lowStockCount ? "danger" : "success"}
              subtitle={lowStockCount ? "Bấm để xem và đề xuất nhập thêm" : "Tồn kho ổn định"}
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-600" />
                Đơn cần xử lý
              </h2>
              <Link href="/staff/dashboard/warehouse/fulfillment" className="text-sm text-amber-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors">
                Xem tất cả <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <DataTable<WarehouseOrder>
              columns={orderColumns}
              data={orders.slice(0, 8)}
              rowKey={(o) => o.id}
              loading={loading}
              emptyTitle={ordersFailed ? "Không tải được đơn hàng" : "Không có đơn hàng"}
              emptyMessage={ordersFailed ? "Bấm Làm mới để thử lại." : "Hiện tại không có đơn hàng nào cần xử lý trong kho."}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-900 mb-6">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 gap-4">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all group text-center"
                >
                  <div className={`p-3 rounded-lg ${action.bg} group-hover:scale-110 transition-transform`}>
                    <action.icon className={`w-6 h-6 ${action.color}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">{action.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
