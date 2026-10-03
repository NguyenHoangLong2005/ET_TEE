"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, PackageCheck, RefreshCw } from 'lucide-react';
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
  status: string;
};

export default function WarehousePackingPage() {
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchPackingOrders = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<WarehouseOrder[]>('/api/staff/warehouse/orders');
      if (Array.isArray(data)) {
        setOrders(data.filter((o: any) => o.status === 'PACKING' || o.status === 'PICKED' || o.status === 'CONFIRMED'));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi tải đơn đóng gói');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackingOrders();
  }, []);

  const handlePack = async (id: number) => {
    setBusyId(id);
    try {
      await apiClient.post(`/api/staff/warehouse/orders/${id}/packing`);
      toast.success('Đã hoàn tất đóng gói đơn hàng!');
      await fetchPackingOrders();
    } catch (e: any) {
      toast.error(e?.message || 'Đóng gói đơn hàng thất bại');
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
          label={`Chờ đóng gói (${order.status})`}
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
          onClick={() => handlePack(order.id)}
          icon={<PackageCheck className="w-3.5 h-3.5" />}
        >
          Hoàn tất đóng gói
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Danh Sách Đóng Gói (Packing)"
        subtitle="Kiểm tra lại sản phẩm, đóng kiện và dán nhãn trước khi chuyển sang khâu bàn giao vận chuyển"
        badge={<span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
        breadcrumbs={[
          { label: "Kho hàng", href: "/staff/dashboard/warehouse/dashboard" },
          { label: "Đóng gói" },
        ]}

        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPackingOrders}
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
        <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
        <Link className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-bold px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
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
        emptyTitle="Không có đơn hàng chờ đóng gói"
        emptyMessage="Hiện tại không có kiện hàng nào cần đóng gói."
      />
    </div>
  );
}
