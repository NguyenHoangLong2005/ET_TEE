"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, CheckCircle2, AlertTriangle, RefreshCw, 
  DollarSign, Package, Clock, Eye, X, ShieldAlert, Hash
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';

interface PendingCodShipment {
  id: number;
  trackingCode?: string;
  carrierName?: string;
  codAmount?: number;
  deliveredAt?: string;
  order?: {
    id: number;
    orderCode: string;
    customerName: string;
    customerPhone: string;
    shopId?: number;
  };
}

interface CodReconciliationItem {
  id: number;
  shipmentId: number;
  trackingCode?: string;
  orderCode?: string;
  customerName?: string;
  codAmount: number;
  createdAt: string;
}

interface CodReconciliation {
  id: number;
  reconciliationCode: string;
  shopId?: number;
  totalCodAmount: number;
  itemCount: number;
  reconciledBy: string;
  reconciledByName?: string;
  reconciledAt: string;
  note?: string;
  status: string;
  createdAt: string;
  items?: CodReconciliationItem[];
}

interface PaginatedReconciliations {
  items: CodReconciliation[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export default function ShippingCodPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  
  // Pending COD state
  const [pendingShipments, setPendingShipments] = useState<PendingCodShipment[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(true);
  
  // History state
  const [historyList, setHistoryList] = useState<CodReconciliation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [selectedSheetDetail, setSelectedSheetDetail] = useState<CodReconciliation | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Modal State for Creating Sheet
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [reconciliationNote, setReconciliationNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load Pending COD Shipments
  const fetchPendingCod = async () => {
    setLoadingPending(true);
    try {
      const data = await apiClient.get<PendingCodShipment[]>('/api/staff/shipping/cod');
      setPendingShipments(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (e: any) {
      toast.error(e?.message || 'Không thể tải danh sách COD chờ đối soát');
      setPendingShipments([]);
    } finally {
      setLoadingPending(false);
    }
  };

  // Load History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiClient.get<PaginatedReconciliations>('/api/staff/shipping/cod/reconciliations?page=0&size=50');
      setHistoryList(res.items || []);
    } catch (e: any) {
      toast.error(e?.message || 'Không thể tải lịch sử phiếu đối soát COD');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingCod();
    } else {
      fetchHistory();
    }
  }, [activeTab]);

  // Selection logic
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === pendingShipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingShipments.map(s => s.id));
    }
  };

  const totalPendingAmount = useMemo(() => {
    return pendingShipments.reduce((sum, s) => sum + (s.codAmount || 0), 0);
  }, [pendingShipments]);

  const selectedTotalCod = useMemo(() => {
    return pendingShipments
      .filter(s => selectedIds.includes(s.id))
      .reduce((sum, s) => sum + (s.codAmount || 0), 0);
  }, [pendingShipments, selectedIds]);

  // Submit Reconciliation Sheet
  const handleCreateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      await apiClient.post('/api/staff/shipping/cod/reconciliation', {
        shipmentIds: selectedIds,
        note: reconciliationNote.trim() || undefined
      });
      setIsModalOpen(false);
      setReconciliationNote('');
      setSelectedIds([]);
      await fetchPendingCod();
      toast.success('Tạo phiếu đối soát COD thành công!');
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lập phiếu đối soát COD');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch sheet detail
  const handleViewDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await apiClient.get<CodReconciliation>(`/api/staff/shipping/cod/reconciliations/${id}`);
      setSelectedSheetDetail(res);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xem chi tiết phiếu đối soát');
    } finally {
      setLoadingDetail(false);
    }
  };

  const historyColumns: Column<CodReconciliation>[] = [
    {
      key: 'reconciliationCode',
      header: 'Mã phiếu',
      render: (rec) => (
        <span className="font-mono font-bold text-slate-900">{rec.reconciliationCode}</span>
      )
    },
    {
      key: 'shop',
      header: 'Chi nhánh',
      render: (rec) => (
        <span className="text-slate-600 font-medium">
          {rec.shopId ? `Chi nhánh #${rec.shopId}` : 'Hội sở (HQ)'}
        </span>
      )
    },
    {
      key: 'itemCount',
      header: 'Số kiện',
      render: (rec) => (
        <span className="font-semibold text-slate-800">{rec.itemCount} kiện</span>
      )
    },
    {
      key: 'totalCodAmount',
      header: 'Tổng tiền COD',
      render: (rec) => (
        <span className="font-mono font-bold text-emerald-600 text-sm">
          {rec.totalCodAmount.toLocaleString('vi-VN')} ₫
        </span>
      )
    },
    {
      key: 'reconciledBy',
      header: 'Người lập',
      render: (rec) => (
        <span className="text-slate-700 font-medium">{rec.reconciledByName || rec.reconciledBy}</span>
      )
    },
    {
      key: 'createdAt',
      header: 'Thời gian lập',
      render: (rec) => (
        <span className="text-xs text-slate-500">
          {new Date(rec.reconciledAt || rec.createdAt).toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (rec) => (
        <StatusBadge status={rec.status} label={rec.status === 'COMPLETED' ? 'Đã đối soát' : rec.status} />
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (rec) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewDetail(rec.id)}
          icon={<Eye className="w-3.5 h-3.5" />}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  const pendingColumns: Column<PendingCodShipment>[] = useMemo(
    () => [
      {
        key: 'select',
        header: '',
        render: (s) => (
          <div className="text-center" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selectedIds.includes(s.id)}
              onChange={() => handleToggleSelect(s.id)}
              className="rounded text-primary focus:ring-primary"
            />
          </div>
        ),
      },
      {
        key: 'trackingCode',
        header: 'Mã Vận Đơn / Mã Đơn',
        render: (s) => (
          <div>
            <div className="font-mono font-bold text-slate-900">{s.trackingCode || `SHIP-#${s.id}`}</div>
            <div className="text-[11px] text-slate-500">{s.order?.orderCode ? `Đơn #${s.order.orderCode}` : ''}</div>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Khách Hàng / SĐT',
        render: (s) => (
          <div>
            <div className="font-semibold text-slate-800">{s.order?.customerName || 'N/A'}</div>
            <div className="text-[11px] text-slate-500">{s.order?.customerPhone || ''}</div>
          </div>
        ),
      },
      {
        key: 'carrier',
        header: 'Hãng Vận Chuyển',
        render: (s) => (
          <span className="font-medium text-slate-700">{s.carrierName || 'Tự giao hàng'}</span>
        ),
      },
      {
        key: 'deliveredAt',
        header: 'Ngày Giao Hàng',
        render: (s) => (
          <span className="text-slate-600 text-xs">
            {s.deliveredAt ? new Date(s.deliveredAt).toLocaleString('vi-VN') : '—'}
          </span>
        ),
      },
      {
        key: 'codAmount',
        header: 'Tiền Thu Hộ (COD)',
        align: 'right',
        render: (s) => (
          <span className="font-mono font-bold text-sm text-emerald-600">
            {(s.codAmount || 0).toLocaleString('vi-VN')} ₫
          </span>
        ),
      },
    ],
    [selectedIds]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Quản Lý & Đối Soát Tài Chính COD"
        subtitle="Đối soát thu hộ COD chuẩn nghiệp vụ tài chính, tự động lập phiếu và theo dõi vết giao dịch"
        breadcrumbs={[
          { label: 'Bộ phận vận chuyển', href: '/staff/dashboard/shipping' },
          { label: 'Đối soát COD' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'pending' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('pending')}
            >
              Chờ đối soát ({pendingShipments.length})
            </Button>
            <Button
              variant={activeTab === 'history' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('history')}
            >
              Lịch sử phiếu đối soát
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Vận đơn chờ đối soát"
          value={pendingShipments.length}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Tổng tiền COD đọng"
          value={`${totalPendingAmount.toLocaleString('vi-VN')} ₫`}
          icon={DollarSign}
          color="warning"
        />
        <StatCard
          title="Phiếu đối soát đã lập"
          value={historyList.length}
          icon={FileText}
          color="purple"
        />
      </div>

      {/* TAB 1: PENDING COD SHIPMENTS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="select-all-pending"
                  checked={pendingShipments.length > 0 && selectedIds.length === pendingShipments.length}
                  onChange={handleSelectAll}
                  className="rounded text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="select-all-pending" className="text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer">
                  Vận Đơn Đã Giao Hàng Chưa Tất Toán COD {selectedIds.length > 0 && `(${selectedIds.length}/${pendingShipments.length} đã chọn)`}
                </label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchPendingCod}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loadingPending ? 'animate-spin' : ''}`} />}
              >
                Tải lại
              </Button>
            </div>

            <DataTable<PendingCodShipment>
              columns={pendingColumns}
              data={pendingShipments}
              loading={loadingPending}
              rowKey={(s) => s.id}
              emptyTitle="Tất cả tiền thu hộ COD đã được đối soát hoàn tất!"
              emptyMessage="Không có kiện hàng nào đọng tiền COD chưa tạo phiếu."
            />
          </div>

          {/* Bottom Floating Action Bar when items selected */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-6 z-40 border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Đã chọn</span>
                <span className="font-bold text-sm text-slate-900">{selectedIds.length} kiện hàng</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-xs text-slate-500 block">Tổng tiền COD</span>
                <span className="font-mono font-bold text-base text-emerald-600">{selectedTotalCod.toLocaleString('vi-VN')} ₫</span>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                icon={<FileText className="w-4 h-4" />}
              >
                Lập Phiếu Đối Soát COD
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECONCILIATION HISTORY */}
      {activeTab === 'history' && (
        <DataTable<CodReconciliation>
          columns={historyColumns}
          data={historyList}
          rowKey={(rec) => rec.id}
          loading={loadingHistory}
          searchQuery={historySearch}
          onSearchChange={setHistorySearch}
          searchPlaceholder="Tìm mã phiếu đối soát, người lập..."
          emptyTitle="Chưa có phiếu đối soát"
          emptyMessage="Chưa có phiếu đối soát COD nào được khởi tạo trong hệ thống."
        />
      )}

      {/* Modal Confirm Create Reconciliation Sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" /> Xác Nhận Lập Phiếu Đối Soát COD
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReconciliation} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-emerald-700">Số lượng vận đơn:</span>
                  <strong className="font-bold text-sm text-emerald-900">{selectedIds.length} kiện</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-emerald-700">Tổng tiền thu hộ COD:</span>
                  <strong className="font-mono font-bold text-base text-emerald-800">{selectedTotalCod.toLocaleString('vi-VN')} ₫</strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú phiếu đối soát (Tùy chọn)</label>
                <textarea
                  value={reconciliationNote}
                  onChange={(e) => setReconciliationNote(e.target.value)}
                  placeholder="Nhập thông tin đợt đối soát, ngân hàng hoặc thông tin thủ quỹ..."
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-primary bg-white text-slate-900"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px] space-y-1">
                <p>• Hệ thống tự động tính lại tổng tiền từ Database để bảo mật giao dịch.</p>
                <p>• Các vận đơn trong phiếu này sẽ được khóa để tránh đối soát trùng lặp.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={submitting}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Xác Nhận Tạo Phiếu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer/Modal Sheet Detail */}
      {selectedSheetDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Chi Tiết Phiếu Đối Soát #{selectedSheetDetail.reconciliationCode}
                </h3>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Lập bởi: {selectedSheetDetail.reconciledByName || selectedSheetDetail.reconciledBy} • {new Date(selectedSheetDetail.reconciledAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <button
                onClick={() => setSelectedSheetDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-slate-500 block text-[11px]">Chi nhánh</span>
                  <strong className="text-slate-900">{selectedSheetDetail.shopId ? `Chi nhánh #${selectedSheetDetail.shopId}` : 'Hội sở (HQ)'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Số kiện đối soát</span>
                  <strong className="text-slate-900">{selectedSheetDetail.itemCount} kiện</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Tổng tiền COD</span>
                  <strong className="text-emerald-700 font-mono text-sm">{selectedSheetDetail.totalCodAmount.toLocaleString('vi-VN')} ₫</strong>
                </div>
              </div>

              {selectedSheetDetail.note && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                  <span className="font-bold block">Ghi chú:</span>
                  <span>{selectedSheetDetail.note}</span>
                </div>
              )}

              <div>
                <span className="font-bold text-slate-800 block mb-2">Danh sách vận đơn chi tiết:</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Mã Vận Đơn</th>
                        <th className="p-3">Mã Đơn Hàng</th>
                        <th className="p-3">Khách Hàng</th>
                        <th className="p-3 text-right">Tiền COD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSheetDetail.items?.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-900">{item.trackingCode || item.shipmentId}</td>
                          <td className="p-3 font-semibold text-primary">{item.orderCode || '—'}</td>
                          <td className="p-3 text-slate-700">{item.customerName || '—'}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">
                            {item.codAmount.toLocaleString('vi-VN')} ₫
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
