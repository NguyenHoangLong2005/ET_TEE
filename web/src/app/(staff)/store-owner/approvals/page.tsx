'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import {
  PackageCheck, RefreshCw, CheckCircle2, XCircle, Clock,
  FileCheck, Check, X
} from 'lucide-react';

const TYPE_LABEL: Record<string, string> = {
  VOUCHER: 'Voucher',
  INVENTORY_ADJUSTMENT: 'Điều chỉnh tồn kho',
  RESTOCK_REQUEST: 'Đề xuất nhập hàng',
};

interface ApprovalItem {
  id: string | number;
  type: string; // VOUCHER / INVENTORY_ADJUSTMENT
  title: string;
  requesterName: string;
  status: string;
  createdAt: string;
  targetId?: number;
  description?: string;
}

/** Chuẩn hóa payload backend (approvalId/requestedBy/description) sang ApprovalItem. */
const normalizeApproval = (raw: any): ApprovalItem => {
  const approvalId = String(raw?.approvalId ?? raw?.id ?? '');
  const idMatch = approvalId.match(/(\d+)$/);
  return {
    id: approvalId,
    type: raw?.type ?? '',
    title: raw?.title ?? '',
    description: raw?.description ?? '',
    requesterName: raw?.requestedBy ?? raw?.requesterName ?? '',
    status: raw?.status ?? '',
    createdAt: raw?.createdAt ?? '',
    targetId: raw?.targetId ?? (idMatch ? Number(idMatch[1]) : undefined),
  };
};

export default function StoreOwnerApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Action State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    item: ApprovalItem | null;
    action: 'APPROVE' | 'REJECT';
    note: string;
  }>({
    isOpen: false,
    item: null,
    action: 'APPROVE',
    note: '',
  });
  const [processing, setProcessing] = useState(false);

  const fetchApprovals = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    try {
      const res: any = await apiClient.get('/api/store-owner/approvals/pending');
      const list = Array.isArray(res) ? res : (res?.items ?? res?.content ?? res?.data ?? []);
      setItems(Array.isArray(list) ? list.map(normalizeApproval) : []);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách chờ phê duyệt.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleOpenAction = (item: ApprovalItem, action: 'APPROVE' | 'REJECT') => {
    setConfirmModal({
      isOpen: true,
      item,
      action,
      note: action === 'APPROVE' ? 'Chủ shop phê duyệt' : '',
    });
  };

  const handleExecuteAction = async () => {
    if (!confirmModal.item || processing) return;

    if (confirmModal.action === 'REJECT' && !confirmModal.note.trim()) {
      toast.error('Vui lòng nhập lý do từ chối cụ thể');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        action: confirmModal.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        note: confirmModal.note.trim(),
      };

      if (confirmModal.item.type === 'VOUCHER' && confirmModal.item.targetId) {
        await apiClient.put(`/api/store-owner/approvals/vouchers/${confirmModal.item.targetId}`, payload);
      } else if (confirmModal.item.type === 'RESTOCK_REQUEST' && confirmModal.item.targetId) {
        await apiClient.put(`/api/store-owner/approvals/restock-requests/${confirmModal.item.targetId}`, payload);
      } else if (confirmModal.item.type === 'INVENTORY_ADJUSTMENT' && confirmModal.item.targetId) {
        await apiClient.put(`/api/store-owner/approvals/inventory-adjustments/${confirmModal.item.targetId}`, payload);
      } else {
        await apiClient.put(`/api/store-owner/approvals/${confirmModal.item.id}`, payload);
      }

      toast.success(`Đã ${confirmModal.action === 'APPROVE' ? 'phê duyệt' : 'từ chối'} yêu cầu thành công`);
      setConfirmModal({ isOpen: false, item: null, action: 'APPROVE', note: '' });
      fetchApprovals(true);
    } catch (err: any) {
      toast.error(err?.message || 'Thao tác phê duyệt thất bại');
    } finally {
      setProcessing(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      !search.trim() ||
      (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.requesterName || '').toLowerCase().includes(search.toLowerCase()) ||
      (TYPE_LABEL[item.type] ?? item.type ?? '').toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const columns: Column<ApprovalItem>[] = [
    {
      key: 'type',
      header: 'Phân loại',
      render: (item) => (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Nội dung yêu cầu',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900 text-sm">{item.title}</div>
          {item.description && (
            <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
          )}
          {item.targetId && (
            <div className="text-[11px] text-slate-400 font-mono">Ref ID: #{item.targetId}</div>
          )}
        </div>
      ),
    },
    {
      key: 'requesterName',
      header: 'Người gửi đề xuất',
      render: (item) => (
        <span className="text-slate-800 font-semibold text-xs">{item.requesterName}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      render: (item) => (
        <span className="text-slate-400 text-xs font-mono whitespace-nowrap">
          {item.createdAt}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenAction(item, 'APPROVE')}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Phê duyệt
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleOpenAction(item, 'REJECT')}
            icon={<X className="w-3.5 h-3.5" />}
          >
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">

        {/* ─── Top Control Bar ─── */}
        <PageHeader
          title="Hàng đợi Phê duyệt"
          subtitle="Phê duyệt các yêu cầu khuyến mãi và điều chỉnh tồn kho từ nhân viên."
          actions={
            <Button
              variant="secondary"
              onClick={fetchApprovals}
              loading={loading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Làm mới
            </Button>
          }
        />

        {/* Table */}
        <DataTable<ApprovalItem>
          data={filteredItems}
          columns={columns}
          loading={loading}
          rowKey={(item) => item.id}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm kiếm theo tiêu đề, người gửi..."
          emptyTitle="Hiện tại không có yêu cầu nào chờ duyệt"
          emptyMessage="Tất cả đề xuất điều chỉnh tồn kho & mã giảm giá đã được xử lý hoàn tất."
        />

        {/* Action Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.action === 'APPROVE' ? 'Phê duyệt yêu cầu' : 'Từ chối yêu cầu'}
          message={
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <p className="font-bold text-slate-900">{confirmModal.item?.title}</p>
                <p className="text-slate-500 mt-0.5">Người đề xuất: {confirmModal.item?.requesterName}</p>
              </div>
              <p className="text-xs text-slate-600">
                {confirmModal.action === 'APPROVE'
                  ? 'Bạn có chắc chắn muốn phê duyệt áp dụng thay đổi này không?'
                  : 'Vui lòng cung cấp lý do từ chối để nhân viên nhận được phản hồi:'}
              </p>
              {confirmModal.action === 'REJECT' && (
                <textarea
                  rows={3}
                  value={confirmModal.note}
                  onChange={(e) => setConfirmModal({ ...confirmModal, note: e.target.value })}
                  placeholder="Nhập lý do từ chối..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              )}
            </div>
          }
          confirmText={confirmModal.action === 'APPROVE' ? 'Xác nhận Phê duyệt' : 'Xác nhận Từ chối'}
          cancelText="Hủy"
          type={confirmModal.action === 'APPROVE' ? 'info' : 'danger'}
          isLoading={processing}
          onConfirm={handleExecuteAction}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />

      </div>
    </PermissionGuard>
  );
}
