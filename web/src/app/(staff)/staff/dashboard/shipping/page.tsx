'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Truck, Package, CheckCircle2, RefreshCw, ArrowUpRight, DollarSign, AlertCircle, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';

interface OrderItem {
  id: number;
  orderCode: string;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  shippingProvider?: string;
  trackingCode?: string;
}

export default function ShippingDashboardPage() {
  const [shipments, setShipments] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>('/api/staff/shipping/orders');
      const list = Array.isArray(data) ? data : (data?.data ?? data?.items ?? data?.content ?? []);
      
      const items: OrderItem[] = list.map((o: any) => ({
        id: o.id || o.orderId,
        orderCode: o.orderCode || `#${o.id || o.orderId}`,
        customerName: o.customerName || o.customerPhone || 'Khách hàng',
        totalAmount: o.totalAmount || o.total || 0,
        status: o.status || 'SHIPPED',
        createdAt: o.createdAt || '',
        shippingProvider: o.shippingProvider || o.carrier,
        trackingCode: o.trackingCode,
      }));

      setShipments(items);
    } catch (e: any) {
      toast.error(e?.message || 'Không thể tải dữ liệu vận chuyển từ hệ thống');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const awaitingPickup = shipments.filter(s => ['CONFIRMED', 'PROCESSING', 'PACKED', 'CREATED'].includes(s.status)).length;
    const shipping = shipments.filter(s => ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'HANDED_TO_CARRIER'].includes(s.status)).length;
    const delivered = shipments.filter(s => ['DELIVERED', 'COMPLETED'].includes(s.status)).length;
    const totalCod = shipments.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    return { awaitingPickup, shipping, delivered, totalCod };
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    if (!searchQuery.trim()) return shipments;
    const q = searchQuery.toLowerCase();
    return shipments.filter(s =>
      s.orderCode.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      (s.trackingCode && s.trackingCode.toLowerCase().includes(q))
    );
  }, [shipments, searchQuery]);

  const columns: Column<OrderItem>[] = [
    {
      key: 'orderCode',
      header: 'Mã Đơn',
      render: (item) => (
        <span className="font-mono font-bold text-sky-700">
          {item.orderCode}
        </span>
      )
    },
    {
      key: 'customer',
      header: 'Khách Hàng',
      render: (item) => (
        <span className="font-medium text-slate-800">
          {item.customerName}
        </span>
      )
    },
    {
      key: 'carrier',
      header: 'Đơn Vị Vận Chuyển',
      render: (item) => (
        <div>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {item.shippingProvider || 'Nội bộ'}
          </span>
          {item.trackingCode && (
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{item.trackingCode}</div>
          )}
        </div>
      )
    },
    {
      key: 'cod',
      header: 'Giá Trị COD',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900">
          {item.totalAmount.toLocaleString('vi-VN')} ₫
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (item) => (
        <StatusBadge status={item.status} type="shipment" />
      )
    },
    {
      key: 'createdAt',
      header: 'Ngày Tạo',
      render: (item) => (
        <span className="text-xs text-slate-500 font-mono">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: () => (
        <Link
          href="/staff/dashboard/shipping/orders"
          className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 px-3 py-1.5 rounded-lg hover:bg-sky-50 transition"
        >
          <span>Chi tiết</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      )
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50/60 p-6 md:p-8 text-slate-900 font-sans antialiased space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tổng Quan Vận Chuyển (Shipping Hub)"
        subtitle="Quản lý giao nhận, điều phối đối tác vận chuyển và theo dõi đối soát tiền thu hộ COD"
        breadcrumbs={[
          { label: 'Staff Hub', href: '/staff/dashboard' },
          { label: 'Vận chuyển', href: '/staff/dashboard/shipping' },
          { label: 'Tổng quan' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/staff/dashboard/shipping/orders">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>Đơn hàng chờ giao</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chờ lấy hàng"
          value={stats.awaitingPickup}
          icon={AlertCircle}
          color="warning"
          subtitle="Đơn đã đóng gói xong"
        />
        <StatCard
          title="Đang vận chuyển"
          value={stats.shipping}
          icon={Truck}
          color="blue"
          subtitle="Đang trên đường giao"
        />
        <StatCard
          title="Đã giao thành công"
          value={stats.delivered}
          icon={CheckCircle2}
          color="success"
          subtitle="Giao khách thành công"
        />
        <StatCard
          title="Tổng tiền COD"
          value={`${stats.totalCod.toLocaleString('vi-VN')} ₫`}
          icon={DollarSign}
          color="purple"
          subtitle="Tiền thu hộ dự kiến"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/staff/dashboard/shipping/orders", icon: Package, label: "Đơn chờ giao", sub: "Giao cho bưu tá", accent: "bg-sky-50 text-sky-700" },
          { href: "/staff/dashboard/shipping/shipments", icon: Truck, label: "Kiện hàng & Vận đơn", sub: "Theo dõi hành trình", accent: "bg-blue-50 text-blue-700" },
          { href: "/staff/dashboard/shipping/cod", icon: DollarSign, label: "Đối soát COD", sub: "Xác thực tiền thu hộ", accent: "bg-emerald-50 text-emerald-700" },
          { href: "/staff/dashboard/shipping/exceptions", icon: AlertCircle, label: "Xử lý sự cố / Hoàn", sub: "Giao thất bại & đổi trả", accent: "bg-rose-50 text-rose-700" },
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

      {/* Shipments Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-600" />
            <span>Danh sách đơn hàng vận chuyển</span>
          </h2>
          <Link
            href="/staff/dashboard/shipping/orders"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 inline-flex items-center gap-0.5"
          >
            <span>Xem tất cả</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <DataTable<OrderItem>
          columns={columns}
          data={filteredShipments}
          loading={loading}
          rowKey={(item) => item.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm theo mã đơn, khách hàng, mã vận đơn..."
          emptyTitle="Không có đơn vận chuyển nào"
          emptyMessage="Chưa có đơn hàng nào đang trong quá trình vận chuyển hoặc cần bàn giao."
        />
      </div>
    </main>
  );
}
