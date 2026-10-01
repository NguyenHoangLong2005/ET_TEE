'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import {
  Users, RefreshCw, Plus, Lock, Unlock, Key,
  Eye, X, Save, AlertCircle, Search, Shield,
  CheckCircle, XCircle, UserPlus, Star, Award, TrendingUp,
} from 'lucide-react';

/* ─── types ─── */
interface StaffMember {
  id: string;
  employeeCode?: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  mustChangePassword?: boolean;
  createdAt?: string;
}

interface StaffEvaluation {
  id: number;
  userId: string;
  userFullName?: string;
  evaluationPeriod: string;
  rating: number;
  salesTargetAchievement?: number;
  feedbackNotes?: string;
  evaluatedBy?: string;
  createdAt: string;
}

const SHOP_ROLES = [
  { code: 'SALES_STAFF',     name: 'Nhân viên Bán hàng' },
  { code: 'CSKH_STAFF',      name: 'Nhân viên CSKH' },
  { code: 'WAREHOUSE_STAFF', name: 'Nhân viên Kho' },
  { code: 'SHIPPING_STAFF',  name: 'Nhân viên Vận chuyển' },
  { code: 'MARKETING_STAFF', name: 'Nhân viên Marketing' },
];

const ROLE_BADGE: Record<string, string> = {
  SALES_STAFF:     'bg-blue-50 text-blue-700 border-blue-200',
  CSKH_STAFF:      'bg-purple-50 text-purple-700 border-purple-200',
  WAREHOUSE_STAFF: 'bg-amber-50 text-amber-700 border-amber-200',
  SHIPPING_STAFF:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  MARKETING_STAFF: 'bg-pink-50 text-pink-700 border-pink-200',
};

const ROLE_AVATAR: Record<string, string> = {
  SALES_STAFF:     ' ',
  CSKH_STAFF:      ' ',
  WAREHOUSE_STAFF: ' ',
  SHIPPING_STAFF:  ' ',
  MARKETING_STAFF: ' ',
};

/* ════════════════════════════════════════════ */
export default function StoreOwnerStaffPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'staff' | 'evaluations'>('staff');

  /* Staff Tab states */
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  /* Create staff modal */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeCode: '', fullName: '', email: '',
    phone: '', roleCode: 'SALES_STAFF', initialPassword: '',
  });
  const [creating, setCreating] = useState(false);

  /* Lock modal */
  const [lockId, setLockId] = useState<string | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [locking, setLocking] = useState(false);

  /* Unlock confirm */
  const [unlockId, setUnlockId] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  /* Reset password modal */
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [resetting, setResetting] = useState(false);

  /* Temp password display */
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  /* View user */
  const [viewUser, setViewUser] = useState<StaffMember | null>(null);

  /* Evaluations Tab states */
  const [evaluations, setEvaluations] = useState<StaffEvaluation[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(false);
  const [evalSearch, setEvalSearch] = useState('');
  const [showCreateEval, setShowCreateEval] = useState(false);
  const [evalForm, setEvalForm] = useState({
    userId: '',
    evaluationPeriod: new Date().toISOString().slice(0, 7),
    rating: 5,
    salesTargetAchievement: 100,
    feedbackNotes: '',
  });
  const [creatingEval, setCreatingEval] = useState(false);

  /* ── Load Staff ── */
  const fetchStaff = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    try {
      const res = await apiClient.get<StaffMember[]>('/api/store-owner/staff');
      setStaff(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách nhân viên');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Load Evaluations ── */
  const fetchEvaluations = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoadingEvals(true);
    try {
      const res = await apiClient.get<StaffEvaluation[]>('/api/store-owner/evaluations');
      setEvaluations(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách đánh giá');
      setEvaluations([]);
    } finally {
      setLoadingEvals(false);
    }
  }, []);

  useEffect(() => { 
    fetchStaff(); 
  }, [fetchStaff]);

  useEffect(() => {
    if (activeTab === 'evaluations') {
      fetchEvaluations();
    }
  }, [activeTab, fetchEvaluations]);

  const filteredStaff = useMemo(() => {
    return staff.filter(s =>
      !keyword.trim() ||
      s.fullName.toLowerCase().includes(keyword.toLowerCase()) ||
      s.email.toLowerCase().includes(keyword.toLowerCase()) ||
      (s.employeeCode || '').toLowerCase().includes(keyword.toLowerCase())
    );
  }, [staff, keyword]);

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e =>
      !evalSearch.trim() ||
      (e.userFullName || '').toLowerCase().includes(evalSearch.toLowerCase()) ||
      e.userId.toLowerCase().includes(evalSearch.toLowerCase()) ||
      e.evaluationPeriod.toLowerCase().includes(evalSearch.toLowerCase()) ||
      (e.feedbackNotes || '').toLowerCase().includes(evalSearch.toLowerCase())
    );
  }, [evaluations, evalSearch]);

  /* ── Create Staff ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    const cleanName = createForm.fullName.trim();
    const cleanEmail = createForm.email.trim();
    const cleanPhone = createForm.phone.trim();

    if (!cleanName || !cleanEmail) {
      toast.error('Vui lòng nhập đầy đủ Họ tên và Email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Địa chỉ Email không đúng định dạng');
      return;
    }
    if (cleanPhone && !/^[0-9+\s\-]{8,15}$/.test(cleanPhone)) {
      toast.error('Số điện thoại không hợp lệ (8-15 chữ số)');
      return;
    }

    try {
      setCreating(true);
      const created = await apiClient.post<{ temporaryPassword?: string }>('/api/store-owner/staff', {
        employeeCode: createForm.employeeCode.trim() || undefined,
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone || undefined,
        roleCode: createForm.roleCode,
        shopId: currentUser?.shopId ? Number(currentUser.shopId) : undefined,
        initialPassword: createForm.initialPassword || undefined,
      });

      toast.success('Tạo nhân viên thành công!');
      // Blank password -> the server generated one; it is only shown here, once.
      if (created?.temporaryPassword) {
        setTempPwd(created.temporaryPassword);
        setTempName(cleanName);
      }
      setShowCreate(false);
      setCreateForm({
        employeeCode: '', fullName: '', email: '',
        phone: '', roleCode: 'SALES_STAFF', initialPassword: '',
      });
      fetchStaff(true);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo nhân viên');
    } finally {
      setCreating(false);
    }
  };

  /* ── Lock Staff ── */
  const handleConfirmLock = async () => {
    if (!lockId || !lockReason.trim()) {
      toast.error('Vui lòng nhập lý do khóa tài khoản');
      return;
    }
    try {
      setLocking(true);
      await apiClient.patch(`/api/store-owner/staff/${lockId}/status`, {
        status: 'LOCKED',
        lockReason: lockReason.trim(),
      });
      toast.success('Đã khóa tài khoản nhân viên');
      setLockId(null);
      setLockReason('');
      fetchStaff(true);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể khóa tài khoản');
    } finally {
      setLocking(false);
    }
  };

  /* ── Unlock Staff ── */
  const handleConfirmUnlock = async () => {
    if (!unlockId) return;
    try {
      setUnlocking(true);
      await apiClient.patch(`/api/store-owner/staff/${unlockId}/status`, {
        status: 'ACTIVE',
      });
      toast.success('Đã mở khóa tài khoản nhân viên');
      setUnlockId(null);
      fetchStaff(true);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể mở khóa');
    } finally {
      setUnlocking(false);
    }
  };

  /* ── Reset Password ── */
  const handleConfirmResetPassword = async () => {
    if (!resetTarget) return;
    try {
      setResetting(true);
      const res = await apiClient.post<{ temporaryPassword: string }>(
        `/api/store-owner/staff/${resetTarget.id}/reset-password`, {}
      );
      setTempPwd(res.temporaryPassword);
      setTempName(resetTarget.fullName);
      setResetTarget(null);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể reset mật khẩu');
    } finally {
      setResetting(false);
    }
  };

  /* ── Create Evaluation ── */
  const handleCreateEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalForm.userId) {
      toast.error('Vui lòng chọn nhân viên cần đánh giá');
      return;
    }
    setCreatingEval(true);
    try {
      await apiClient.post('/api/store-owner/evaluations', {
        userId: evalForm.userId,
        evaluationPeriod: evalForm.evaluationPeriod,
        rating: Number(evalForm.rating),
        salesTargetAchievement: Number(evalForm.salesTargetAchievement),
        feedbackNotes: evalForm.feedbackNotes.trim() || undefined,
      });
      toast.success('Đã lưu đánh giá hiệu suất nhân sự thành công!');
      setShowCreateEval(false);
      setEvalForm({
        userId: '',
        evaluationPeriod: new Date().toISOString().slice(0, 7),
        rating: 5,
        salesTargetAchievement: 100,
        feedbackNotes: '',
      });
      await fetchEvaluations(true);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu đánh giá');
    } finally {
      setCreatingEval(false);
    }
  };

  /* ── Helpers ── */
  const roleBadge  = (r?: string) => (r && ROLE_BADGE[r])  || 'bg-slate-100 text-slate-700 border-slate-200';
  const avatarGrad = (r?: string) => (r && ROLE_AVATAR[r]) || ' ';
  const roleLabel  = (r?: string) => r ? (SHOP_ROLES.find(x => x.code === r)?.name || r.replace(/_/g, ' ')) : 'Chưa phân vai trò';

  const staffColumns: Column<StaffMember>[] = [
    {
      key: 'fullName',
      header: 'Nhân viên',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full  ${avatarGrad(s.role)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {s.fullName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-bold text-slate-900">{s.fullName}</div>
            <div className="text-xs text-slate-400 font-mono">{s.email}</div>
            {s.mustChangePassword && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5">
                <RefreshCw className="w-2.5 h-2.5" /> Đổi MK lần đầu
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò',
      render: (s) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${roleBadge(s.role)}`}>
          <Shield className="w-3 h-3" />
          {roleLabel(s.role)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => (
        <StatusBadge
          status={s.status}
          type="user"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setViewUser(s)}
            title="Xem chi tiết"
            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setResetTarget(s)}
            title="Reset mật khẩu"
            className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-colors"
          >
            <Key className="w-4 h-4" />
          </button>
          {s.status === 'ACTIVE' ? (
            <button
              onClick={() => setLockId(s.id)}
              title="Khóa tài khoản"
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
            >
              <Lock className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setUnlockId(s.id)}
              title="Mở khóa"
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <Unlock className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const evalColumns: Column<StaffEvaluation>[] = [
    {
      key: 'employee',
      header: 'Nhân viên',
      render: (e) => (
        <div>
          <div className="font-bold text-slate-900">{e.userFullName || e.userId}</div>
          <div className="text-xs text-slate-400 font-mono">Mã NV / Email: {e.userId}</div>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Kỳ đánh giá',
      render: (e) => (
        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
          {e.evaluationPeriod}
        </span>
      ),
    },
    {
      key: 'rating',
      header: 'Xếp loại',
      render: (e) => (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${i < (e.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
            />
          ))}
          <span className="ml-1 text-xs font-bold text-slate-700">({e.rating}/5)</span>
        </div>
      ),
    },
    {
      key: 'achievement',
      header: 'Chỉ tiêu KPI',
      render: (e) => {
        const ach = Number(e.salesTargetAchievement ?? 0);
        const isGood = ach >= 100;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
            <span className={isGood ? 'text-emerald-600' : 'text-amber-600'}>
              {ach > 0 ? `${ach}%` : '—'}
            </span>
            {ach >= 100 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Đạt chỉ tiêu
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'feedback',
      header: 'Ghi chú & Nhận xét',
      render: (e) => (
        <p className="text-xs text-slate-600 max-w-sm line-clamp-2">
          {e.feedbackNotes || 'Chưa có ghi chú'}
        </p>
      ),
    },
    {
      key: 'evaluatedBy',
      header: 'Người đánh giá',
      render: (e) => (
        <div className="text-xs text-slate-500">
          <p className="font-medium text-slate-700">{e.evaluatedBy || 'Chủ shop'}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            {e.createdAt ? new Date(e.createdAt).toLocaleDateString('vi-VN') : '—'}
          </p>
        </div>
      ),
    },
  ];

  /* ════════════════ RENDER ════════════════ */
  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">

        {/* Header */}
        <PageHeader
          title="Quản lý Nhân sự"
          subtitle="Quản lý tài khoản nhân viên, cấp phát vai trò và đánh giá hiệu suất nhân sự."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={activeTab === 'staff' ? fetchStaff : fetchEvaluations}
                loading={activeTab === 'staff' ? loading : loadingEvals}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Làm mới
              </Button>
              {activeTab === 'staff' ? (
                <Button
                  onClick={() => setShowCreate(true)}
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  Thêm nhân viên
                </Button>
              ) : (
                <Button
                  onClick={() => setShowCreateEval(true)}
                  icon={<Award className="w-4 h-4" />}
                >
                  Tạo đánh giá
                </Button>
              )}
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Button
            variant={activeTab === 'staff' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('staff')}
            icon={<Users className="w-4 h-4" />}
          >
            Danh sách nhân viên ({staff.length})
          </Button>
          <Button
            variant={activeTab === 'evaluations' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('evaluations')}
            icon={<Award className="w-4 h-4" />}
          >
            Đánh giá hiệu suất ({evaluations.length})
          </Button>
        </div>

        {/* Tab 1: Staff Table */}
        {activeTab === 'staff' && (
          <DataTable<StaffMember>
            data={filteredStaff}
            columns={staffColumns}
            loading={loading}
            rowKey={(s) => s.id}
            searchQuery={keyword}
            onSearchChange={setKeyword}
            searchPlaceholder="Tìm tên, email, mã nhân viên..."
            emptyTitle="Chưa có nhân viên nào"
            emptyMessage='Nhấn"Thêm nhân viên" để tạo tài khoản mới.'
          />
        )}

        {/* Tab 2: Evaluations Table */}
        {activeTab === 'evaluations' && (
          <DataTable<StaffEvaluation>
            data={filteredEvaluations}
            columns={evalColumns}
            loading={loadingEvals}
            rowKey={(e) => e.id}
            searchQuery={evalSearch}
            onSearchChange={setEvalSearch}
            searchPlaceholder="Tìm theo tên nhân viên, kỳ đánh giá, nhận xét..."
            emptyTitle="Chưa có bản ghi đánh giá nào"
            emptyMessage='Nhấn"Tạo đánh giá" để ghi nhận hiệu suất nhân viên.'
          />
        )}

        {/* ── Modal: Create Staff ── */}
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Thêm nhân viên mới</h3>
                    <p className="text-xs text-slate-500">Điền đầy đủ thông tin bên dưới</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mã nhân viên</label>
                    <input
                      type="text"
                      value={createForm.employeeCode}
                      onChange={e => setCreateForm({ ...createForm, employeeCode: e.target.value })}
                      placeholder="VD: NV-001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.fullName}
                      onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="nhanvien@ettee.vn"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="0912 345 678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.roleCode}
                    onChange={e => setCreateForm({ ...createForm, roleCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary bg-white"
                  >
                    {SHOP_ROLES.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu khởi tạo
                  </label>
                  <input
                    type="text"
                    value={createForm.initialPassword}
                    onChange={e => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                    placeholder="Để trống để hệ thống tạo mật khẩu ngẫu nhiên"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button variant="secondary" onClick={() => setShowCreate(false)} type="button">Hủy</Button>
                  <Button type="submit" loading={creating}>Tạo nhân viên</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Create Evaluation ── */}
        {showCreateEval && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Đánh giá hiệu suất nhân sự</h3>
                    <p className="text-xs text-slate-500">Ghi nhận KPI và phản hồi định kỳ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateEval(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateEval} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhân viên <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={evalForm.userId}
                    onChange={e => setEvalForm({ ...evalForm, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.email}) - {roleLabel(s.role)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kỳ đánh giá (YYYY-MM) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      required
                      value={evalForm.evaluationPeriod}
                      onChange={e => setEvalForm({ ...evalForm, evaluationPeriod: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Xếp loại đánh giá (1-5 Sao)
                    </label>
                    <select
                      value={evalForm.rating}
                      onChange={e => setEvalForm({ ...evalForm, rating: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="5">5 ⭐⭐⭐⭐⭐ Xuất sắc</option>
                      <option value="4">4 ⭐⭐⭐⭐ Tốt</option>
                      <option value="3">3 ⭐⭐⭐ Đạt yêu cầu</option>
                      <option value="2">2 ⭐⭐ Cần cải thiện</option>
                      <option value="1">1 ⭐ Yếu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tỷ lệ hoàn thành KPI / Doanh số (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="0.1"
                    value={evalForm.salesTargetAchievement}
                    onChange={e => setEvalForm({ ...evalForm, salesTargetAchievement: parseFloat(e.target.value) || 0 })}
                    placeholder="VD: 105.5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú & Nhận xét của Chủ shop
                  </label>
                  <textarea
                    rows={3}
                    value={evalForm.feedbackNotes}
                    onChange={e => setEvalForm({ ...evalForm, feedbackNotes: e.target.value })}
                    placeholder="Nhận xét thái độ phục vụ, tính kỷ luật, đóng góp tích cực..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <Button variant="secondary" onClick={() => setShowCreateEval(false)} type="button">Hủy</Button>
                  <Button type="submit" loading={creatingEval}>Lưu đánh giá</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Lock Staff ── */}
        {lockId && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Khóa tài khoản nhân viên</h3>
                    <p className="text-xs text-slate-500">Tài khoản này sẽ không thể đăng nhập</p>
                  </div>
                </div>
                <button
                  onClick={() => { setLockId(null); setLockReason(''); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lý do khóa tài khoản <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={lockReason}
                    onChange={e => setLockReason(e.target.value)}
                    placeholder="VD: Nghỉ việc, vi phạm quy định nội bộ..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2.5">
                  <Button variant="secondary" onClick={() => { setLockId(null); setLockReason(''); }}>Hủy</Button>
                  <Button variant="danger" loading={locking} onClick={handleConfirmLock}>Xác nhận khóa</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Confirm Unlock ── */}
        <ConfirmModal
          isOpen={!!unlockId}
          title="Mở khóa tài khoản"
          message="Bạn có chắc chắn muốn mở khóa cho tài khoản nhân viên này không?"
          confirmText="Mở khóa"
          cancelText="Hủy"
          type="info"
          isLoading={unlocking}
          onConfirm={handleConfirmUnlock}
          onClose={() => setUnlockId(null)}
        />

        {/* ── Modal: Temp Password Alert ── */}
        {tempPwd && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Mật khẩu tạm thời mới</h3>
                <p className="text-xs text-slate-500 mt-1">Đã cấp lại mật khẩu cho <strong>{tempName}</strong></p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-base font-bold text-slate-900 select-all">
                {tempPwd}
              </div>
              <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                Nhân viên sẽ được yêu cầu đổi mật khẩu ngay trong lần đăng nhập đầu tiên.
              </p>
              <Button onClick={() => setTempPwd(null)} className="w-full">Đã lưu mật khẩu</Button>
            </div>
          </div>
        )}

        {/* ── Modal: View User Detail ── */}
        {viewUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-base">Hồ sơ nhân viên</h3>
                <button
                  onClick={() => setViewUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl  ${avatarGrad(viewUser.role)} flex items-center justify-center text-white font-bold text-xl shrink-0`}>
                    {viewUser.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{viewUser.fullName}</p>
                    <p className="text-xs font-mono text-slate-400">{viewUser.employeeCode || '—'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${roleBadge(viewUser.role)}`}>
                        {roleLabel(viewUser.role)}
                      </span>
                      {viewUser.status === 'ACTIVE'
                        ? <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Hoạt động</span>
                        : <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Đã khóa</span>
                      }
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Email', value: viewUser.email },
                    { label: 'Điện thoại', value: viewUser.phone || '—' },
                  ].map(f => (
                    <div key={f.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</p>
                      <p className="text-sm font-medium text-slate-900 break-all">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setViewUser(null)}
                  className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100"
                >Đóng</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Confirm Reset Password ── */}
        <ConfirmModal
          isOpen={!!resetTarget}
          title="Cấp lại mật khẩu"
          message={`Bạn có chắc chắn muốn cấp lại mật khẩu tạm thời cho nhân viên "${resetTarget?.fullName}" (${resetTarget?.email}) không?`}
          confirmText="Cấp mật khẩu mới"
          cancelText="Hủy"
          type="warning"
          isLoading={resetting}
          onConfirm={handleConfirmResetPassword}
          onClose={() => setResetTarget(null)}
        />

      </div>
    </PermissionGuard>
  );
}

