'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { formatGreetingName } from '@/lib/auth';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import BarChart from '@/components/dashboard/BarChart';
import Card from '@/components/ui/Card';
import DataTable, { Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  TrendingUp, ShoppingBag, Package, AlertTriangle,
  RefreshCw, ArrowUpRight, ChevronRight, BarChart2,
  Clock, CheckCircle2, XCircle, RotateCcw, Layers, Users, Tag, Hand
} from 'lucide-react';
import Link from 'next/link';

/* ─── Types ─────────────────────────────────────────────── */
interface DashboardData {
  totalRevenue?: number;
  revenueChange?: number; // percentage vs last period
  totalOrders?: number;
  orderChange?: number;
  totalProducts?: number;
  lowStockCount?: number;
  pendingPromotions?: number;
  staffCount?: number;
  // Order status breakdown
  pendingOrders?: number;
  confirmedOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  refundedOrders?: number;
  // Revenue by day (last 7 days)
  dailyRevenue?: Array<{ date: string; revenue: number; orders: number }>;
  range?: { from: string; to: string; days: number; granularity: 'day' | 'month' };
  // Recent orders
  recentOrders?: Array<{
    id: number;
    orderCode: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
  shopName?: string;
  shopId?: number;
}

/* ─── Helpers ────────────────────────────────────────────── */
const toInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type Preset = 'today' | '7d' | '30d' | '90d' | 'thisMonth' | 'lastMonth' | 'custom';

const PRESETS: { key: Exclude<Preset, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: '90d', label: '90 ngày' },
  { key: 'thisMonth', label: 'Tháng này' },
  { key: 'lastMonth', label: 'Tháng trước' },
];

function rangeOf(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const today = new Date();
  const daysBack = (n: number) => { const d = new Date(); d.setDate(d.getDate() - (n - 1)); return d; };
  switch (preset) {
    case 'today': return { from: toInput(today), to: toInput(today) };
    case '7d': return { from: toInput(daysBack(7)), to: toInput(today) };
    case '30d': return { from: toInput(daysBack(30)), to: toInput(today) };
    case '90d': return { from: toInput(daysBack(90)), to: toInput(today) };
    case 'thisMonth': return { from: toInput(new Date(today.getFullYear(), today.getMonth(), 1)), to: toInput(today) };
    case 'lastMonth': return {
      from: toInput(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: toInput(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
  }
}

const fmtRangeDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const rangeInputClass =
  'ui-control h-9 px-3 bg-white border border-slate-200 rounded-lg font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

const fmtCurrency = (v?: number) =>
  typeof v === 'number' ? v.toLocaleString('vi-VN') + ' ₫' : '—';

const fmtDate = (s?: string) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONFIRMED:  { label: 'Đã xác nhận',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  PROCESSING: { label: 'Đang xử lý',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  SHIPPED:    { label: 'Đang giao',    cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  DELIVERED:  { label: 'Hoàn thành',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED:  { label: 'Đã hủy',      cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  REFUNDED:   { label: 'Hoàn tiền',   cls: 'bg-purple-50 text-purple-700 border-purple-200' },
};


/* ─── SVG Donut Chart ────────────────────────────────────── */
function DonutChart({ completed, cancelled, refunded, pending }: {
  completed: number; cancelled: number; refunded: number; pending: number;
}) {
  const total = completed + cancelled + refunded + pending;
  if (total === 0) return (
    <div className="h-32 flex items-center justify-center text-xs text-slate-400">Chưa có dữ liệu</div>
  );

  const segments = [
    { value: completed, color: '#10b981', label: 'Hoàn thành' },
    { value: pending,   color: '#f59e0b', label: 'Chờ xử lý' },
    { value: cancelled, color: '#f43f5e', label: 'Hủy đơn' },
    { value: refunded,  color: '#a855f7', label: 'Hoàn tiền' },
  ].filter(s => s.value > 0);

  const r = 40, cx = 60, cy = 60, gap = 1.5;
  let cumAngle = -90;

  const arcs = segments.map(s => {
    const angle = (s.value / total) * 360;
    const startA = cumAngle;
    cumAngle += angle + gap;
    const startR = (startA * Math.PI) / 180;
    const endR = ((startA + angle - gap) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startR);
    const y1 = cy + r * Math.sin(startR);
    const x2 = cx + r * Math.cos(endR);
    const y2 = cy + r * Math.sin(endR);
    const large = angle > 180 ? 1 : 0;
    return { ...s, d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}` };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 120" className="w-32 h-32 shrink-0">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth="14" strokeLinecap="round" />
        ))}
        <text x="60" y="56" textAnchor="middle" className="text-xs" fontSize="10" fontWeight="700" fill="#111827">{total}</text>
        <text x="60" y="68" textAnchor="middle" fontSize="7" fill="#9ca3af">đơn</text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[11px] text-slate-600 truncate">{s.label}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-bold text-slate-900">{s.value}</span>
              <span className="text-[10px] text-slate-400 ml-1">({Math.round(s.value / total * 100)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function StoreOwnerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const [preset, setPreset] = useState<Preset>('30d');
  const [customRange, setCustomRange] = useState(() => rangeOf('30d'));
  const range = preset === 'custom' ? customRange : rangeOf(preset);
  const rangeValid = !!range.from && !!range.to && range.from <= range.to;

  const load = useCallback(async () => {
    if (!rangeValid) return; // custom range still incomplete / reversed
    setRefreshing(true);
    try {
      const [metricsRes, ordersRes] = await Promise.allSettled([
        apiClient.get<any>(`/api/store-owner/dashboard?from=${range.from}&to=${range.to}`),
        apiClient.get<any>('/api/store-owner/orders?page=0&size=5')
      ]);

      const rawMetrics = metricsRes.status === 'fulfilled' ? metricsRes.value : {};
      const rawOrders = ordersRes.status === 'fulfilled' ? ordersRes.value : null;

      // Extract recent orders list
      let ordersList: any[] = [];
      if (rawOrders) {
        if (Array.isArray(rawOrders)) ordersList = rawOrders;
        else if (rawOrders.content) ordersList = rawOrders.content;
        else if (rawOrders.items) ordersList = rawOrders.items;
      }

      // Map metrics from backend structure
      const revObj = rawMetrics?.revenue || {};
      const ordersObj = rawMetrics?.orders || {};
      const invObj = rawMetrics?.inventory || {};
      const staffObj = rawMetrics?.staff || {};
      const approvalsObj = rawMetrics?.approvals || {};

      const totalRev = typeof revObj.total === 'number' ? revObj.total : (rawMetrics?.totalRevenue ?? 0);
      const totalOrd = typeof ordersObj.total === 'number' ? ordersObj.total : (rawMetrics?.totalOrders ?? 0);
      const pendingOrd = typeof ordersObj.pending === 'number' ? ordersObj.pending : (rawMetrics?.pendingOrders ?? 0);
      const confirmedOrd = typeof ordersObj.confirmed === 'number' ? ordersObj.confirmed : (rawMetrics?.confirmedOrders ?? 0);
      const deliveredOrd = typeof ordersObj.delivered === 'number' ? ordersObj.delivered : (rawMetrics?.completedOrders ?? 0);
      const cancelledOrd = typeof ordersObj.cancelled === 'number' ? ordersObj.cancelled : (rawMetrics?.cancelledOrders ?? 0);
      const totalProd = typeof invObj.totalProducts === 'number' ? invObj.totalProducts : (rawMetrics?.totalProducts ?? 0);
      const lowStock = typeof invObj.lowStockAlerts === 'number' ? invObj.lowStockAlerts : (rawMetrics?.lowStockCount ?? 0);
      const pendingAppr = typeof approvalsObj.pendingCount === 'number' ? approvalsObj.pendingCount : (rawMetrics?.pendingPromotions ?? 0);
      const staffTotal = typeof staffObj.total === 'number' ? staffObj.total : (rawMetrics?.staffCount ?? 0);

      // Map recent orders if rawMetrics doesn't have it
      const recent = (rawMetrics?.recentOrders && rawMetrics.recentOrders.length > 0)
        ? rawMetrics.recentOrders
        : ordersList.map((o: any) => ({
            id: o.id,
            orderCode: o.orderCode || `#${o.id}`,
            customerName: o.customerName || o.address?.fullName || 'Khách hàng',
            totalAmount: o.totalAmount || 0,
            status: o.status || 'PENDING',
            createdAt: o.createdAt || new Date().toISOString()
          }));

      // Daily revenue — only use real data from API, never fabricate
      const daily = Array.isArray(rawMetrics?.dailyRevenue) && rawMetrics.dailyRevenue.length > 0
        ? rawMetrics.dailyRevenue
        : [];

      setData({
        totalRevenue: totalRev,
        // Only the backend's real comparison with the previous period; no made-up default.
        revenueChange: typeof rawMetrics?.revenueChange === 'number' ? rawMetrics.revenueChange : undefined,
        totalOrders: totalOrd,
        pendingOrders: pendingOrd,
        confirmedOrders: confirmedOrd,
        completedOrders: deliveredOrd,
        cancelledOrders: cancelledOrd,
        refundedOrders: typeof ordersObj.refunded === 'number' ? ordersObj.refunded : (rawMetrics?.refundedOrders ?? 0),
        totalProducts: totalProd,
        lowStockCount: lowStock,
        pendingPromotions: pendingAppr,
        staffCount: staffTotal,
        dailyRevenue: daily,
        range: rawMetrics?.range,
        recentOrders: recent,
        shopName: rawMetrics?.shopName || 'ET.TEE Store'
      });
    } catch (e: any) {
      console.error('Store owner dashboard load error:', e);
      toast.error(e?.message || 'Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastSync(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, rangeValid]);

  useEffect(() => { load(); }, [load]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const firstName = formatGreetingName(user?.fullName, 'Chủ cửa hàng');

  type RecentOrder = NonNullable<DashboardData['recentOrders']>[number];

  const recentOrderColumns: Column<RecentOrder>[] = [
    {
      key: 'orderCode',
      header: 'Mã đơn',
      render: (order) => (
        <span className="font-mono font-bold text-slate-900">{order.orderCode}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Khách hàng',
      render: (order) => (
        <span className="text-slate-700 font-medium">{order.customerName}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Giá trị',
      render: (order) => (
        <span className="font-mono text-slate-800 font-medium">{fmtCurrency(order.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (order) => (
        <StatusBadge status={order.status} type="order" />
      ),
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      align: 'right',
      render: (order) => (
        <span className="font-mono text-xs text-slate-400 whitespace-nowrap">{fmtDate(order.createdAt)}</span>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="min-h-screen bg-slate-50 p-6 space-y-5 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">

        {/* ─── Control Bar ─── */}
        <PageHeader
          title={
            <span className="inline-flex items-center gap-2.5">
              {greeting}, {firstName}
              <Hand className="w-6 h-6 text-amber-500 -rotate-12" aria-hidden="true" />
            </span>
          }
          subtitle={`${data?.shopName || 'Tổng quan '} · Đồng bộ lúc ${lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
          actions={
            <Button
              variant="secondary"
              onClick={load}
              loading={refreshing}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Làm mới
            </Button>
          }
        />

        {/* ─── Khoảng thời gian ─── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-500 mr-1">Khoảng thời gian:</span>
            {PRESETS.map((pr) => (
              <button
                key={pr.key}
                type="button"
                onClick={() => setPreset(pr.key)}
                className={`ui-control-medium h-8 px-3.5 rounded-full border font-sans transition-colors ${
                  preset === pr.key
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-900 hover:text-slate-900'
                }`}
              >
                {pr.label}
              </button>
            ))}
            <span className="hidden md:block h-6 w-px bg-slate-200 mx-1" aria-hidden="true" />
            {/* Từ + Đến stay together on one line; the whole pair wraps as a unit if space runs out */}
            <div className="flex flex-nowrap items-center gap-3 whitespace-nowrap">
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Từ</span>
              <input
                type="date"
                value={range.from}
                max={range.to || undefined}
                onChange={(e) => { setCustomRange({ from: e.target.value, to: range.to }); setPreset('custom'); }}
                className={rangeInputClass}
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Đến</span>
              <input
                type="date"
                value={range.to}
                min={range.from || undefined}
                max={toInput(new Date())}
                onChange={(e) => { setCustomRange({ from: range.from, to: e.target.value }); setPreset('custom'); }}
                className={rangeInputClass}
              />
            </label>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {rangeValid
              ? <>Đơn tạo từ <strong className="text-slate-700">{fmtRangeDate(range.from)}</strong> đến <strong className="text-slate-700">{fmtRangeDate(range.to)}</strong>. Doanh thu chỉ tính đơn đã giao.</>
              : 'Chọn đủ ngày bắt đầu và kết thúc (ngày bắt đầu không sau ngày kết thúc).'}
          </p>
        </div>

        {/* ─── Metric Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Doanh thu"
            value={loading ? '—' : fmtCurrency(data?.totalRevenue)}
            icon={TrendingUp}
            tone="success"
            trend={data?.revenueChange !== undefined ? {
              value: Math.abs(Number(data.revenueChange.toFixed(1))),
              isPositive: (data.revenueChange ?? 0) >= 0,
              label: 'so với kỳ trước',
            } : undefined}
            subtitle={loading ? undefined : data?.revenueChange === undefined ? 'Đơn đã giao trong kỳ · chưa có kỳ trước để so sánh' : 'Đơn đã giao trong kỳ'}
          />
          <StatCard
            title="Đơn hàng"
            value={loading ? '—' : (data?.totalOrders ?? 0)}
            icon={ShoppingBag}
            tone="default"
            subtitle={`${data?.pendingOrders ?? 0} chờ xử lý · ${data?.completedOrders ?? 0} hoàn thành`}
          />
          <StatCard
            title="Sản phẩm"
            value={loading ? '—' : (data?.totalProducts ?? 0)}
            icon={Package}
            tone="default"
            subtitle="Xem danh mục và phân loại"
          />
          <StatCard
            title="Tồn kho thấp"
            value={loading ? '—' : (data?.lowStockCount ?? 0)}
            icon={AlertTriangle}
            tone="danger"
            subtitle={(data?.lowStockCount ?? 0) > 0 ? 'Cần bổ sung hàng gấp' : 'Tồn kho an toàn'}
          />
        </div>

        {/* ─── Quick Actions ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { href: '/store-owner/orders',       icon: ShoppingBag, label: 'Đơn hàng',       sub: 'Quản lý & xử lý',     color: 'text-slate-400' },
            { href: '/store-owner/approvals',    icon: CheckCircle2, label: 'Phê duyệt',      sub: 'Hàng đợi duyệt',      color: 'text-slate-400', badge: data?.pendingPromotions },
            { href: '/store-owner/products',     icon: Package,     label: 'Sản phẩm',       sub: 'Cấu hình giá local',   color: 'text-slate-400' },
            { href: '/store-owner/inventory',    icon: BarChart2,   label: 'Tồn kho',        sub: 'Báo cáo & nhập kho',  color: 'text-slate-400' },
            { href: '/store-owner/staff',        icon: Users,       label: 'Nhân sự',        sub: 'Quản lý & đánh giá',  color: 'text-slate-400' },
            { href: '/store-owner/shifts',       icon: Clock,       label: 'Xếp ca',         sub: 'Lịch làm việc ca',    color: 'text-slate-400' },
            { href: '/store-owner/suppliers',    icon: Tag,         label: 'Nhà cung ứng',   sub: 'Vải & phụ liệu may',  color: 'text-slate-400' },
            { href: '/store-owner/logs',         icon: Layers,      label: 'Nhật ký Shop',   sub: 'Audit log', color: 'text-slate-400' },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="relative bg-white border border-slate-200 rounded-xl p-3.5 hover:bg-slate-50 hover:border-slate-300 hover:shadow-flat transition-all group shadow-2xs block">
              <item.icon className={`w-4 h-4 ${item.color} mb-2 group-hover:scale-110 transition-transform`} />
              <p className="text-xs font-bold text-slate-900 truncate">{item.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate">{item.sub}</p>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-2 right-2 text-[9px] font-bold bg-amber-500 text-white w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* ─── Charts Row ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-flat p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Doanh thu theo {data?.range?.granularity === 'month' ? 'tháng' : 'ngày'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {rangeValid ? `${fmtRangeDate(range.from)} – ${fmtRangeDate(range.to)}` : 'Biểu đồ doanh thu'}
                </p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            {loading ? (
              <div className="h-40 bg-slate-200 rounded-lg animate-pulse" />
            ) : (
              <BarChart data={data?.dailyRevenue || []} valueSuffix=" ₫" />
            )}
          </div>

          {/* Order Status Donut */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-flat p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tỉ lệ đơn hàng</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Trạng thái các đơn tạo trong kỳ</p>
            </div>
            {loading ? (
              <div className="h-32 bg-slate-200 rounded-lg animate-pulse" />
            ) : (
              <DonutChart
                completed={data?.completedOrders ?? 0}
                cancelled={data?.cancelledOrders ?? 0}
                refunded={data?.refundedOrders ?? 0}
                pending={(data?.pendingOrders ?? 0) + (data?.confirmedOrders ?? 0)}
              />
            )}

            {/* Rate indicators */}
            <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2.5">
              {[
                {
                  label: 'Tỉ lệ hoàn thành',
                  value: data?.totalOrders ? Math.round((data.completedOrders ?? 0) / data.totalOrders * 100) : 0,
                  style: { color: '#059669', background: '#ECFDF5' },
                },
                {
                  label: 'Tỉ lệ hủy đơn',
                  value: data?.totalOrders ? Math.round((data.cancelledOrders ?? 0) / data.totalOrders * 100) : 0,
                  style: { color: '#DC2626', background: '#FEF2F2' },
                },
                {
                  label: 'Tỉ lệ hoàn tiền',
                  value: data?.totalOrders ? Math.round((data.refundedOrders ?? 0) / data.totalOrders * 100) : 0,
                  style: { color: '#2563EB', background: '#EFF6FF' },
                },
                {
                  label: 'Đang xử lý',
                  value: data?.totalOrders ? Math.round(((data.pendingOrders ?? 0) + (data.confirmedOrders ?? 0)) / data.totalOrders * 100) : 0,
                  style: { color: '#D97706', background: '#FFFBEB' },
                },
              ].map((stat, i) => (
                <div key={i} className="rounded-lg p-2 text-center" style={stat.style}>
                  <div className="text-base font-black font-mono" style={{ color: stat.style.color }}>{loading ? '—' : stat.value}%</div>
                  <div className="text-[9px] font-medium leading-tight mt-0.5" style={{ color: stat.style.color, opacity: 0.8 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Recent Orders Table ─── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-flat p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Đơn hàng gần đây</h2>
            </div>
            <Link href="/store-owner/orders" className="text-xs font-semibold hover:opacity-75 inline-flex items-center gap-0.5" style={{ color: '#E50027' }}>
              Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <DataTable<RecentOrder>
            data={data?.recentOrders || []}
            columns={recentOrderColumns}
            loading={loading}
            rowKey={(order) => order.id}
            emptyTitle="Chưa có đơn hàng nào"
            emptyMessage="Cửa hàng hiện chưa có giao dịch phát sinh gần đây."
          />
        </div>

      </div>
    </PermissionGuard>
  );
}




