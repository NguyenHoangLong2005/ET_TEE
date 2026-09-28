"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  Package, Truck, AlertTriangle, RefreshCw,
  ArrowRight, ChevronRight, CheckCircle2, DollarSign,
  ClipboardList, BarChart2, FileText,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';

interface ShipmentItem {
  id: string | number;
  orderCode?: string;
  trackingCode?: string;
  carrier?: string;
  status: string;
  codAmount?: number;
}

const QUICK_ACTIONS = [
  { label: 'Vận đơn',     icon: ClipboardList, href: '/staff/dashboard/shipping/shipments', bg: 'bg-sky-50',    iconColor: 'text-sky-600'    },
  { label: 'Ngoại lệ',    icon: AlertTriangle, href: '/staff/dashboard/shipping/exceptions',bg: 'bg-rose-50',  iconColor: 'text-rose-600'   },
  { label: 'Đối soát COD',icon: DollarSign,    href: '/staff/dashboard/shipping/cod',       bg: 'bg-amber-50', iconColor: 'text-amber-600'  },
  { label: 'Báo cáo',     icon: BarChart2,     href: '/staff/dashboard/shipping/reports',   bg: 'bg-violet-50',iconColor: 'text-violet-600' },
];

export default function ShippingDashboardPage() {
  const [loading, setLoading]   = useState(true);
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch shipments
      const shipData = await apiClient.get<any>('/api/staff/shipping/shipments?page=0&size=20');
      const shipItems = Array.isArray(shipData) ? shipData : (shipData?.content ?? shipData?.items ?? shipData?.data ?? []);
      setShipments(shipItems);

      // Fetch exceptions
      const excData = await apiClient.get<any>('/api/staff/shipping/exceptions?page=0&size=20');
      const excItems = Array.isArray(excData) ? excData : (excData?.content ?? excData?.items ?? excData?.data ?? []);
      setExceptions(excItems);
    } catch (error) {
      console.error('Error fetching shipping data:', error);
    } finally {
      setLoading(false);
      setLastSync(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate KPIs
  const pendingCount = shipments.filter(s => s.status === 'PENDING' || s.status === 'HANDED_OVER').length;
  const inTransitCount = shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY').length;
  const openExceptionsCount = exceptions.filter(e => e.status !== 'RESOLVED').length;
  const totalCodAmount = shipments.reduce((sum, s) => sum + (s.codAmount || 0), 0);

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const columns: Column<ShipmentItem>[] = [
    {
      key: 'code',
      header: 'Mã Đơn / Mã VĐ',
      render: (shipment) => (
        <div>
          <div className="font-medium text-slate-900">{shipment.orderCode || '—'}</div>
          <div className="text-xs text-slate-400 mt-0.5 font-mono">{shipment.trackingCode || '—'}</div>
        </div>
      )
    },
    {
      key: 'carrier',
      header: 'ĐVVC',
      render: (shipment) => (
        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {shipment.carrier || 'Nội bộ'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (shipment) => (
        <StatusBadge status={shipment.status} type="shipment" />
      )
    },
    {
      key: 'cod',
      header: 'Tiền COD',
      align: 'right',
      render: (shipment) => (
        <span className="font-mono text-slate-900 font-bold">
          {formatCurrency(shipment.codAmount)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: (shipment) => (
        <Link 
          href={`/staff/dashboard/shipping/shipments/${shipment.id || shipment.trackingCode}`} 
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-sky-600 hover:text-white transition-all"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 p-6 md:p-8 space-y-6 text-slate-900 max-w-7xl mx-auto">
      <PageHeader
        title="Tổng Quan Vận Chuyển"
        subtitle={`Theo dõi tiến độ vận đơn, đối soát COD và sự cố phát hàng${lastSync ? ` · Cập nhật ${lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
        breadcrumbs={[
          { label: 'Staff Hub', href: '/staff/dashboard' },
          { label: 'Vận chuyển', href: '/staff/dashboard/shipping' },
          { label: 'Bảng điều khiển' }
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chờ bàn giao"
          value={pendingCount}
          icon={Package}
          color="warning"
          subtitle="Chờ hãng đến lấy"
        />
        <StatCard
          title="Đang giao hàng"
          value={inTransitCount}
          icon={Truck}
          color="blue"
          subtitle="Đang trung chuyển"
        />
        <StatCard
          title="Ngoại lệ phát hàng"
          value={openExceptionsCount}
          icon={AlertTriangle}
          color="danger"
          subtitle="Cần can thiệp CSKH"
        />
        <StatCard
          title="Tổng tiền COD"
          value={formatCurrency(totalCodAmount)}
          icon={DollarSign}
          color="purple"
          subtitle="Cần đối soát"
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Process + Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-semibold text-slate-900">Quy trình Giao Vận</h3>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200"></div>
              <div className="space-y-6">
                {[
                  { title: 'Chờ xử lý', desc: 'Chưa tạo vận đơn / chờ lấy hàng', icon: Package },
                  { title: 'Đã bàn giao', desc: 'Bưu tá ĐVVC đã quét nhận', icon: CheckCircle2 },
                  { title: 'Đang giao', desc: 'Đang trên lộ trình giao khách', icon: Truck },
                  { title: 'Đã giao', desc: 'Khách nhận hàng thành công', icon: CheckCircle2 }
                ].map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4">
                    <div className="relative z-10 w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-2xs">
                      <step.icon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="pt-2">
                      <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Thao tác nhanh</h3>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href + action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200 transition-all group text-center"
                >
                  <div className={`p-2.5 rounded-xl ${action.bg} group-hover:scale-110 transition-transform`}>
                    <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 leading-tight">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-600" />
              <span>Vận đơn gần đây</span>
            </h3>
            <Link href="/staff/dashboard/shipping/shipments" className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5">
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <DataTable<ShipmentItem>
            columns={columns}
            data={shipments.slice(0, 10)}
            loading={loading}
            rowKey={(item, index) => item.id || index}
            emptyTitle="Chưa có vận đơn nào"
            emptyMessage="Hệ thống chưa ghi nhận dữ liệu vận chuyển nào."
          />
        </div>
      </div>
    </div>
  );
}
