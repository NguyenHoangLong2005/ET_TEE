'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DataTable, { Column } from '@/components/ui/DataTable';
import { StatCard } from '@/components/dashboard/DashboardComponents';
import { toast } from 'sonner';
import { Mail, Search, RefreshCw, CheckCircle, Clock, Eye, AlertCircle, Send, X, RotateCcw } from 'lucide-react';

interface EmailLog {
  id: string | number;
  // the API field is `recipient`; `recipientEmail` is kept for older payloads
  recipient?: string;
  recipientEmail?: string;
  subject: string;
  status: 'SENT' | 'FAILED' | 'PENDING' | string;
  sentAt?: string;
  createdAt?: string;
  errorMessage?: string;
  type?: string;
  emailType?: string;
  // open tracking (only emails sent after the feature was added carry a tracking pixel)
  tracked?: boolean;
  openedAt?: string;
  lastOpenedAt?: string;
  openCount?: number;
}

interface Summary {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  opened?: number;
  trackedSent?: number;
}

const PAGE_SIZE = 20;

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  SENT: { label: 'Đã gửi', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  SEEN: { label: 'Đã xem', cls: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  FAILED: { label: 'Thất bại', cls: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  PENDING: { label: 'Đang chờ', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

const inputClass =
  'w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

/** The API has no "type" column, so classify from what the subject says. */
function emailTypeOf(log: EmailLog): string {
  if (log.type || log.emailType) return (log.type || log.emailType) as string;
  const s = (log.subject || '').toLowerCase();
  if (s.includes('đơn hàng')) return 'Đơn hàng';
  if (s.includes('mật khẩu') || s.includes('password')) return 'Mật khẩu';
  if (s.includes('xác thực') || s.includes('xác nhận email') || s.includes('otp') || s.includes('mã')) return 'Xác thực';
  return 'Khác';
}

const recipientOf = (log: EmailLog) => log.recipient || log.recipientEmail || '';

const formatDate = (dateStr?: string, seconds = false) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    ...(seconds ? { second: '2-digit' } : {}),
  });
};

const toDateInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** SENT + opened by the customer is presented as "Đã xem"; everything else keeps its own status. */
const effectiveStatus = (log: EmailLog) => (log.status === 'SENT' && log.openedAt ? 'SEEN' : log.status);

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status || 'Không rõ', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export default function MailingLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [summary, setSummary] = useState<Summary | null>(null);
  const summaryLoaded = useRef(false);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadSummaryFallback = useCallback(async () => {
    const count = async (st?: string) => {
      const res: any = await apiClient.get(
        `/api/admin/mailing/logs?page=0&size=1${st ? `&status=${st}` : ''}`,
      );
      return Number(res?.totalElements ?? 0);
    };
    try {
      const [total, sent, failed, pending] = await Promise.all([count(), count('SENT'), count('FAILED'), count('PENDING')]);
      setSummary({ total, sent, failed, pending });
    } catch {
      summaryLoaded.current = false; // try again on the next refresh
    }
  }, []);

  const fetchLogs = useCallback(async (silent?: unknown) => {
    if (fromDate && toDate && fromDate > toDate) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }
    try {
      if (silent !== true) setIsLoading(true);
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      // "Đã xem" / "Đã gửi (chưa xem)" are views of SENT emails split by whether the customer opened them.
      if (status === 'SEEN') { params.append('status', 'SENT'); params.append('opened', 'yes'); }
      else if (status === 'SENT_UNSEEN') { params.append('status', 'SENT'); params.append('opened', 'no'); }
      else if (status) params.append('status', status);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      let response: any = null;
      try {
        response = await apiClient.get(`/api/admin/mailing/logs?${params.toString()}`);
      } catch {
        // legacy path
        response = await apiClient.get(`/api/admin/email-logs?${params.toString()}`);
      }

      setLogs(response?.content ?? (Array.isArray(response) ? response : []));
      setTotalElements(response?.totalElements ?? 0);
      setTotalPages(response?.totalPages || 1);
      if (response?.summary) {
        setSummary(response.summary);
        summaryLoaded.current = true;
      } else if (!summaryLoaded.current) {
        // Backend without the `summary` field: count each status with a 1-row query instead.
        summaryLoaded.current = true;
        loadSummaryFallback();
      }
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
      toast.error('Không thể tải nhật ký email');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, status, fromDate, toDate, loadSummaryFallback]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRetry = async (id: string | number) => {
    try {
      setIsRetrying(true);
      await apiClient.post(`/api/admin/email-logs/${id}/retry`);
      toast.success('Đã gửi lại email');
      setSelectedLog(null);
      fetchLogs(true);
    } catch (error) {
      console.error('Failed to retry email:', error);
      toast.error('Gửi lại email thất bại');
    } finally {
      setIsRetrying(false);
    }
  };

  const applyRange = (days: number | null) => {
    if (days === null) {
      setFromDate('');
      setToDate('');
    } else {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - (days - 1));
      setFromDate(toDateInput(start));
      setToDate(toDateInput(today));
    }
    setPage(0);
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    if (search) chips.push({ label: `Từ khóa: ${search}`, clear: () => setSearch('') });
    if (status) {
      chips.push({ label: status === 'SENT_UNSEEN' ? 'Đã gửi (chưa xem)' : (STATUS_META[status]?.label ?? status), clear: () => setStatus('') });
    }
    if (fromDate || toDate) {
      chips.push({ label: `Thời gian: ${fromDate || '…'} → ${toDate || '…'}`, clear: () => { setFromDate(''); setToDate(''); } });
    }
    return chips;
  }, [search, status, fromDate, toDate]);

  const columns: Column<EmailLog>[] = [
    {
      key: 'sentAt',
      header: 'Thời gian gửi',
      width: '185px',
      render: (log) => (
        <span className="block truncate text-slate-600 text-sm" title={formatDate(log.sentAt || log.createdAt, true)}>
          {formatDate(log.sentAt || log.createdAt)}
        </span>
      ),
    },
    {
      key: 'recipient',
      header: 'Người nhận',
      width: '22%',
      render: (log) => (
        <span className="block truncate text-sm font-semibold text-slate-900" title={recipientOf(log)}>
          {recipientOf(log) || '—'}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Chủ đề',
      render: (log) => (
        <span className="block truncate text-sm text-slate-700" title={log.subject}>
          {log.subject || '—'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Loại',
      width: '110px',
      render: (log) => (
        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-xs font-medium text-slate-600">{emailTypeOf(log)}</span>
      ),
    },
    { key: 'status', header: 'Trạng thái', width: '140px', render: (log) => <StatusPill status={effectiveStatus(log)} /> },
    {
      key: 'actions',
      header: '',
      width: '56px',
      align: 'right',
      render: (log) => (
        <Button size="sm" variant="ghost" icon={<Eye className="w-4 h-4" />} onClick={() => setSelectedLog(log)} aria-label="Xem chi tiết" />
      ),
    },
  ];

  return (
    <PermissionGuard requiredPermissions={['MANAGE_MAILING']}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">
        <PageHeader
          title="Nhật ký email"
          subtitle="Lịch sử email hệ thống đã gửi tới khách hàng: xác thực tài khoản, xác nhận đơn hàng và các thông báo khác."
          actions={
            <Button
              variant="secondary"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => { summaryLoaded.current = false; fetchLogs(); }}
              loading={isLoading}
            >
              Làm mới
            </Button>
          }
        />

        {/* ─── Thống kê toàn bộ nhật ký ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summary ? (
            <>
              <StatCard title="Tổng email" value={summary.total.toLocaleString('vi-VN')} icon={Mail} tone="default" />
              <StatCard
                title="Đã gửi"
                value={summary.sent.toLocaleString('vi-VN')}
                subtitle={summary.opened != null ? `${summary.opened.toLocaleString('vi-VN')} khách đã xem` : undefined}
                icon={CheckCircle}
                tone="success"
              />
              <StatCard title="Thất bại" value={summary.failed.toLocaleString('vi-VN')} icon={AlertCircle} tone="danger" />
              <StatCard title="Đang chờ" value={summary.pending.toLocaleString('vi-VN')} icon={Clock} tone="warning" />
            </>
          ) : (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 animate-pulse" aria-hidden="true">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-7 w-16 bg-slate-200 rounded" />
              </div>
            ))
          )}
        </div>

        {/* ─── Bộ lọc (áp dụng ngay, không cần bấm Lọc) ─── */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-8">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Tìm theo email người nhận hoặc chủ đề..."
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
              <option value="SEEN">Đã xem</option>
              <option value="SENT_UNSEEN">Đã gửi (chưa xem)</option>
              <option value="FAILED">Thất bại</option>
              <option value="PENDING">Đang chờ</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Từ</span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
                className={`${inputClass} !w-44`}
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Đến</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => { setToDate(e.target.value); setPage(0); }}
                className={`${inputClass} !w-44`}
              />
            </label>
            <span className="hidden md:block h-6 w-px bg-slate-200" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Hôm nay', days: 1 },
                { label: '7 ngày', days: 7 },
                { label: '30 ngày', days: 30 },
                { label: 'Tất cả', days: null as number | null },
              ].map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => applyRange(r.days)}
                  className="h-8 px-3.5 rounded-full border border-slate-200 bg-white font-sans text-sm font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
              {activeChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => { chip.clear(); setPage(0); }}
                  className="inline-flex items-center gap-1.5 pl-3 pr-2 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-sans text-sm font-medium text-slate-700 transition-colors"
                  aria-label={`Bỏ lọc ${chip.label}`}
                >
                  {chip.label}
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ))}
              <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-primary hover:underline ml-1">
                <RotateCcw className="w-3.5 h-3.5" /> Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-900">{totalElements.toLocaleString('vi-VN')}</span> email khớp bộ lọc
        </p>

        {/* ─── Bảng ─── */}
        <Card noPadding>
          <DataTable<EmailLog>
            columns={columns}
            data={logs}
            loading={isLoading}
            fixedLayout
            rowKey={(log) => String(log.id)}
            onRowClick={(log) => setSelectedLog(log)}
            emptyTitle="Không tìm thấy email nào"
            emptyMessage="Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
            pagination={{
              currentPage: page,
              totalPages: Math.max(1, totalPages),
              totalItems: totalElements,
              pageSize: PAGE_SIZE,
              onPageChange: (p) => setPage(p),
            }}
          />
        </Card>

        {/* ─── Chi tiết ─── */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h3 className="text-sm font-semibold text-slate-900">Chi tiết email #{selectedLog.id}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  aria-label="Đóng"
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3.5 text-sm overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Trạng thái">
                    <StatusPill status={effectiveStatus(selectedLog)} />
                    {selectedLog.openedAt && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        Xem lần đầu {formatDate(selectedLog.openedAt, true)}
                        {(selectedLog.openCount ?? 0) > 1 ? ` · ${selectedLog.openCount} lượt mở` : ''}
                      </p>
                    )}
                  </Field>
                  <Field label="Thời gian gửi">{formatDate(selectedLog.sentAt || selectedLog.createdAt, true)}</Field>
                </div>
                <Field label="Người nhận"><span className="font-semibold break-all">{recipientOf(selectedLog) || '—'}</span></Field>
                <Field label="Chủ đề">{selectedLog.subject || '—'}</Field>
                <Field label="Loại email">{emailTypeOf(selectedLog)}</Field>
                {selectedLog.status === 'FAILED' && selectedLog.errorMessage && (
                  <div>
                    <p className="text-xs font-bold uppercase text-rose-600 mb-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Lý do thất bại
                    </p>
                    <pre className="bg-rose-50 text-rose-700 text-xs p-3.5 rounded-xl font-mono border border-rose-100 whitespace-pre-wrap break-words">
                      {selectedLog.errorMessage}
                    </pre>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 shrink-0">
                <Button variant="secondary" onClick={() => setSelectedLog(null)}>Đóng</Button>
                {selectedLog.status === 'FAILED' && (
                  <Button onClick={() => handleRetry(selectedLog.id)} loading={isRetrying} icon={<Send className="w-4 h-4" />}>
                    Thử gửi lại
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
      <span className="text-xs text-slate-500 uppercase font-bold block mb-1">{label}</span>
      <div className="text-slate-900">{children}</div>
    </div>
  );
}
