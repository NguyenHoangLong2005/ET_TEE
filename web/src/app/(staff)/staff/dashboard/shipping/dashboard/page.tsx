"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  Package, Truck, AlertTriangle, RefreshCw,
  ArrowRight, ChevronRight, CheckCircle2, DollarSign,
  ClipboardList, FileText, RotateCcw,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { toast } from 'sonner';
import {
  Shipment, toShipment, toShippingException, shipmentStatusCfg, isCodPending, asList, fmtVnd, carrierLabel } from '@/lib/shipping';

const SHIPMENTS = '/staff/dashboard/shipping/shipments';

const QUICK_ACTIONS = [
  { label: 'Đơn chờ giao',  icon: FileText,      href: '/staff/dashboard/shipping/orders',     bg: 'bg-slate-100',    iconColor: 'text-slate-500'    },
  { label: 'Kiện hàng',     icon: ClipboardList, href: SHIPMENTS,                              bg: 'bg-slate-100',   iconColor: 'text-slate-500'   },
  { label: 'Ngoại lệ',      icon: AlertTriangle, href: '/staff/dashboard/shipping/exceptions', bg: 'bg-slate-100',   iconColor: 'text-slate-500'   },
  { label: 'Đối soát COD',  icon: DollarSign,    href: '/staff/dashboard/shipping/cod',        bg: 'bg-slate-100',  iconColor: 'text-slate-500'  },
];

export default function ShippingDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [readyOrders, setReadyOrders] = useState(0);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [openExceptions, setOpenExceptions] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ready, ship, exc] = await Promise.all([
        apiClient.get<any>('/api/staff/shipping/orders'),
        apiClient.get<any>('/api/staff/shipping/shipments'),
        apiClient.get<any>('/api/staff/shipping/exceptions'),
      ]);
      setReadyOrders(asList(ready).length);
      setShipments(asList(ship).map(toShipment));
      setOpenExceptions(asList(exc).map(toShippingException).filter(e => e.status === 'OPEN').length);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tải dữ liệu vận chuyển');
    } finally {
      setLoading(false);
      setLastSync(new Date());
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const by = (st: string) => shipments.filter(s => s.status === st).length;
    const codWaiting = shipments.filter(isCodPending);
    // COD còn nằm ngoài: kiện chưa giao xong (hãng sẽ thu) + đã giao nhưng chưa đối soát.
    const codOutstanding = shipments
      .filter(s => ['PENDING', 'HANDED_OVER', 'IN_TRANSIT', 'EXCEPTION'].includes(s.status))
      .reduce((sum, s) => sum + s.codAmount, 0);
    return {
      pending: by('PENDING'),
      handedOver: by('HANDED_OVER'),
      inTransit: by('IN_TRANSIT'),
      delivered: by('DELIVERED'),
      exception: by('EXCEPTION'),
      returned: by('RETURNED'),
      codWaitingCount: codWaiting.length,
      codWaitingAmount: codWaiting.reduce((sum, s) => sum + s.codAmount, 0),
      codOutstanding,
    };
  }, [shipments]);

  // Kiện còn đang xử lý lên trước (backend đã sắp xếp theo hàng đợi công việc).
  const recent = shipments.slice(0, 10);

  const columns: Column<Shipment>[] = [
    {
      key: 'code',
      header: 'Mã Đơn / Mã VĐ',
      render: (s) => (
        <div>
          <div className="font-medium text-slate-900 font-mono">{s.orderCode ?? `#${s.id}`}</div>
          <div className="text-xs text-slate-400 mt-0.5 font-mono">{s.trackingCode ?? '—'}</div>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Khách Hàng',
      render: (s) => <span className="text-sm text-slate-700">{s.customerName ?? '—'}</span>
    },
    {
      key: 'carrier',
      header: 'ĐVVC',
      render: (s) => (
        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {carrierLabel(s.carrierName) ?? '—'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (s) => {
        const cfg = shipmentStatusCfg(s.status);
        return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.cls}`}>{cfg.label}</span>;
      }
    },
    {
      key: 'cod',
      header: 'Tiền COD',
      align: 'right',
      render: (s) => (
        <span className="tabular-nums text-slate-900 font-bold">{s.codAmount > 0 ? fmtVnd(s.codAmount) : '—'}</span>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <Link
          href={`${SHIPMENTS}?status=${s.status}`}
          title="Mở trong danh sách Kiện hàng"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition-all"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      )
    }
  ];

  const flow = [
    { title: 'Chờ tạo vận đơn', desc: 'Kho đã bàn giao, chưa có mã vận đơn', count: readyOrders, href: '/staff/dashboard/shipping/orders', icon: FileText },
    { title: 'Chờ bàn giao ĐVVC', desc: 'Đã có vận đơn, chờ hãng đến lấy', count: stats.pending, href: `${SHIPMENTS}?status=PENDING`, icon: Package },
    { title: 'Đã bàn giao ĐVVC', desc: 'Bưu tá đã nhận, chờ xuất phát', count: stats.handedOver, href: `${SHIPMENTS}?status=HANDED_OVER`, icon: CheckCircle2 },
    { title: 'Đang giao hàng', desc: 'Đang trên lộ trình giao khách', count: stats.inTransit, href: `${SHIPMENTS}?status=IN_TRANSIT`, icon: Truck },
    { title: 'Đã giao', desc: 'Khách nhận hàng thành công', count: stats.delivered, href: `${SHIPMENTS}?status=DELIVERED`, icon: CheckCircle2 },
    { title: 'Hoàn về kho', desc: 'Giao thất bại, đơn đã hủy', count: stats.returned, href: `${SHIPMENTS}?status=RETURNED`, icon: RotateCcw },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-8 text-slate-900">
      <PageHeader
        title="Tổng quan vận chuyển"
        subtitle={`Theo dõi tiến độ vận đơn, đối soát COD và sự cố phát hàng${lastSync ? ` · Cập nhật ${lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
        breadcrumbs={[
          { label: 'Staff Hub', href: '/staff/dashboard' },
          { label: 'Vận chuyển' },
          { label: 'Bảng điều khiển' }
        ]}
        actions={
          <Button
            variant="outline"
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

      {/* KPI Cards: bấm để mở danh sách đã lọc */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href={`${SHIPMENTS}?status=PENDING`} className="block">
          <StatCard
            title="Chờ bàn giao"
            value={readyOrders + stats.pending + stats.handedOver}
            icon={Package}
            color="slate"
            subtitle={`${readyOrders} chờ vận đơn · ${stats.pending + stats.handedOver} chờ hãng lấy`}
          />
        </Link>
        <Link href={`${SHIPMENTS}?status=IN_TRANSIT`} className="block">
          <StatCard
            title="Đang giao hàng"
            value={stats.inTransit}
            icon={Truck}
            color="slate"
            subtitle={`${stats.delivered} kiện đã giao thành công`}
          />
        </Link>
        <Link href="/staff/dashboard/shipping/exceptions" className="block">
          <StatCard
            title="Sự cố đang mở"
            value={openExceptions}
            icon={AlertTriangle}
            color="danger"
            subtitle={`${stats.returned} kiện đã hoàn về kho`}
          />
        </Link>
        <Link href="/staff/dashboard/shipping/cod" className="block">
          <StatCard
            title="COD chờ đối soát"
            value={fmtVnd(stats.codWaitingAmount)}
            icon={DollarSign}
            color="slate"
            subtitle={`${stats.codWaitingCount} kiện đã giao · ${fmtVnd(stats.codOutstanding)} hãng đang thu`}
          />
        </Link>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Process + Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-5">
            <h3 className="text-sm font-semibold text-slate-900">Quy trình Giao Vận</h3>
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200"></div>
              <div className="space-y-3">
                {flow.map((step) => (
                  <Link key={step.title} href={step.href} className="relative flex items-center gap-3 rounded-xl p-1 -m-1 hover:bg-slate-50 transition group">
                    <div className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-2xs shrink-0">
                      <step.icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                    <span className={`text-sm font-black tabular-nums ${step.count > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                      {loading ? '…' : step.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs">
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
              <Truck className="w-4 h-4 text-slate-400" />
              <span>Kiện hàng cần theo dõi</span>
            </h3>
            <Link href={SHIPMENTS} className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-0.5">
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <DataTable<Shipment>
            columns={columns}
            data={recent}
            loading={loading}
            rowKey={(item) => item.id}
            emptyTitle="Chưa có vận đơn nào"
            emptyMessage="Tạo vận đơn từ mục Đơn chờ giao để bắt đầu."
          />
        </div>
      </div>
    </div>
  );
}
