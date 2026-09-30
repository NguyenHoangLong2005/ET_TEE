"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import {
  Package,
  RefreshCw,
  Box,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Inbox,
  Clock,
  ClipboardCheck,
  MapPin,
  CheckCircle2,
  Archive,
  Truck,
  FileBox
} from "lucide-react";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/dashboard/DashboardComponents";

<<<<<<< HEAD
type Inventory = { id: string; variantId: string };
type Order = { orderId: number; id?: string; status: string };

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
  const packed = orders?.filter(order => order.status === "packed").length;
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-10"><div className="mx-auto max-w-6xl space-y-7">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/staff/dashboard/warehouse" className="text-xs font-bold uppercase text-orange-300">← Về bộ phận kho</Link><h1 className="mt-3 text-3xl font-bold">Tổng quan kho</h1><p className="mt-2 text-sm text-slate-400">Dữ liệu từ API; khi lỗi hiển thị dấu — thay vì số 0.</p></div><button onClick={() => setRefresh(n => n + 1)} className="rounded bg-orange-600 px-4 py-2">Tải lại</button></header>
    {error && <p role="alert" className="rounded border border-red-800 bg-red-950 p-4 text-sm text-red-200">{error}</p>}
    <section className="grid gap-4 md:grid-cols-3">{[{label:"Dòng tồn kho",value:inventory?.length},{label:"Đơn kho cần xử lý",value:orders?.length},{label:"Đơn đã đóng gói",value:packed}].map(item => <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{item.label}</p><p className="mt-3 text-3xl font-bold">{item.value ?? "—"}</p></div>)}</section>
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-bold">Luồng kho</h2><p className="mt-2 text-sm text-slate-400">Đã xác nhận → Lấy hàng → Đóng gói → Bàn giao vận chuyển. Backend hiện dùng PICKING → PACKED cho cả thao tác hoàn tất picking và packing.</p><nav className="mt-5 flex flex-wrap gap-2">{[{name:"Tổng quan",href:""},{name:"Đơn cần xử lý",href:"orders"},{name:"Nhập kho",href:"receiving"},{name:"Kiểm đếm/Kiểm kê",href:"stock-count"},{name:"Quản lý vị trí",href:"inventory"},{name:"Duyệt chênh lệch",href:"adjustments"},{name:"Giữ hàng",href:"reservations"},{name:"Lấy hàng",href:"picking"},{name:"Đóng gói",href:"packing"},{name:"Bàn giao",href:"shipments"},{name:"Đề xuất nhập thêm",href:"replenishment"}].map(item => <Link key={item.href} href={`/staff/dashboard/warehouse/${item.href}`} className="rounded border border-orange-500/40 px-3 py-2 text-sm text-orange-300 hover:bg-orange-500/10">{item.name} →</Link>)}</nav></section>
  </div></main>;
=======
interface Order {
  id: string;
  code: string;
  status: string;
  assignedPicker: string | null;
  createdAt: string;
>>>>>>> main
}

interface InventoryResponse {
  totalElements: number;
  content: any[];
}

interface OrderResponse {
  totalElements: number;
  content: Order[];
}

export default function WarehouseDashboard() {
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Data state
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number | null>(null);
  const [packedOrdersCount, setPackedOrdersCount] = useState<number | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, ordRes] = await Promise.allSettled([
        apiClient.get<any>('/api/staff/warehouse/inventory?page=0&size=1'),
        apiClient.get<any>('/api/staff/warehouse/orders?page=0&size=50'),
      ]);

      if (invRes.status === 'fulfilled' && invRes.value) {
        const invData = invRes.value;
        const count = invData?.totalElements ?? (Array.isArray(invData) ? invData.length : null);
        setInventoryCount(count);
        setLowStockCount(invData?.lowStockCount ?? 0);
      } else {
        setInventoryCount(null);
        setLowStockCount(null);
      }

      if (ordRes.status === 'fulfilled' && ordRes.value) {
        const ordData = ordRes.value;
        const orders: any[] = Array.isArray(ordData)
          ? ordData
          : (ordData?.content ?? ordData?.items ?? []);

        const pending = orders.filter((o: any) => o.status === 'CONFIRMED' || o.status === 'PICKING').length;
        const packed = orders.filter((o: any) => o.status === 'PACKED').length;

        setPendingOrdersCount(pending);
        setPackedOrdersCount(packed);
        setRecentOrders(orders.slice(0, 8).map((o: any) => ({
          id: String(o.id),
          code: o.orderCode || o.code || `#${o.id}`,
          status: o.status ?? 'UNKNOWN',
          assignedPicker: o.assignedPicker ?? o.pickerName ?? null,
          createdAt: o.createdAt ?? new Date().toISOString(),
        })));
      } else {
        setPendingOrdersCount(null);
        setPackedOrdersCount(null);
        setRecentOrders([]);
      }

      setLastSync(new Date());
    } catch (error) {
      console.error("Failed to fetch warehouse dashboard data", error);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">CONFIRMED</span>;
      case 'PICKING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 border border-orange-200">PICKING</span>;
      case 'PACKED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">PACKED</span>;
      case 'HANDED_OVER':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">HANDED_OVER</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  const quickActions = [
    { name: "Đơn hàng kho", icon: ClipboardList, href: "/staff/dashboard/warehouse/orders", color: "text-amber-600", bg: "bg-amber-50" },
    { name: "Nhập hàng", icon: Inbox, href: "/staff/dashboard/warehouse/receiving", color: "text-orange-600", bg: "bg-orange-50" },
    { name: "Tồn kho", icon: Box, href: "/staff/dashboard/warehouse/inventory", color: "text-amber-700", bg: "bg-amber-50" },
    { name: "Lấy hàng", icon: MapPin, href: "/staff/dashboard/warehouse/picking", color: "text-orange-700", bg: "bg-orange-50" },
    { name: "Đóng gói", icon: Archive, href: "/staff/dashboard/warehouse/packing", color: "text-blue-600", bg: "bg-blue-50" },
    { name: "Bàn giao VC", icon: Truck, href: "/staff/dashboard/warehouse/shipments", color: "text-emerald-600", bg: "bg-emerald-50" },
    { name: "Kiểm kê", icon: ClipboardCheck, href: "/staff/dashboard/warehouse/stock-count", color: "text-purple-600", bg: "bg-purple-50" },
    { name: "Đề xuất nhập", icon: FileBox, href: "/staff/dashboard/warehouse/replenishment", color: "text-rose-600", bg: "bg-rose-50" },
  ];

  const orderColumns: Column<Order>[] = [
    {
      key: "code",
      header: "Mã đơn",
      render: (order) => (
        <span className="font-mono font-bold text-slate-900">{order.code || order.id.slice(0, 8)}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (order) => getStatusBadge(order.status),
    },
    {
      key: "assignedPicker",
      header: "Người xử lý",
      render: (order) => (
        order.assignedPicker ? (
          <span className="text-sm text-slate-700">{order.assignedPicker}</span>
        ) : (
          <span className="text-sm text-slate-400 italic">—</span>
        )
      ),
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (order) => (
        <span className="text-sm text-slate-500">
          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <PageHeader
          title="Tổng Quan Kho Hàng"
          subtitle={`Quy trình xử lý đơn hàng, điều phối xuất nhập kho & quản lý tồn kho chi nhánh • Cập nhật lúc: ${lastSync ? lastSync.toLocaleTimeString('vi-VN') : '—'}`}
          badge={<span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
          breadcrumbs={[
            { label: "Staff Hub", href: "/staff/dashboard" },
            { label: "Kho hàng", href: "/staff/dashboard/warehouse/dashboard" },
            { label: "Tổng quan" }
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/staff/dashboard/warehouse/receiving">
                <Button variant="primary" size="sm" icon={<Inbox className="w-4 h-4" />}>
                  Nhập kho mới
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                disabled={loading}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              >
                Làm mới
              </Button>
            </div>
          }
        />


        {/* Workflow Visualization */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Quy trình xử lý đơn hàng</h2>
          <div className="flex flex-wrap items-center justify-between gap-4 relative">
            <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 hidden md:block z-0"></div>
            
            {[
              { id: 'CONFIRMED', label: 'Xác nhận', icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
              { id: 'PICKING', label: 'Lấy hàng', icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
              { id: 'PACKED', label: 'Đóng gói', icon: Archive, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
              { id: 'HANDED_OVER', label: 'Bàn giao', icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            ].map((step, idx) => (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-3 bg-white px-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${step.bg} ${step.border} border-2`}>
                  <step.icon className={`w-6 h-6 ${step.color}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Dòng tồn kho"
            value={loading ? '—' : (inventoryCount !== null ? inventoryCount : '—')}
            icon={Box}
            color="warning"
            subtitle="Tổng SKU đang quản lý"
          />
          <StatCard
            title="Đơn cần xử lý"
            value={loading ? '—' : (pendingOrdersCount !== null ? pendingOrdersCount : '—')}
            icon={ClipboardList}
            color={pendingOrdersCount && pendingOrdersCount > 0 ? 'warning' : 'success'}
            subtitle="Confirmed + Picking"
          />
          <StatCard
            title="Đã đóng gói"
            value={loading ? '—' : (packedOrdersCount !== null ? packedOrdersCount : '—')}
            icon={Archive}
            color="blue"
            subtitle="Chờ bàn giao vận chuyển"
          />
          <StatCard
            title="Cảnh báo tồn thấp"
            value={loading ? '—' : (lowStockCount !== null ? lowStockCount : '—')}
            icon={AlertTriangle}
            color={lowStockCount && lowStockCount > 0 ? 'danger' : 'success'}
            subtitle={lowStockCount && lowStockCount > 0 ? 'Cần đặt thêm hàng' : 'Tồn kho ổn định'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Đơn hàng gần đây
              </h2>
              <Link href="/staff/dashboard/warehouse/orders" className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 transition-colors">
                Xem tất cả <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="flex-1 p-0">
              <DataTable<Order>
                columns={orderColumns}
                data={recentOrders}
                rowKey={(order) => order.id}
                loading={loading}
                emptyTitle="Không có đơn hàng"
                emptyMessage="Hiện tại không có đơn hàng nào cần xử lý trong kho."
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-slate-900 mb-6">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, idx) => (
                <Link 
                  key={idx} 
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

