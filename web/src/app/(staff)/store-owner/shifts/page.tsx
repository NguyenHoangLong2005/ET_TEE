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
  CalendarClock, RefreshCw, Plus, Trash2, X, Save, AlertCircle
} from 'lucide-react';

interface WorkShift {
  id: number;
  userName: string;
  userEmail: string;
  role: string;
  shiftDate: string;
  shiftType: string;
  status: string;
}

export default function StoreOwnerShiftsPage() {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  /* Create modal */
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formUserEmail, setFormUserEmail] = useState('');
  const [formShiftDate, setFormShiftDate] = useState('');
  const [formShiftType, setFormShiftType] = useState('Ca Sáng (08:00 - 16:00)');
  const [submittingShift, setSubmittingShift] = useState(false);

  /* Delete confirm modal */
  const [shiftToDelete, setShiftToDelete] = useState<WorkShift | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch ── */
  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>('/api/store-owner/work-shifts');
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      setShifts(Array.isArray(list) ? list : []);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải lịch làm việc');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  /* ── Create Shift ── */
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formUserEmail.trim().toLowerCase();
    if (!cleanEmail || !formShiftDate) {
      toast.error('Vui lòng điền đầy đủ thông tin ca làm việc');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Email nhân viên không đúng định dạng');
      return;
    }
    const isDuplicateShift = shifts.some(
      s =>
        s.userEmail.trim().toLowerCase() === cleanEmail &&
        s.shiftDate === formShiftDate &&
        s.shiftType === formShiftType
    );
    if (isDuplicateShift) {
      toast.error(`Nhân viên "${cleanEmail}" đã được phân ca "${formShiftType}" vào ngày ${formShiftDate}!`);
      return;
    }

    setSubmittingShift(true);
    try {
      const payload = {
        userEmail: cleanEmail,
        shiftDate: formShiftDate,
        shiftType: formShiftType,
      };

      await apiClient.post('/api/store-owner/work-shifts', payload);

      toast.success('Phân ca làm việc mới thành công');
      setCreateModalOpen(false);
      setFormUserEmail('');
      setFormShiftDate('');
      fetchShifts();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo ca làm việc');
    } finally {
      setSubmittingShift(false);
    }
  };

  /* ── Delete Shift ── */
  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    try {
      setDeleting(true);
      await apiClient.delete(`/api/store-owner/work-shifts/${shiftToDelete.id}`);
      setShifts(prev => prev.filter(s => s.id !== shiftToDelete.id));
      toast.success('Đã xóa ca làm việc');
      setShiftToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || 'Xóa ca làm việc thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const [page, setPage] = useState(0);
  const pageSize = 15;

  const filteredShifts = useMemo(() => {
    return shifts.filter(s =>
      !search.trim() ||
      s.userName?.toLowerCase().includes(search.toLowerCase()) ||
      s.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      s.shiftDate?.includes(search) ||
      s.shiftType?.toLowerCase().includes(search.toLowerCase())
    );
  }, [shifts, search]);

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / pageSize));
  const paginatedShifts = useMemo(() => {
    const start = page * pageSize;
    return filteredShifts.slice(start, start + pageSize);
  }, [filteredShifts, page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const columns: Column<WorkShift>[] = [
    {
      key: 'user',
      header: 'Nhân viên',
      render: (shift) => (
        <div>
          <div className="font-bold text-slate-900">{shift.userName || 'Nhân viên chi nhánh'}</div>
          <div className="text-xs text-slate-400 font-mono">{shift.userEmail}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò',
      render: (shift) => (
        <span className="text-slate-700 font-semibold text-xs">{shift.role || 'STAFF'}</span>
      ),
    },
    {
      key: 'shiftDate',
      header: 'Ngày làm việc',
      render: (shift) => (
        <span className="text-slate-800 font-medium font-mono text-xs">{shift.shiftDate}</span>
      ),
    },
    {
      key: 'shiftType',
      header: 'Ca làm việc',
      render: (shift) => (
        <span className="font-bold text-slate-900 text-xs">{shift.shiftType}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (shift) => (
        <StatusBadge
          status={shift.status || 'ASSIGNED'}
          label={shift.status || 'Đã phân ca'}
          tone="info"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (shift) => (
        <button
          onClick={() => setShiftToDelete(shift)}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Xóa ca làm việc"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">

        {/* Header */}
        <PageHeader
          title="Lịch làm việc & Xếp ca"
          subtitle="Lịch phân ca làm việc và theo dõi danh sách nhân sự tại chi nhánh."
          badge="CHI NHÁNH"
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={fetchShifts}
                loading={loading}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Làm mới
              </Button>
              <Button
                onClick={() => setCreateModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Phân ca mới
              </Button>
            </div>
          }
        />

        {/* Table */}
        <DataTable<WorkShift>
          data={paginatedShifts}
          columns={columns}
          loading={loading}
          rowKey={(shift) => shift.id}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm theo tên, email, ngày..."
          pagination={{
            currentPage: page,
            totalPages,
            totalItems: filteredShifts.length,
            pageSize,
            onPageChange: (p) => setPage(p),
          }}
          emptyTitle="Chưa có lịch phân ca làm việc nào"
          emptyMessage="Nhấn nút 'Phân ca mới' ở góc phải để giao ca cho nhân viên."
        />

        {/* Modal: Create Work Shift */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-base">Phân ca làm việc mới</h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateShift} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email nhân viên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formUserEmail}
                    onChange={e => setFormUserEmail(e.target.value)}
                    placeholder="nhanvien@ettee.com"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ngày làm việc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formShiftDate}
                    onChange={e => setFormShiftDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ca làm việc <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formShiftType}
                    onChange={e => setFormShiftType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                  >
                    <option value="Ca Sáng (08:00 - 16:00)">Ca Sáng (08:00 - 16:00)</option>
                    <option value="Ca Chiều (14:00 - 22:00)">Ca Chiều (14:00 - 22:00)</option>
                    <option value="Ca Full (08:00 - 21:00)">Ca Full (08:00 - 21:00)</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setCreateModalOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    loading={submittingShift}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Lưu ca trực
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirm Delete */}
        <ConfirmModal
          isOpen={!!shiftToDelete}
          title="Xóa ca làm việc"
          message={`Bạn có chắc muốn xóa ca "${shiftToDelete?.shiftType}" của "${shiftToDelete?.userEmail}" vào ngày ${shiftToDelete?.shiftDate} không?`}
          confirmText="Xác nhận xóa"
          cancelText="Hủy"
          type="danger"
          isLoading={deleting}
          onConfirm={handleDeleteShift}
          onClose={() => setShiftToDelete(null)}
        />

      </div>
    </PermissionGuard>
  );
}
