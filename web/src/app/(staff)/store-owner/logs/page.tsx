'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable, { Column } from '@/components/ui/DataTable';
import { toast } from 'sonner';
import { ScrollText, RefreshCw, Search, Shield, Filter } from 'lucide-react';

interface ShopLog {
  id: string | number;
  action: string;
  actorName: string;
  actorRole: string;
  description: string;
  createdAt: string;
}

export default function StoreOwnerLogsPage() {
  const [logs, setLogs] = useState<ShopLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        size: '20',
        ...(actionFilter ? { action: actionFilter } : {})
      });
      const res = await apiClient.get<any>(`/api/store-owner/audit-logs?${query.toString()}`);
      if (res?.items) {
        setLogs(res.items);
        setTotalPages(res.totalPages || 1);
      } else if (res?.content) {
        setLogs(res.content);
        setTotalPages(res.totalPages || 1);
      } else if (Array.isArray(res)) {
        setLogs(res);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải nhật ký hoạt động.');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (item.actorName && item.actorName.toLowerCase().includes(s)) ||
        (item.action && item.action.toLowerCase().includes(s)) ||
        (item.description && item.description.toLowerCase().includes(s))
      );
    });
  }, [logs, search]);

  const columns: Column<ShopLog>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (log) => (
        <span className="font-mono text-xs text-slate-400 font-semibold">#{log.id}</span>
      ),
    },
    {
      key: 'action',
      header: 'Hành động',
      render: (log) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          {log.action}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Người thực hiện',
      render: (log) => (
        <div>
          <div className="font-bold text-slate-900">{log.actorName}</div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-400" />
            {log.actorRole}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Chi tiết thao tác',
      render: (log) => (
        <span className="text-slate-700 text-xs leading-relaxed">{log.description}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      align: 'right',
      render: (log) => (
        <span className="text-slate-400 text-xs font-mono whitespace-nowrap">{log.createdAt}</span>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">

        {/* Top Control Bar */}
        <PageHeader
          title="Nhật ký Hoạt động"
          subtitle="Lịch sử thao tác và audit log của các nhân viên thuộc cửa hàng quản lý."
          actions={
            <Button
              variant="secondary"
              onClick={fetchLogs}
              loading={loading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Làm mới
            </Button>
          }
        />

        {/* Table */}
        <DataTable<ShopLog>
          data={filteredLogs}
          columns={columns}
          loading={loading}
          rowKey={(log) => log.id}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm theo tên nhân viên, hành động, mô tả..."
          filterSlot={
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
              >
                <option value="">Tất cả hành động</option>
                <option value="UPDATE_LOCAL_PRICE">Cập nhật giá local</option>
                <option value="APPROVE_VOUCHER">Phê duyệt voucher</option>
                <option value="REJECT_VOUCHER">Từ chối voucher</option>
                <option value="CREATE_WORK_SHIFT">Tạo ca làm việc</option>
                <option value="DELETE_WORK_SHIFT">Xóa ca làm việc</option>
              </select>
            </div>
          }
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: (p) => setPage(p),
          }}
          emptyTitle="Không có nhật ký hoạt động nào"
          emptyMessage="Chưa có hành vi ghi log nào được ghi nhận ."
        />

      </div>
    </PermissionGuard>
  );
}
