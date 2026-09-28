'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable, { Column } from '@/components/ui/DataTable';
import { StatCard } from '@/components/dashboard/DashboardComponents';
import { toast } from 'sonner';
import {
  Mail, Search, RefreshCw,
  CheckCircle, XCircle, Clock, Eye, AlertCircle, Filter, Send
} from 'lucide-react';

interface EmailLog {
  id: string | number;
  recipientEmail: string;
  subject: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  sentAt?: string;
  createdAt?: string;
  errorMessage?: string;
  type?: string;
  emailType?: string;
}

interface PageData<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export default function MailingLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });

  // Modal
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchLogs = useCallback(async (isInitial = false) => {
    if (fromDate && toDate && fromDate > toDate) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      return;
    }

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      if (search.trim()) params.append('search', search.trim());
      if (status !== 'ALL') params.append('status', status);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      let response: any = null;
      try {
        response = await apiClient.get(`/api/admin/mailing/logs?${params.toString()}`);
      } catch {
        // Fallback to legacy path if backend doesn't respond on mailing/logs
        try {
          response = await apiClient.get(`/api/admin/email-logs?${params.toString()}`);
        } catch (err) {
          console.warn('Both email log endpoints failed or returned empty:', err);
        }
      }
      
      let dataList: EmailLog[] = [];
      
      // Handle both paginated and flat array responses
      if (response && response.content) {
        dataList = response.content as EmailLog[];
        setTotalElements(response.totalElements || 0);
        setTotalPages(response.totalPages || 1);
      } else if (Array.isArray(response)) {
        dataList = response as EmailLog[];
        setTotalElements(response.length);
        setTotalPages(Math.ceil(response.length / size) || 1);
      }

      setLogs(dataList);

      const isUnfilteredFirstPage =
        page === 0 && !search.trim() && status === 'ALL' && !fromDate && !toDate;
      if (isInitial || isUnfilteredFirstPage) {
        const total = response?.totalElements || dataList.length;
        const sent = dataList.filter((l: any) => l.status === 'SENT').length;
        const failed = dataList.filter((l: any) => l.status === 'FAILED').length;
        const pending = dataList.filter((l: any) => l.status === 'PENDING').length;
        setStats({ total, sent, failed, pending });
      }

    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, size, search, status, fromDate, toDate]);

  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  const handleRetry = async (id: string | number) => {
    try {
      setIsRetrying(true);
      await apiClient.post(`/api/admin/email-logs/${id}/retry`);
      toast.success('Đã gửi lại email thành công');
      setSelectedLog(null);
      fetchLogs();
    } catch (error) {
      console.error('Failed to retry email:', error);
      toast.error('Gửi lại email thất bại');
    } finally {
      setIsRetrying(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('ALL');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <StatusBadge status="ACTIVE" label="Thành công" />;
      case 'FAILED':
        return <StatusBadge status="CANCELLED" label="Thất bại" />;
      case 'PENDING':
        return <StatusBadge status="PENDING" label="Đang chờ" />;
      default:
        return <StatusBadge status="UNKNOWN" label={status || 'UNKNOWN'} />;
    }
  };

  const emailColumns: Column<EmailLog>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (log) => <span className="font-mono text-slate-400 text-xs">#{log.id}</span>,
    },
    {
      key: 'recipientEmail',
      header: 'Người nhận',
      render: (log) => <span className="font-medium text-slate-900 text-sm">{log.recipientEmail}</span>,
    },
    {
      key: 'subject',
      header: 'Chủ đề',
      render: (log) => (
        <span className="text-slate-600 truncate max-w-[280px] block text-sm" title={log.subject}>
          {log.subject}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Loại email',
      render: (log) => (
        log.type || log.emailType ? (
          <span className="rounded-md text-xs font-semibold border px-2 py-0.5 bg-slate-50 text-slate-600 border-slate-200">
            {log.type || log.emailType}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (log) => getStatusBadge(log.status),
    },
    {
      key: 'sentAt',
      header: 'Thời gian gửi',
      render: (log) => <span className="text-slate-500 whitespace-nowrap text-xs">{formatDate(log.sentAt || log.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (log) => (
        <button
          onClick={() => setSelectedLog(log)}
          className="p-1.5 text-slate-500 hover:text-primary hover:bg-red-50 rounded-md transition-colors"
          title="Xem chi tiết"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dateStr));
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <PermissionGuard requiredPermissions={['MANAGE_MAILING']}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <PageHeader
          title="Email Logs"
          subtitle="Lịch sử gửi email và tiến trình gửi thư tự động toàn hệ thống"
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'Email Logs' },
          ]}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Tổng số (gần đây)"
            value={stats.total}
            icon={Mail}
            color="blue"
          />
          <StatCard
            title="Thất bại"
            value={stats.failed}
            icon={AlertCircle}
            color="red"
          />
          <StatCard
            title="Thành công"
            value={stats.sent}
            icon={CheckCircle}
            color="green"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-flat p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">Tìm kiếm</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Email người nhận..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="SENT">Thành công (SENT)</option>
                <option value="FAILED">Thất bại (FAILED)</option>
                <option value="PENDING">Đang chờ (PENDING)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Từ ngày</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Đến ngày</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => { setPage(0); fetchLogs(); }}
              >
                <Filter className="w-4 h-4 mr-1.5" /> Lọc
              </Button>
              <Button
                variant="outline"
                onClick={resetFilters}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" /> Đặt lại
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-flat p-4">
          <DataTable<EmailLog>
            columns={emailColumns}
            data={logs}
            loading={isLoading}
            rowKey={(log) => String(log.id)}
            emptyTitle="Không tìm thấy nhật ký email"
            emptyMessage="Không có email nào thỏa mãn điều kiện lọc."
            pagination={{
              currentPage: page,
              totalPages: Math.max(1, totalPages),
              totalItems: totalElements,
              pageSize: size,
              onPageChange: (p) => setPage(p),
            }}
          />
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-flat border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-slate-400" />
                  Chi tiết Email #{selectedLog.id}
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                    <div className="col-span-1 text-sm font-medium text-slate-500">Trạng thái</div>
                    <div className="col-span-3">{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                    <div className="col-span-1 text-sm font-medium text-slate-500">Người nhận</div>
                    <div className="col-span-3 font-medium text-slate-900">{selectedLog.recipientEmail}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                    <div className="col-span-1 text-sm font-medium text-slate-500">Chủ đề</div>
                    <div className="col-span-3 text-slate-900">{selectedLog.subject}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                    <div className="col-span-1 text-sm font-medium text-slate-500">Thời gian</div>
                    <div className="col-span-3 text-slate-900">{formatDate(selectedLog.sentAt || selectedLog.createdAt)}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                    <div className="col-span-1 text-sm font-medium text-slate-500">Loại email</div>
                    <div className="col-span-3 text-slate-900">
                      {selectedLog.type || selectedLog.emailType || '—'}
                    </div>
                  </div>

                  {selectedLog.status === 'FAILED' && selectedLog.errorMessage && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Lỗi gửi email
                      </div>
                      <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg font-mono border border-red-100 break-words whitespace-pre-wrap">
                        {selectedLog.errorMessage}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 transition-colors"
                >
                  Đóng
                </button>
                {selectedLog.status === 'FAILED' && (
                  <button
                    onClick={() => handleRetry(selectedLog.id)}
                    disabled={isRetrying}
                    className="rounded-lg border border-transparent bg-primary hover:bg-red-700 text-white text-sm font-medium px-4 py-2 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRetrying ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Thử gửi lại
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}


