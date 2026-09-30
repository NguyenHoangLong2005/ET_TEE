'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Tag, Plus, RefreshCw, CheckCircle2, XCircle, Clock,
  Percent, DollarSign, Calendar, X, Save
} from 'lucide-react';

interface Promotion {
  id: number;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue?: number;
  maxUsage?: number;
  usageCount?: number;
  expiresAt?: string;
  status: string;
  requesterName?: string;
  createdAt?: string;
  note?: string;
}

const formatCurrency = (value?: number) => {
  return typeof value === 'number'
    ? value.toLocaleString('vi-VN') + ' ₫'
    : '0 ₫';
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

export default function StoreOwnerPromotionsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  const [pendingPromotions, setPendingPromotions] = useState<Promotion[]>([]);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    promo: Promotion | null;
    action: 'approve' | 'reject';
    note: string;
  }>({
    isOpen: false,
    promo: null,
    action: 'approve',
    note: '',
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form State
  const [newPromo, setNewPromo] = useState({
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discountValue: 0,
    minOrderValue: 0,
    maxUsage: 0,
    expiresAt: ''
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'pending') {
        const data = await apiClient.get<any>('/api/store-owner/approvals/pending');
        const list = Array.isArray(data) ? data : (data?.data || data?.items || []);
        // Filter items that are vouchers
        const vouchers = list.map((item: any) => ({
          id: item.id || item.voucherId,
          code: item.code || item.referenceCode || `VOUCHER-${item.id}`,
          discountType: item.discountType || 'PERCENTAGE',
          discountValue: item.discountValue || item.value || 0,
          minOrderValue: item.minOrderValue || 0,
          maxUsage: item.maxUsage || 0,
          usageCount: item.usageCount || 0,
          status: item.status || 'PENDING',
          requesterName: item.requesterName || item.createdBy || 'Nhân viên Marketing',
          createdAt: item.createdAt || new Date().toISOString(),
          note: item.note || item.reason || '',
        }));
        setPendingPromotions(vouchers);
      } else {
        const res = await apiClient.get<any>('/api/marketing/admin/vouchers');
        const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
        setActivePromotions(list);
      }
    } catch (error: any) {
      if (activeTab === 'pending') setPendingPromotions([]);
      else setActivePromotions([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = (promo: Promotion) => {
    setConfirmModal({
      isOpen: true,
      promo,
      action: 'approve',
      note: 'Chủ shop phê duyệt phát hành',
    });
  };

  const handleReject = (promo: Promotion) => {
    setConfirmModal({
      isOpen: true,
      promo,
      action: 'reject',
      note: '',
    });
  };

  const submitApproveReject = async () => {
    if (!confirmModal.promo || isSubmitting) return;
    if (confirmModal.action === 'reject' && !confirmModal.note.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/store-owner/approvals/vouchers/${confirmModal.promo.id}`, {
        action: confirmModal.action === 'approve' ? 'APPROVE' : 'REJECT',
        note: confirmModal.note.trim(),
      });
      toast.success(
        confirmModal.action === 'approve'
          ? `Đã duyệt phát hành voucher "${confirmModal.promo.code}"`
          : `Đã từ chối voucher "${confirmModal.promo.code}"`
      );
      setConfirmModal({ isOpen: false, promo: null, action: 'approve', note: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xử lý phê duyệt voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.code || newPromo.discountValue <= 0) {
      toast.error('Vui lòng điền mã voucher và giá trị giảm hợp lệ');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/marketing/admin/vouchers', {
        code: newPromo.code.toUpperCase().trim(),
        discountType: newPromo.discountType,
        discountValue: Number(newPromo.discountValue),
        minOrderValue: Number(newPromo.minOrderValue) || 0,
        maxUsage: Number(newPromo.maxUsage) || 0,
        expiresAt: newPromo.expiresAt ? new Date(newPromo.expiresAt).toISOString() : null,
        status: 'ACTIVE',
      });
      toast.success(`Đã tạo voucher "${newPromo.code}" thành công`);
      setIsCreateModalOpen(false);
      setNewPromo({
        code: '',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        minOrderValue: 0,
        maxUsage: 0,
        expiresAt: ''
      });
      if (activeTab === 'active') fetchData();
      else setActiveTab('active');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tạo voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPending = useMemo(() => {
    return pendingPromotions.filter(p =>
      !search.trim() ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.requesterName || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [pendingPromotions, search]);

  const filteredActive = useMemo(() => {
    return activePromotions.filter(p =>
      !search.trim() ||
      p.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [activePromotions, search]);

  const pendingColumns: Column<Promotion>[] = [
    {
      key: 'code',
      header: 'Mã Voucher',
      render: (p) => (
        <span className="font-mono font-bold text-slate-900 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200">
          {p.code}
        </span>
      ),
    },
    {
      key: 'discount',
      header: 'Mức giảm giá',
      render: (p) => (
        <span className="font-bold text-emerald-700 font-mono">
          {p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : formatCurrency(p.discountValue)}
        </span>
      ),
    },
    {
      key: 'minOrderValue',
      header: 'Đơn tối thiểu',
      render: (p) => (
        <span className="text-slate-600 font-mono text-xs">
          {p.minOrderValue ? formatCurrency(p.minOrderValue) : 'Không yêu cầu'}
        </span>
      ),
    },
    {
      key: 'requesterName',
      header: 'Người đề xuất',
      render: (p) => (
        <span className="text-slate-700 font-medium text-xs">
          {p.requesterName || 'Nhân viên Marketing'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ngày đề xuất',
      render: (p) => (
        <span className="text-slate-400 text-xs font-mono whitespace-nowrap">
          {formatDate(p.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            onClick={() => handleApprove(p)}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Phê duyệt
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleReject(p)}
            icon={<XCircle className="w-3.5 h-3.5" />}
          >
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  const activeColumns: Column<Promotion>[] = [
    {
      key: 'code',
      header: 'Mã Voucher',
      render: (p) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          {p.code}
        </span>
      ),
    },
    {
      key: 'discount',
      header: 'Mức giảm giá',
      render: (p) => (
        <span className="font-bold text-emerald-700 font-mono">
          {p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : formatCurrency(p.discountValue)}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Đã dùng / Giới hạn',
      render: (p) => (
        <span className="font-mono text-xs text-slate-700">
          {p.usageCount || 0} {p.maxUsage ? `/ ${p.maxUsage}` : ' (Không giới hạn)'}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Hạn sử dụng',
      render: (p) => (
        <span className="text-slate-500 text-xs font-mono whitespace-nowrap">
          {formatDate(p.expiresAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'right',
      render: (p) => (
        <StatusBadge
          status={p.status}
          label={p.status === 'ACTIVE' ? 'Đang hoạt động' : p.status}
          tone={p.status === 'ACTIVE' ? 'success' : 'neutral'}
        />
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">
        
        {/* Header */}
        <PageHeader
          title="Quản lý Khuyến mãi & Phê duyệt"
          subtitle="Phê duyệt voucher đề xuất từ đội ngũ marketing và phát hành mã giảm giá chi nhánh."
          badge="CHI NHÁNH"
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={fetchData}
                loading={isLoading}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Làm mới
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Tạo Voucher Chi nhánh
              </Button>
            </div>
          }
        />

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            className={`pb-3 text-sm font-bold transition-all relative ${
              activeTab === 'pending'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            onClick={() => { setActiveTab('pending'); setSearch(''); }}
          >
            Chờ duyệt ({pendingPromotions.length})
          </button>
          <button
            className={`pb-3 text-sm font-bold transition-all relative ${
              activeTab === 'active'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            onClick={() => { setActiveTab('active'); setSearch(''); }}
          >
            Tất cả Voucher ({activePromotions.length})
          </button>
        </div>

        {/* Table */}
        {activeTab === 'pending' ? (
          <DataTable<Promotion>
            data={filteredPending}
            columns={pendingColumns}
            loading={isLoading}
            rowKey={(p) => p.id}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm kiếm voucher chờ duyệt..."
            emptyTitle="Không có voucher nào chờ phê duyệt"
            emptyMessage="Tất cả các đề xuất voucher đã được xử lý xong."
          />
        ) : (
          <DataTable<Promotion>
            data={filteredActive}
            columns={activeColumns}
            loading={isLoading}
            rowKey={(p) => p.id}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm kiếm mã voucher..."
            emptyTitle="Chưa có voucher nào"
            emptyMessage="Nhấn 'Tạo Voucher Chi nhánh' để phát hành mã mới."
          />
        )}

        {/* Approve/Reject Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.action === 'approve' ? 'Phê duyệt voucher' : 'Từ chối voucher'}
          message={
            <div className="space-y-3">
              <p>
                {confirmModal.action === 'approve'
                  ? `Bạn có chắc muốn phê duyệt và kích hoạt voucher "${confirmModal.promo?.code}" không?`
                  : `Bạn có chắc muốn từ chối voucher "${confirmModal.promo?.code}"? Vui lòng nhập lý do:`}
              </p>
              {confirmModal.action === 'reject' && (
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
          confirmText={confirmModal.action === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
          cancelText="Hủy"
          type={confirmModal.action === 'approve' ? 'info' : 'danger'}
          isLoading={isSubmitting}
          onConfirm={submitApproveReject}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />

        {/* Create Promo Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Tạo Voucher Chi nhánh Mới</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={submitCreate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Mã Voucher *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="VD: ETTEESALE20"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Loại giảm giá</label>
                    <select
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={newPromo.discountType}
                      onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    >
                      <option value="PERCENTAGE">Phần trăm (%)</option>
                      <option value="FIXED">Số tiền cố định (₫)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Giá trị giảm *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder={newPromo.discountType === 'PERCENTAGE' ? 'VD: 15' : 'VD: 50000'}
                      value={newPromo.discountValue || ''}
                      onChange={(e) => setNewPromo({ ...newPromo, discountValue: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Đơn tối thiểu (₫)</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="VD: 200000"
                      value={newPromo.minOrderValue || ''}
                      onChange={(e) => setNewPromo({ ...newPromo, minOrderValue: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Lượt dùng tối đa</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="0 = Không giới hạn"
                      value={newPromo.maxUsage || ''}
                      onChange={(e) => setNewPromo({ ...newPromo, maxUsage: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Hạn sử dụng</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={newPromo.expiresAt}
                    onChange={(e) => setNewPromo({ ...newPromo, expiresAt: e.target.value })}
                  />
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Tạo Voucher
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </PermissionGuard>
  );
}
