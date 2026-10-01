'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import DataTable, { Column } from '@/components/ui/DataTable';
import SafeImage from '@/components/ui/SafeImage';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Eye, X, RefreshCw, ShoppingBag, TrendingUp, Clock, CheckCircle2, Search, RotateCcw } from 'lucide-react';

/* ─── Types ─── */
interface OrderRow {
  id: number;
  orderCode: string;
  customerName: string;
  customerPhone?: string | null;
  totalAmount: number;
  status: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  createdAt: string;
}

interface OrderDetail extends OrderRow {
  customerEmail?: string | null;
  shippingAddress?: string | null;
  note?: string | null;
  voucherCode?: string | null;
  subtotal?: number | null;
  discountTotal?: number | null;
  items: Array<{
    id: number;
    productName: string;
    color?: string | null;
    size?: string | null;
    image?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  history: Array<{ from?: string | null; to: string; changedBy?: string | null; reason?: string | null; createdAt?: string | null }>;
}

interface Summary {
  total: number;
  pending: number;
  delivered: number;
  revenue: number;
}

/* ─── Status / payment vocabulary (matches the values the API really returns) ─── */
const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  PENDING_PAYMENT: { label: 'Chờ thanh toán', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  PICKING: { label: 'Đang lấy hàng', cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  PACKED: { label: 'Đã đóng gói', cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  HANDED_TO_CARRIER: { label: 'Đã bàn giao vận chuyển', cls: 'bg-cyan-50 text-cyan-700', dot: 'bg-cyan-500' },
  SHIPPING: { label: 'Đang giao', cls: 'bg-cyan-50 text-cyan-700', dot: 'bg-cyan-500' },
  DELIVERED: { label: 'Đã giao', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  RETURN_REQUESTED: { label: 'Yêu cầu đổi trả', cls: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  RETURNED: { label: 'Đã trả hàng', cls: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  REFUNDED: { label: 'Đã hoàn tiền', cls: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PAID: 'Đã thanh toán',
  WAITING_TRANSFER: 'Chờ chuyển khoản',
  COD_PENDING: 'Thu khi giao hàng',
  COD_COLLECTED: 'Đã thu COD',
  UNPAID: 'Chưa thanh toán',
  REFUND_PENDING: 'Chờ hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
};

const paymentMethodLabel = (m?: string | null) =>
  m === 'BANK_TRANSFER' ? 'Chuyển khoản' : m === 'COD' ? 'Thanh toán khi nhận' : m || '—';

const formatCurrency = (amount?: number | null) =>
  typeof amount === 'number' ? `${Math.round(amount).toLocaleString('vi-VN')} ₫` : '—';

const formatDateTime = (value?: string | null, seconds = false) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
  });
};

const toDateInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const PAGE_SIZE = 15;

const inputClass =
  'ui-control w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status || 'Không rõ', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
      <span className="truncate">{meta.label}</span>
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
      <span className="text-xs text-slate-500 uppercase font-bold block mb-1">{label}</span>
      <div className="text-sm text-slate-900">{children}</div>
    </div>
  );
}

export default function StoreOwnerOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      // whole-branch figures (no date range), independent of the filters below
      const data: any = await apiClient.get('/api/store-owner/dashboard');
      setSummary({
        total: Number(data?.orders?.total ?? 0),
        pending: Number(data?.orders?.pending ?? 0),
        delivered: Number(data?.orders?.delivered ?? 0),
        revenue: Number(data?.revenue?.total ?? 0),
      });
    } catch {
      /* the list still works without the summary cards */
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (fromDate && toDate && fromDate > toDate) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (status) params.append('status', status);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      const data: any = await apiClient.get(`/api/store-owner/orders?${params.toString()}`);
      setOrders(data?.items ?? data?.content ?? (Array.isArray(data) ? data : []));
      setTotalItems(Number(data?.totalItems ?? data?.totalElements ?? 0));
      setTotalPages(Math.max(1, Number(data?.totalPages ?? 1)));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách đơn hàng');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, fromDate, toDate]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const openDetail = async (order: OrderRow) => {
    setSelected(order);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await apiClient.get<OrderDetail>(`/api/store-owner/orders/${order.id}`));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải chi tiết đơn hàng');
    } finally {
      setDetailLoading(false);
    }
  };

  const applyRange = (days: number | null) => {
    if (days === null) { setFromDate(''); setToDate(''); }
    else {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - (days - 1));
      setFromDate(toDateInput(start));
      setToDate(toDateInput(today));
    }
    setPage(0);
  };

  const resetFilters = () => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); setPage(0); };

  const chips = useMemo(() => {
    const list: { label: string; clear: () => void }[] = [];
    if (search) list.push({ label: `Từ khóa: ${search}`, clear: () => setSearch('') });
    if (status) list.push({ label: STATUS_META[status]?.label ?? status, clear: () => setStatus('') });
    if (fromDate || toDate) list.push({ label: `Ngày đặt: ${fromDate || '…'} → ${toDate || '…'}`, clear: () => { setFromDate(''); setToDate(''); } });
    return list;
  }, [search, status, fromDate, toDate]);

  const columns: Column<OrderRow>[] = [
    {
      key: 'orderCode',
      header: 'Mã đơn',
      width: '170px',
      render: (o) => (
        <div className="min-w-0">
          <span className="block truncate font-mono text-sm font-bold text-slate-900" title={o.orderCode}>{o.orderCode}</span>
          <span className="text-xs text-slate-400 font-mono">#{o.id}</span>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Khách hàng',
      width: '20%',
      render: (o) => (
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900" title={o.customerName}>{o.customerName}</span>
          {o.customerPhone && <span className="block truncate text-xs text-slate-500 font-mono">{o.customerPhone}</span>}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Tổng tiền',
      align: 'right',
      width: '140px',
      render: (o) => <span className="block truncate font-mono text-sm font-semibold text-slate-900">{formatCurrency(o.totalAmount)}</span>,
    },
    {
      key: 'payment',
      header: 'Thanh toán',
      // Only column without a width: the fixed-layout table squeezed it to one character.
      width: '170px',
      render: (o) => (
        <div className="min-w-0">
          <span className="block truncate text-sm text-slate-700">{paymentMethodLabel(o.paymentMethod)}</span>
          <span className={`block truncate text-xs ${o.paymentStatus === 'PAID' || o.paymentStatus === 'COD_COLLECTED' ? 'text-emerald-600' : 'text-slate-500'}`}>
            {(o.paymentStatus && PAYMENT_STATUS_LABEL[o.paymentStatus]) || o.paymentStatus || ''}
          </span>
        </div>
      ),
    },
    { key: 'status', header: 'Trạng thái', width: '170px', render: (o) => <StatusPill status={o.status} /> },
    {
      key: 'createdAt',
      header: 'Ngày đặt',
      width: '160px',
      render: (o) => <span className="block truncate text-sm text-slate-600" title={formatDateTime(o.createdAt, true)}>{formatDateTime(o.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '56px',
      align: 'right',
      render: (o) => (
        <Button size="sm" variant="ghost" icon={<Eye className="w-4 h-4" />} onClick={() => openDetail(o)} aria-label="Xem chi tiết" />
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">
        <PageHeader
          title="Đơn hàng"
          subtitle="Theo dõi đơn hàng phát sinh, trạng thái xử lý và thanh toán của cửa hàng."
          actions={
            <Button
              variant="secondary"
              onClick={() => { fetchOrders(); fetchSummary(); }}
              loading={loading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Làm mới
            </Button>
          }
        />

        {/* Tổng quan cả cửa hàng (không phụ thuộc bộ lọc) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Tổng đơn hàng" value={summary ? summary.total.toLocaleString('vi-VN') : '—'} icon={ShoppingBag} color="blue" subtitle="Toàn bộ đơn của cửa hàng" />
          <StatCard title="Doanh thu" value={summary ? formatCurrency(summary.revenue) : '—'} icon={TrendingUp} color="green" subtitle="Chỉ tính đơn đã giao" />
          <StatCard title="Chờ xử lý" value={summary ? summary.pending.toLocaleString('vi-VN') : '—'} icon={Clock} color="warning" subtitle="Chờ thanh toán hoặc chờ xác nhận" />
          <StatCard title="Đã giao" value={summary ? summary.delivered.toLocaleString('vi-VN') : '—'} icon={CheckCircle2} color="success" subtitle="Đơn đã hoàn tất" />
        </div>

        {/* Bộ lọc (áp dụng ngay) */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-8">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Tìm theo mã đơn, tên khách hoặc số điện thoại..."
                className={`${inputClass} pl-10`}
                aria-label="Tìm kiếm"
              />
            </div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              className={`${inputClass} lg:col-span-4`}
              aria-label="Trạng thái"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_META).filter(([k]) => k !== 'DRAFT').map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Từ</span>
              <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} className={`${inputClass} !w-44`} />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Đến</span>
              <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); setPage(0); }} className={`${inputClass} !w-44`} />
            </label>
            <span className="hidden md:block h-6 w-px bg-slate-200" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-2">
              {[{ label: 'Hôm nay', days: 1 }, { label: '7 ngày', days: 7 }, { label: '30 ngày', days: 30 }, { label: 'Tất cả', days: null as number | null }].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => applyRange(r.days)}
                  className="ui-control-medium h-8 px-3.5 rounded-full border border-slate-200 bg-white font-sans text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => { chip.clear(); setPage(0); }}
                  className="ui-control-medium inline-flex items-center gap-1.5 pl-3 pr-2 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-sans text-slate-700 transition-colors"
                  aria-label={`Bỏ lọc ${chip.label}`}
                >
                  {chip.label}
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ))}
              <button type="button" onClick={resetFilters} className="ui-control inline-flex items-center gap-1 font-sans font-semibold text-primary hover:underline ml-1">
                <RotateCcw className="w-3.5 h-3.5" /> Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-900">{totalItems.toLocaleString('vi-VN')}</span> đơn hàng khớp bộ lọc
        </p>

        {/* Bảng đơn hàng: phân trang phía máy chủ */}
        <Card noPadding>
          <DataTable<OrderRow>
            data={orders}
            columns={columns}
            loading={loading}
            fixedLayout
            rowKey={(o) => o.id}
            onRowClick={openDetail}
            pagination={{
              currentPage: page,
              totalPages,
              totalItems,
              pageSize: PAGE_SIZE,
              onPageChange: (p) => setPage(p),
            }}
            emptyTitle="Không tìm thấy đơn hàng nào"
            emptyMessage="Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
          />
        </Card>

        {/* Chi tiết đơn hàng */}
        {selected && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Đơn hàng <span className="font-mono">{selected.orderCode}</span></h3>
                  <p className="text-xs text-slate-500 mt-1">Đặt lúc {formatDateTime(selected.createdAt, true)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={detail?.status ?? selected.status} />
                  <button
                    type="button"
                    onClick={() => { setSelected(null); setDetail(null); }}
                    aria-label="Đóng"
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-sm">
                {detailLoading || !detail ? (
                  <div className="space-y-3 animate-pulse" aria-busy="true">
                    <div className="h-20 rounded-xl bg-slate-100" />
                    <div className="h-32 rounded-xl bg-slate-100" />
                    <div className="h-24 rounded-xl bg-slate-100" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Khách hàng">
                        <p className="font-semibold">{detail.customerName}</p>
                        {detail.customerPhone && <p className="font-mono text-xs text-slate-600 mt-0.5">{detail.customerPhone}</p>}
                        {detail.customerEmail && <p className="text-xs text-slate-600 break-all">{detail.customerEmail}</p>}
                      </Field>
                      <Field label="Giao đến">
                        <p className="leading-relaxed">{detail.shippingAddress || 'Chưa có địa chỉ'}</p>
                        {detail.note && <p className="mt-1.5 text-xs text-slate-500">Ghi chú: {detail.note}</p>}
                      </Field>
                      <Field label="Thanh toán">
                        <p className="font-semibold">{paymentMethodLabel(detail.paymentMethod)}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{(detail.paymentStatus && PAYMENT_STATUS_LABEL[detail.paymentStatus]) || detail.paymentStatus || '—'}</p>
                      </Field>
                      <Field label="Tổng thanh toán">
                        <p className="text-xl font-bold text-primary">{formatCurrency(detail.totalAmount)}</p>
                        {detail.voucherCode && <p className="text-xs text-slate-500 mt-0.5">Mã giảm giá: {detail.voucherCode}</p>}
                      </Field>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Sản phẩm ({detail.items.length})</h4>
                      {detail.items.length === 0 ? (
                        <p className="text-slate-400 italic">Không có chi tiết sản phẩm.</p>
                      ) : (
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                          {detail.items.map((item) => (
                            <li key={item.id} className="flex items-center gap-3 p-3">
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                <SafeImage src={item.image || ''} alt={item.productName} fill className="object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900 truncate" title={item.productName}>{item.productName}</p>
                                <p className="text-xs text-slate-500">
                                  {[item.color, item.size].filter(Boolean).join(' / ')}
                                  {' · '}SL {item.quantity} × {formatCurrency(item.unitPrice)}
                                </p>
                              </div>
                              <p className="font-mono font-semibold text-slate-900 shrink-0">{formatCurrency(item.totalPrice)}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                      <dl className="mt-3 space-y-1.5 text-sm">
                        <div className="flex justify-between text-slate-600"><dt>Tạm tính</dt><dd>{formatCurrency(detail.subtotal ?? detail.totalAmount)}</dd></div>
                        {!!detail.discountTotal && detail.discountTotal > 0 && (
                          <div className="flex justify-between text-emerald-700"><dt>Giảm giá</dt><dd>-{formatCurrency(detail.discountTotal)}</dd></div>
                        )}
                        <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2"><dt>Tổng cộng</dt><dd>{formatCurrency(detail.totalAmount)}</dd></div>
                      </dl>
                    </div>

                    {detail.history.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Lịch sử trạng thái</h4>
                        <ol className="relative space-y-4 border-l border-slate-200 ml-1.5 pl-5">
                          {detail.history.map((h, i) => (
                            <li key={i} className="relative">
                              <span className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${STATUS_META[h.to]?.dot ?? 'bg-slate-400'}`} />
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusPill status={h.to} />
                                <span className="text-xs text-slate-500">{formatDateTime(h.createdAt, true)}</span>
                              </div>
                              {(h.changedBy || h.reason) && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {h.changedBy ? `Bởi ${h.changedBy}` : ''}{h.changedBy && h.reason ? ' · ' : ''}{h.reason || ''}
                                </p>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <Button variant="secondary" onClick={() => { setSelected(null); setDetail(null); }}>Đóng</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
