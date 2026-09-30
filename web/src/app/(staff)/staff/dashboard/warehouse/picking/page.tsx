"use client";

<<<<<<< HEAD
import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage, staffList, staffAction } from "@/lib/staff-api";

type Order = {
  orderId?: number;
  id?: string;
  orderCode: string;
  customerName: string;
  shippingAddress: string;
=======
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, CheckCircle, RefreshCw, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

type WarehouseOrder = {
  id: number;
  orderCode?: string;
  createdAt?: string;
>>>>>>> main
  status: string;
};

export default function WarehousePickingPage() {
<<<<<<< HEAD
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true); setError("");
    try {
      const result = await staffList<Order>("/api/staff/warehouse/orders");
      setOrders(result.filter((o) => o.status.toUpperCase() === "CONFIRMED" || o.status.toUpperCase() === "PICKING"));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  const run = async (id: number | string, path: string, method: "GET" | "POST" = "POST") => {
    try {
      if (method === "GET") {
        await staffList(`/api/staff/warehouse/orders/${id}/${path}`);
      } else {
        await staffAction(`/api/staff/warehouse/orders/${id}/${path}`, "POST");
      }
      await loadOrders();
    } catch (cause) {
      alert(errorMessage(cause));
=======
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchPickingOrders = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<WarehouseOrder[]>('/api/staff/warehouse/orders');
      if (Array.isArray(data)) {
        setOrders(data.filter((o: any) => o.status === 'CONFIRMED' || o.status === 'PICKING'));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi tải yêu cầu nhặt hàng');
    } finally {
      setLoading(false);
>>>>>>> main
    }
  };

  useEffect(() => {
    fetchPickingOrders();
  }, []);

  const handlePick = async (id: number) => {
    setBusyId(id);
    try {
      await apiClient.post(`/api/staff/warehouse/orders/${id}/picking/complete`);
      toast.success('Đã cập nhật hoàn tất nhặt hàng!');
      await fetchPickingOrders();
    } catch (e: any) {
      toast.error(e?.message || 'Cập nhật nhặt hàng thất bại');
    } finally {
      setBusyId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const lower = searchQuery.toLowerCase();
    return (
      (o.orderCode || `#${o.id}`).toLowerCase().includes(lower) ||
      o.status.toLowerCase().includes(lower)
    );
  });

  const columns: Column<WarehouseOrder>[] = [
    {
      key: "orderCode",
      header: "Mã đơn hàng",
      render: (order) => (
        <span className="font-mono font-bold text-slate-900">{order.orderCode || `#${order.id}`}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày đặt",
      render: (order) => (
        <span className="text-xs text-slate-600">
          {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Mới tạo'}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (order) => (
        <StatusBadge
          status={order.status}
          label={`Chờ nhặt (${order.status})`}
        />
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (order) => (
        <Button
          variant="primary"
          size="sm"
          loading={busyId === order.id}
          onClick={() => handlePick(order.id)}
          icon={<CheckCircle className="w-3.5 h-3.5" />}
        >
          Đã nhặt xong
        </Button>
      ),
    },
  ];

  return (
<<<<<<< HEAD
    <PickingView orders={orders} error={error} loading={loading} onRun={run} />
  );
}

function PickingView({
  orders, error, loading, onRun,
  }: {
  orders: Order[]; error: string; loading: boolean; onRun: (id: number | string, path: string, method?: "GET" | "POST") => void;
}) {
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
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        <h1 className="text-3xl font-black text-white mt-3">Lấy hàng</h1>

        {error && <p className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        {loading && <p className="text-sm text-slate-400">Đang tải đơn hàng...</p>}

        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order.orderId ?? order.orderCode} className="flex flex-col gap-3 rounded-xl border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-slate-500">{order.orderCode}</p>
                <p className="mt-1 font-semibold text-white">{order.customerName ?? "Khach chua dat ten"}</p>
                <p className="mt-1 text-xs text-slate-400">{order.shippingAddress ?? "Chua co dia chi"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-orange-300">{order.status}</span>
                {order.status.toUpperCase() === "CONFIRMED" && (
                  <button onClick={() => order.orderId && onRun(order.orderId, "picking", "GET")} className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Bat dau lay hang</button>
                )}
                {order.status.toUpperCase() === "PICKING" && (
                  <button onClick={() => order.orderId && onRun(order.orderId, "picking/complete", "POST")} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Hoan tat lay hang</button>
                )}
              </div>
            </article>
          ))}
          {orders.length === 0 && !loading && <p className="rounded-xl border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Không có đơn nào cần lấy hàng.</p>}
        </div>
      </div>
    </main>
  );
}
=======
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Danh Sách Nhặt Hàng (Picking)"
        subtitle="Danh sách các đơn hàng đã xác nhận cần thủ kho tiến hành lấy sản phẩm từ kệ"
        badge={<span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
        breadcrumbs={[
          { label: "Kho hàng", href: "/staff/dashboard/warehouse/dashboard" },
          { label: "Lấy hàng" },
        ]}

        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPickingOrders}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          >
            Làm mới
          </Button>
        }
      />

      <nav className="flex flex-wrap gap-2 text-xs font-semibold">
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/dashboard">Tổng quan</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
        <Link className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-bold px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
      </nav>

      <DataTable<WarehouseOrder>
        columns={columns}
        data={filteredOrders}
        rowKey={(order) => order.id}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm mã đơn hàng..."
        emptyTitle="Không có yêu cầu nhặt hàng"
        emptyMessage="Hiện không có đơn hàng nào ở trạng thái chờ lấy hàng."
      />
    </div>
  );
}
>>>>>>> main
