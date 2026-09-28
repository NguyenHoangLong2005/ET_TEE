"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import PermissionGuard from "@/components/auth/PermissionGuard";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { StatCard } from "@/components/dashboard/DashboardComponents";
import { useAuth, usePermissions } from "@/contexts/AuthContext";
import { getRoleDisplayName } from "@/lib/auth";
import { toast } from "sonner";
import {
  Users, Shield, UserPlus, Search, Lock, Unlock,
  Key, Eye, CheckCircle, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Trash2, Plus, RefreshCw,
  Mail, Building, Crown, Filter,
} from "lucide-react";

/* ───────────── types ───────────── */
type UserAdminDto = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  shopId?: number;
  status: string;
  lockReason?: string;
  lockedBy?: string;
  lockedAt?: string;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
};

type RoleWithPermissions = {
  code: string;
  name: string;
  description: string;
  permissions: string[];
};

type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type TabType = "users" | "roles";

/* ───────────── role badge colours ───────────── */
const ROLE_STYLE: Record<string, string> = {
  ADMIN:           "bg-red-50 text-red-700 border-red-200",
  SUPER_ADMIN:     "bg-red-50 text-red-700 border-red-200",
  SALES_STAFF:     "bg-blue-50 text-blue-700 border-blue-200",
  CSKH_STAFF:      "bg-purple-50 text-purple-700 border-purple-200",
  WAREHOUSE_STAFF: "bg-amber-50 text-amber-700 border-amber-200",
  SHIPPING_STAFF:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  MARKETING_STAFF: "bg-pink-50 text-pink-700 border-pink-200",
  SHOP_OWNER:      "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const ROLE_AVATAR: Record<string, string> = {
  ADMIN:           "from-red-500 to-red-600",
  SUPER_ADMIN:     "from-red-500 to-red-600",
  SALES_STAFF:     "from-blue-500 to-blue-600",
  CSKH_STAFF:      "from-purple-500 to-purple-600",
  WAREHOUSE_STAFF: "from-amber-500 to-amber-600",
  SHIPPING_STAFF:  "from-emerald-500 to-emerald-600",
  MARKETING_STAFF: "from-pink-500 to-pink-600",
  SHOP_OWNER:      "from-indigo-500 to-indigo-600",
};

/* ───────────── permission catalogue ───────────── */
const ALL_PERMISSIONS: Record<string, { code: string; name: string }[]> = {
  "Quản trị Hệ thống": [
    { code: "MANAGE_USER", name: "Quản lý Người dùng" },
    { code: "MANAGE_ROLE_PERMISSION", name: "Quản lý Vai trò & Quyền" },
    { code: "MANAGE_GLOBAL_CATEGORY", name: "Quản lý Danh mục toàn cầu" },
    { code: "CONFIG_PAYMENT_SHIPPING", name: "Cấu hình Thanh toán & Vận chuyển" },
    { code: "VIEW_SYS_ERROR_LOG", name: "Xem Log Lỗi Hệ thống" },
    { code: "VIEW_AUDIT_LOG", name: "Xem Log Audit" },
    { code: "MANAGE_BACKUP", name: "Quản lý Backup DB" },
    { code: "MANAGE_AI_MODEL_FEATURE_FLAG", name: "Quản lý AI & Feature Flag" },
    { code: "MANAGE_MAILING", name: "Quản lý Hệ thống Mail" },
  ],
  "Chủ cửa hàng": [
    { code: "MANAGE_SHOP_STAFF", name: "Quản lý Nhân viên Shop" },
    { code: "MANAGE_SHOP_SHIFT", name: "Xếp ca & Lịch làm việc Shop" },
    { code: "VIEW_SHOP_DASHBOARD", name: "Xem Dashboard Shop" },
    { code: "VIEW_SHOP_LOG", name: "Xem Log Shop" },
    { code: "VIEW_SHOP_AUDIT_LOG", name: "Xem Log Audit Shop" },
    { code: "APPROVE_SHOP_PROMO", name: "Duyệt Khuyến mãi Shop" },
    { code: "APPROVE_PROMOTION", name: "Duyệt Chương trình Khuyến mãi" },
    { code: "APPROVE_INVENTORY_ADJUSTMENT", name: "Duyệt Điều chỉnh Tồn kho" },
    { code: "MANAGE_SHOP_INVENTORY", name: "Quản lý Tồn kho Shop" },
    { code: "MANAGE_SHOP_CATEGORY", name: "Quản lý Danh mục Shop" },
    { code: "MANAGE_SHOP_PRODUCT", name: "Quản lý Sản phẩm Shop" },
  ],
  "Bán hàng": [
    { code: "VIEW_NEW_ORDER", name: "Xem Đơn hàng mới" },
    { code: "VERIFY_ORDER", name: "Xác thực Đơn hàng" },
    { code: "PROCESS_ORDER_NOTE", name: "Xử lý Ghi chú Đơn hàng" },
    { code: "REQUEST_STOCK_HOLD", name: "Yêu cầu Giữ hàng" },
    { code: "MONITOR_ORDER_SLA", name: "Theo dõi SLA Đơn hàng" },
  ],
  "Chăm sóc Khách hàng": [
    { code: "CHAT_CUSTOMER", name: "Chat với Khách hàng" },
    { code: "MANAGE_TICKET", name: "Quản lý Ticket Hỗ trợ" },
    { code: "SEARCH_ORDER_BASIC", name: "Tìm kiếm Đơn hàng cơ bản" },
    { code: "PROCESS_RETURN_REFUND", name: "Xử lý Đổi trả / Hoàn tiền" },
    { code: "ISSUE_SUPPORT_VOUCHER", name: "Phát hành Voucher đền bù" },
    { code: "ESCALATE_TICKET", name: "Chuyển tuyến Ticket" },
  ],
  "Kho hàng": [
    { code: "INBOUND_STOCK", name: "Nhập kho" },
    { code: "COUNT_STOCK", name: "Kiểm kho" },
    { code: "MANAGE_STOCK_LOCATION", name: "Quản lý Vị trí kho" },
    { code: "ADJUST_STOCK", name: "Điều chỉnh Tồn kho" },
    { code: "HOLD_STOCK_ORDER", name: "Giữ hàng cho Đơn" },
    { code: "PICK_PACK_LABEL", name: "Nhặt, Đóng gói, Dán nhãn" },
    { code: "HANDOVER_SHIPPING", name: "Bàn giao Vận chuyển" },
    { code: "PROPOSE_RESTOCK", name: "Đề xuất Nhập thêm hàng" },
  ],
  "Vận chuyển": [
    { code: "RECEIVE_PACKED_LIST", name: "Nhận danh sách đã đóng gói" },
    { code: "MANAGE_WAYBILL", name: "Quản lý Vận đơn" },
    { code: "CONFIRM_HANDOVER", name: "Xác nhận Nhận hàng" },
    { code: "UPDATE_SHIPPING_EXCEPTION", name: "Cập nhật Ngoại lệ giao hàng" },
    { code: "UPLOAD_POD", name: "Tải lên bằng chứng giao hàng" },
    { code: "RECONCILE_COD", name: "Đối soát tiền thu hộ (COD)" },
  ],
  "Marketing": [
    { code: "MANAGE_BANNER_LANDING", name: "Quản lý Banner & Landing Page" },
    { code: "MANAGE_CAMPAIGN_PROMO", name: "Quản lý Chiến dịch & Khuyến mãi" },
    { code: "MANAGE_PRODUCT_PLACEMENT", name: "Quản lý Sắp xếp SP" },
    { code: "AB_TEST_CAMPAIGN", name: "A/B Testing Chiến dịch" },
    { code: "VIEW_CAMPAIGN_ANALYTICS", name: "Xem Analytics Chiến dịch" },
  ],
  "Khác": [
    { code: "PROFILE_VIEW", name: "Xem Hồ sơ cá nhân" },
    { code: "ORDER_VIEW", name: "Xem Đơn hàng cá nhân" },
    { code: "PRODUCT_VIEW", name: "Xem Sản phẩm chung" },
  ],
};

/* ════════════════════════════════════════════ */
export default function AdminUsersPage() {
  /* shared */
  const { user: currentUser } = useAuth();
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { hasAnyPermission } = usePermissions();
  const canManage = hasAnyPermission(["MANAGE_USER", "MANAGE_ROLE_PERMISSION"]);
  const [activeTab, setActiveTab] = useState<TabType>("users");

  const PROTECTED_SYSTEM_ROLES = [
    "ADMIN", "SUPER_ADMIN", "SHOP_OWNER", "SALES_STAFF",
    "CSKH_STAFF", "WAREHOUSE_STAFF", "SHIPPING_STAFF", "MARKETING_STAFF"
  ];

  /* users tab */
  const [users, setUsers] = useState<UserAdminDto[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [stats, setStats] = useState({ active: 0, locked: 0 });

  /* modals – user */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeCode: "", fullName: "", email: "",
    phone: "", roleCode: "SALES_STAFF", initialPassword: "", shopId: "" as string | number,
  });
  const [shops, setShops] = useState<{ id: number; name: string; isActive: boolean }[]>([]);
  /**
   * Vai tro bat buoc thuoc mot chi nhanh - phai khop chinh xac
   * UserServiceImpl.SHOP_BOUND_ROLES ben backend. ADMIN/MARKETING_STAFF/USER
   * la vai tro "corporate", khong gan chi nhanh nao (shopId luon null).
   */
  const SHOP_BOUND_ROLES = ["SHOP_OWNER", "SALES_STAFF", "CSKH_STAFF", "WAREHOUSE_STAFF", "SHIPPING_STAFF", "STAFF"];
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lockUserId, setLockUserId] = useState<string | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [locking, setLocking] = useState(false);
  const [unlockUserId, setUnlockUserId] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [viewUser, setViewUser] = useState<UserAdminDto | null>(null);
  const [quotaUser, setQuotaUser] = useState<UserAdminDto | null>(null);
  const [quotaAmt, setQuotaAmt] = useState("3000000");
  const [quotaPeriod, setQuotaPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserAdminDto | null>(null);
  const [resettingPwd, setResettingPwd] = useState(false);

  /* roles tab */
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState({ code: "", name: "", description: "" });
  const [creatingRole, setCreatingRole] = useState(false);
  const [deleteRoleCode, setDeleteRoleCode] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  /* ── loaders ── */
  const loadShops = useCallback(async () => {
    try {
      const data = await apiClient.get<{ id: number; name: string; isActive: boolean }[]>("/api/shops/active");
      setShops(data || []);
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi tải danh sách chi nhánh");
    }
  }, []);

  const loadRoles = useCallback(async (retain = false) => {
    try {
      setLoadingRoles(true);
      const data = await apiClient.get<RoleWithPermissions[]>("/api/admin/rbac/roles");
      setRoles(data || []);
      if (retain && selectedRole) {
        const upd = (data || []).find(r => r.code === selectedRole.code);
        setSelectedRole(upd ?? null);
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi tải vai trò");
    } finally {
      setLoadingRoles(false);
    }
  }, [selectedRole]);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const p: Record<string, string> = { page: page.toString(), size: "15" };
      if (keyword.trim()) p.keyword = keyword.trim();
      if (roleFilter) p.role = roleFilter;
      if (statusFilter) p.status = statusFilter;
      const data = await apiClient.get<PageResponse<UserAdminDto>>(
        `/api/admin/users?${new URLSearchParams(p)}`
      );
      setUsers(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch (e: any) {
      setError(e.message || "Không thể tải danh sách người dùng");
    } finally {
      setLoadingUsers(false);
    }
  }, [page, keyword, roleFilter, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([
        apiClient.get<PageResponse<UserAdminDto>>("/api/admin/users?page=0&size=1&status=ACTIVE"),
        apiClient.get<PageResponse<UserAdminDto>>("/api/admin/users?page=0&size=1&status=LOCKED"),
      ]);
      setStats({ active: a?.totalElements || 0, locked: l?.totalElements || 0 });
    } catch {}
  }, []);

  useEffect(() => { loadRoles(); loadStats(); loadShops(); }, []);
  useEffect(() => { setPage(0); }, [keyword, roleFilter, statusFilter]);
  useEffect(() => {
    if (activeTab === "users") loadUsers();
    else loadRoles();
  }, [activeTab, page, keyword, roleFilter, statusFilter]);

  /* ── user actions ── */
  const submitCreateUser = async () => {
    const isShopBound = SHOP_BOUND_ROLES.includes(createForm.roleCode);
    if (isShopBound && !createForm.shopId) {
      setError("Vai trò này bắt buộc phải chọn chi nhánh");
      return;
    }
    const resolvedShopId = isShopBound ? Number(createForm.shopId) : undefined;

    try {
      setCreating(true);
      setError(null);
      await apiClient.post("/api/admin/users", {
        employeeCode: createForm.employeeCode.trim() || undefined,
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        roleCode: createForm.roleCode,
        shopId: resolvedShopId,
        initialPassword: createForm.initialPassword || undefined,
      });
      toast.success("Tạo tài khoản thành công!");
      setShowCreateModal(false);
      setShowAdminConfirm(false);
      setCreateForm({ employeeCode: "", fullName: "", email: "", phone: "", roleCode: "SALES_STAFF", initialPassword: "", shopId: "" });
      loadUsers(); loadStats();
    } catch (e: any) {
      setError(e.message || "Không thể tạo tài khoản");
      toast.error(e.message || "Không thể tạo tài khoản");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    const cleanName = createForm.fullName.trim();
    const cleanEmail = createForm.email.trim();
    const cleanPhone = createForm.phone.trim();
    if (!cleanName || !cleanEmail) {
      toast.error("Vui lòng nhập đầy đủ Họ tên và Email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Địa chỉ Email không hợp lệ");
      return;
    }
    if (cleanPhone && !/^[0-9+\s\-]{8,15}$/.test(cleanPhone)) {
      toast.error("Số điện thoại không hợp lệ (8-15 chữ số)");
      return;
    }

    const isSystemRole = ["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode);
    if (isSystemRole) {
      setShowAdminConfirm(true);
      return;
    }

    await submitCreateUser();
  };

  const handleLock = async () => {
    if (!lockUserId || !lockReason.trim()) { toast.error("Vui lòng nhập lý do khóa"); return; }
    if (currentUser && String(lockUserId) === String(currentUser.id)) {
      toast.error("Không thể tự khóa tài khoản của chính mình!");
      return;
    }
    try {
      setLocking(true);
      await apiClient.patch(`/api/admin/users/${lockUserId}/status`, { status: "LOCKED", lockReason: lockReason.trim() });
      toast.success("Đã khóa tài khoản");
      setLockUserId(null); setLockReason("");
      loadUsers(); loadStats();
    } catch (e: any) { toast.error(e.message || "Không thể khóa tài khoản"); }
    finally { setLocking(false); }
  };

  const handleUnlock = async () => {
    if (!unlockUserId) return;
    try {
      setUnlocking(true);
      await apiClient.patch(`/api/admin/users/${unlockUserId}/status`, { status: "ACTIVE" });
      toast.success("Đã mở khóa tài khoản");
      setUnlockUserId(null);
      loadUsers(); loadStats();
    } catch (e: any) { toast.error(e.message || "Không thể mở khóa"); }
    finally { setUnlocking(false); }
  };

  const confirmResetPassword = async () => {
    if (!resetTargetUser) return;
    try {
      setResettingPwd(true);
      const res = await apiClient.post<{ temporaryPassword: string }>(`/api/admin/users/${resetTargetUser.id}/reset-password`, {});
      setTempPwd(res.temporaryPassword);
      setTempName(resetTargetUser.fullName);
      setResetTargetUser(null);
      loadUsers();
    } catch (e: any) {
      toast.error(e.message || "Không thể reset mật khẩu");
    } finally {
      setResettingPwd(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    if (currentUser && String(deleteUserId) === String(currentUser.id)) {
      toast.error("Không thể xóa tài khoản đang đăng nhập!");
      return;
    }
    try {
      setDeleting(true);
      await apiClient.delete(`/api/admin/users/${deleteUserId}`);
      toast.success("Xóa tài khoản thành công!");
      setDeleteUserId(null); setDeleteUserName("");
      loadUsers(); loadStats();
    } catch (e: any) { toast.error(e.message || "Không thể xóa tài khoản"); }
    finally { setDeleting(false); }
  };

  const handleUpdateQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotaUser) return;
    const num = parseFloat(quotaAmt);
    if (isNaN(num) || num < 0) { toast.error("Hạn mức không hợp lệ"); return; }
    try {
      setQuotaLoading(true);
      await apiClient.put(`/api/admin/cskh/quota/${quotaUser.id}`, { quotaAmount: num, period: quotaPeriod });
      toast.success("Cập nhật quota thành công!");
      setQuotaUser(null);
    } catch (e: any) { toast.error(e.message || "Không thể cập nhật quota"); }
    finally { setQuotaLoading(false); }
  };

  /* ── role actions ── */
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingRole) return;
    const normCode = createRoleForm.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const cleanName = createRoleForm.name.trim();
    if (!normCode || !cleanName) {
      toast.error("Vui lòng nhập Mã vai trò và Tên vai trò");
      return;
    }
    if (roles.some(r => r.code.toUpperCase() === normCode)) {
      toast.error(`Mã vai trò "${normCode}" đã tồn tại`);
      return;
    }
    try {
      setCreatingRole(true);
      await apiClient.post("/api/admin/rbac/roles", {
        code: normCode,
        name: cleanName,
        description: createRoleForm.description.trim(),
      });
      toast.success("Tạo vai trò thành công!");
      setShowCreateRole(false);
      setCreateRoleForm({ code: "", name: "", description: "" });
      loadRoles();
    } catch (e: any) { toast.error(e.message || "Không thể tạo vai trò"); }
    finally { setCreatingRole(false); }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleCode) return;
    if (PROTECTED_SYSTEM_ROLES.includes(deleteRoleCode.toUpperCase())) {
      toast.error("Không thể xóa vai trò mặc định của hệ thống!");
      setDeleteRoleCode(null);
      return;
    }
    try {
      setDeletingRole(true);
      await apiClient.delete(`/api/admin/rbac/roles/${deleteRoleCode}`);
      toast.success("Xóa vai trò thành công!");
      if (selectedRole?.code === deleteRoleCode) setSelectedRole(null);
      setDeleteRoleCode(null);
      loadRoles();
    } catch (e: any) { toast.error(e.message || "Không thể xóa vai trò"); }
    finally { setDeletingRole(false); }
  };

  const togglePerm = async (roleCode: string, permCode: string, has: boolean) => {
    if ((roleCode === "ADMIN" || roleCode === "SUPER_ADMIN") && (permCode === "MANAGE_USER" || permCode === "MANAGE_ROLE_PERMISSION") && has) {
      toast.error("Không thể thu hồi quyền Quản trị tối cao của vai trò ADMIN!");
      return;
    }
    try {
      setToggling(permCode);
      if (has) await apiClient.delete(`/api/admin/rbac/roles/${roleCode}/permissions/${permCode}`);
      else await apiClient.post(`/api/admin/rbac/roles/${roleCode}/permissions`, { permission: permCode });
      toast.success(has ? `Đã thu hồi: ${permCode}` : `Đã cấp: ${permCode}`);
      loadRoles(true);
    } catch (e: any) { toast.error(e.message || "Không thể cập nhật quyền"); }
    finally { setToggling(null); }
  };

  /* ── helpers ── */
  const fmt = (s: string) => s ? new Date(s).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  }) : "—";

  const avatarGrad = (role: string) => ROLE_AVATAR[role] || "from-gray-400 to-gray-500";
  const roleBadge  = (role: string) => ROLE_STYLE[role]  || "bg-slate-50 text-slate-700 border-slate-200";

  /* ── columns for DataTable ── */
  const userColumns: Column<UserAdminDto>[] = [
    {
      key: "employee",
      header: "Nhân viên",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGrad(u.role)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {u.fullName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{u.fullName}</div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
              <span className="font-mono">{u.employeeCode || "—"}</span>
              <span>·</span>
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[160px]">{u.email}</span>
            </div>
            {u.mustChangePassword && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                <RefreshCw className="w-2.5 h-2.5" /> Đổi mật khẩu lần tới
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Vai trò",
      render: (u) => (
        <div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${roleBadge(u.role)}`}>
            <Shield className="w-3 h-3" />
            {getRoleDisplayName(u.role)}
          </span>
          <div className="text-[11px] text-slate-400 mt-1">{u.permissions?.length || 0} quyền</div>
        </div>
      ),
    },
    {
      key: "shop",
      header: "Chi nhánh",
      render: (u) => (
        u.shopId ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            <Building className="w-3 h-3" /> Shop #{u.shopId}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs bg-slate-900 text-white px-2.5 py-1 rounded-md">
            <Crown className="w-3 h-3" /> HQ
          </span>
        )
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (u) => (
        u.status === "ACTIVE" ? (
          <StatusBadge status="ACTIVE" label="Hoạt động" />
        ) : (
          <div>
            <StatusBadge status="LOCKED" label="Đã khóa" />
            {u.lockReason && (
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-[140px] truncate" title={u.lockReason}>
                {u.lockReason}
              </p>
            )}
          </div>
        )
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
        canManage ? (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setViewUser(u)}
              title="Xem chi tiết"
              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
            {(u.role === "CSKH_STAFF" || u.role === "ADMIN") && (
              <button
                type="button"
                onClick={() => {
                  setQuotaUser(u);
                  setQuotaAmt("3000000");
                  setQuotaPeriod(new Date().toISOString().slice(0, 7));
                }}
                title="Quota CSKH"
                className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
              >
                <Key className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setResetTargetUser(u)}
              title="Reset mật khẩu"
              className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {u.status === "ACTIVE" ? (
              (!currentUser || String(u.id) !== String(currentUser.id)) && u.role !== "SUPER_ADMIN" && (
                <button
                  type="button"
                  onClick={() => setLockUserId(u.id)}
                  title="Khóa tài khoản"
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setUnlockUserId(u.id)}
                title="Mở khóa"
                className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
              >
                <Unlock className="w-4 h-4" />
              </button>
            )}
            {u.role !== "ADMIN" && u.role !== "SUPER_ADMIN" && (!currentUser || String(u.id) !== String(currentUser.id)) && (
              <button
                type="button"
                onClick={() => { setDeleteUserId(u.id); setDeleteUserName(u.fullName); }}
                title="Xóa tài khoản"
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : null
      ),
    },
  ];

  /* ════════════════ RENDER ════════════════ */
  return (
    <PermissionGuard requiredPermissions={["MANAGE_USER", "MANAGE_ROLE_PERMISSION"]}>
      <div className="p-6 space-y-5 bg-[#F8FAFC] min-h-screen">

        {/* Filter Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-2">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            
            {/* Left side: Filters */}
            <div className="flex flex-1 flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 max-w-md">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Tìm kiếm</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Tên, username, email, SĐT..."
                    className="w-full h-9 pl-9 pr-3 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              <div className="w-full md:w-56">
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Vai trò</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
                >
                  <option value="">Tất cả vai trò</option>
                  {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </div>
            </div>

            {/* Right side: Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
              <button
                onClick={() => loadUsers()}
                className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" /> Lọc
              </button>
              <button
                onClick={() => { setKeyword(""); setRoleFilter(""); setStatusFilter(""); }}
                className="h-9 px-4 bg-white hover:bg-slate-50 text-slate-600 font-medium text-sm rounded-lg border border-slate-200 transition-colors"
              >
                Xóa
              </button>
              
              {canManage && (
                <>
                  <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="h-9 px-4 bg-primary hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Thêm tài khoản
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Table Card exact match to image */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-[#1e293b]">Danh sách tài khoản</h2>
            <span className="bg-[#f1f5f9] text-[#475569] px-2.5 py-0.5 rounded-full text-xs font-semibold">
              {totalElements} người dùng
            </span>
          </div>
          
          <DataTable<UserAdminDto>
            columns={userColumns}
            data={users}
            loading={loadingUsers}
            rowKey={(u) => u.id}
            emptyTitle="Không có tài khoản nào"
            emptyMessage="Vui lòng điều chỉnh bộ lọc tìm kiếm."
            pagination={{
              currentPage: page,
              totalPages: totalPages,
              onPageChange: (p) => setPage(p),
            }}
          />
        </div>
      {/* MODALS */}

        {/* Create User */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Tạo nhân viên mới</h2>
                    <p className="text-xs text-slate-500">Điền đầy đủ thông tin bên dưới</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mã nhân viên</label>
                    <input type="text" value={createForm.employeeCode}
                      onChange={e => setCreateForm({ ...createForm, employeeCode: e.target.value })}
                      placeholder="NV-009"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Họ và tên *</label>
                    <input type="text" required value={createForm.fullName}
                      onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
                    <input type="email" required value={createForm.email}
                      onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="email@domain.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Số điện thoại</label>
                    <input type="text" value={createForm.phone}
                      onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="0987654321"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Vai trò *</label>
                  <select value={createForm.roleCode}
                    onChange={e => setCreateForm(prev => ({ ...prev, roleCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                  >
                    {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                </div>

                {SHOP_BOUND_ROLES.includes(createForm.roleCode) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Chi nhánh *</label>
                    <select value={createForm.shopId}
                      onChange={e => setCreateForm(prev => ({ ...prev, shopId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                    >
                      <option value="">-- Chọn chi nhánh --</option>
                      {shops.map(sh => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
                    </select>
                  </div>
                )}

                {["ADMIN", "SUPER_ADMIN"].includes(createForm.roleCode) && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium leading-relaxed">
                      ⚠️ <strong>Cảnh báo quyền hạn cấp cao:</strong> Vai trò {createForm.roleCode} có quyền quản trị tối cao trên toàn hệ thống. Hệ thống sẽ yêu cầu xác nhận bước 2 trước khi tạo.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mật khẩu ban đầu</label>
                  <input type="password" value={createForm.initialPassword}
                    onChange={e => setCreateForm({ ...createForm, initialPassword: e.target.value })}
                    placeholder="Để trống dùng mặc định"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                    💡 Tài khoản mới sẽ bị yêu cầu đổi mật khẩu ở lần đầu đăng nhập.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
                    Hủy
                  </button>
                  <button type="submit" disabled={creating}
                    className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                    {creating ? "Đang tạo..." : "Tạo tài khoản"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Role */}
        {showCreateRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Tạo vai trò mới</h2>
                </div>
                <button onClick={() => setShowCreateRole(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateRole} className="px-6 py-4 space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mã CODE *</label>
                  <input type="text" required value={createRoleForm.code}
                    onChange={e => setCreateRoleForm({ ...createRoleForm, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                    placeholder="VD: STORE_MANAGER"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono uppercase text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Viết hoa, không dấu, dùng dấu gạch dưới.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên hiển thị *</label>
                  <input type="text" required value={createRoleForm.name}
                    onChange={e => setCreateRoleForm({ ...createRoleForm, name: e.target.value })}
                    placeholder="VD: Quản lý Cửa hàng"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mô tả</label>
                  <textarea rows={2} value={createRoleForm.description}
                    onChange={e => setCreateRoleForm({ ...createRoleForm, description: e.target.value })}
                    placeholder="Mô tả vai trò này..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowCreateRole(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Hủy</button>
                  <button type="submit" disabled={creatingRole}
                    className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 shadow-sm">
                    {creatingRole ? "Đang tạo..." : "Tạo vai trò"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lock */}
        {lockUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900 mb-1">Khóa tài khoản</h2>
                <p className="text-sm text-slate-500 mb-4">Vui lòng cung cấp lý do để tiếp tục.</p>
                <textarea rows={3} value={lockReason}
                  onChange={e => setLockReason(e.target.value)}
                  placeholder="VD: Vi phạm quy định bảo mật..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-4"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setLockUserId(null); setLockReason(""); }}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Hủy</button>
                  <button onClick={handleLock} disabled={locking}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                    {locking ? "Đang khóa..." : "Khóa ngay"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Temp password */}
        {tempPwd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-slate-200 text-center p-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Mật khẩu tạm thời</h2>
              <p className="text-sm text-slate-500 mb-4">
                Gửi cho <span className="font-semibold text-slate-700">{tempName}</span>. Chỉ hiện 1 lần.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-xl text-slate-900 select-all mb-4">
                {tempPwd}
              </div>
              <button onClick={() => { setTempPwd(null); setTempName(""); }}
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
                Hoàn tất
              </button>
            </div>
          </div>
        )}

        {/* View user */}
        {viewUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Chi tiết nhân sự</h2>
                <button onClick={() => setViewUser(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
                {/* Avatar + name */}
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${avatarGrad(viewUser.role)} flex items-center justify-center text-white font-bold text-xl shrink-0`}>
                    {viewUser.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{viewUser.fullName}</p>
                    <p className="text-xs font-mono text-slate-400">{viewUser.employeeCode || "—"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${roleBadge(viewUser.role)}`}>
                        {viewUser.role.replace(/_/g, " ")}
                      </span>
                      {viewUser.status === "ACTIVE"
                        ? <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Hoạt động</span>
                        : <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Đã khóa</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Email", value: viewUser.email },
                    { label: "Điện thoại", value: viewUser.phone || "—" },
                    { label: "Chi nhánh", value: viewUser.shopId ? `Shop #${viewUser.shopId}` : "Headquarter" },
                    { label: "Ngày tạo", value: fmt(viewUser.createdAt) },
                  ].map(f => (
                    <div key={f.label} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</p>
                      <p className="text-sm font-medium text-slate-900 break-all">{f.value}</p>
                    </div>
                  ))}
                </div>

                {/* Permissions */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Quyền hạn ({viewUser.permissions?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewUser.permissions?.length
                      ? viewUser.permissions.map(p => (
                          <span key={p} className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px] font-mono text-blue-700">{p}</span>
                        ))
                      : <span className="text-xs text-slate-400 italic">Không có quyền</span>
                    }
                  </div>
                </div>

                {/* Lock reason */}
                {viewUser.status === "LOCKED" && viewUser.lockReason && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Lý do khóa</p>
                    <p className="text-sm text-red-800">{viewUser.lockReason}</p>
                    {viewUser.lockedBy && <p className="text-xs text-red-500 mt-1">Bởi: {viewUser.lockedBy}</p>}
                    {viewUser.lockedAt && <p className="text-xs text-red-500">Lúc: {fmt(viewUser.lockedAt)}</p>}
                  </div>
                )}
              </div>
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
                <button onClick={() => setViewUser(null)}
                  className="w-full py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSKH Quota */}
        {quotaUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Key className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Quota CSKH</h2>
                    <p className="text-xs text-slate-500">{quotaUser.fullName}</p>
                  </div>
                </div>
                <button onClick={() => setQuotaUser(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateQuota} className="px-6 py-4 space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kỳ áp dụng *</label>
                  <input type="month" required value={quotaPeriod}
                    onChange={e => setQuotaPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hạn mức (VNĐ) *</label>
                  <input type="number" required min="0" step="50000" value={quotaAmt}
                    onChange={e => setQuotaAmt(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                  />
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setQuotaUser(null)}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Hủy</button>
                  <button type="submit" disabled={quotaLoading}
                    className="flex-[2] py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                    {quotaLoading ? "Đang lưu..." : "Cập nhật Quota"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm modals */}
        <ConfirmModal isOpen={!!unlockUserId} onClose={() => setUnlockUserId(null)} onConfirm={handleUnlock}
          title="Mở khóa tài khoản" message="Người dùng sẽ có thể đăng nhập trở lại."
          confirmText="Mở khóa" cancelText="Hủy" isLoading={unlocking} type="info" />

        <ConfirmModal isOpen={!!resetTargetUser} onClose={() => setResetTargetUser(null)} onConfirm={confirmResetPassword}
          title="Cấp lại mật khẩu tạm thời" message={`Bạn có chắc chắn muốn cấp lại mật khẩu tạm thời cho nhân viên "${resetTargetUser?.fullName}" (${resetTargetUser?.email})?`}
          confirmText="Cấp mật khẩu tạm" cancelText="Hủy" isLoading={resettingPwd} type="warning" />

        <ConfirmModal isOpen={!!deleteUserId} onClose={() => { setDeleteUserId(null); setDeleteUserName(""); }} onConfirm={handleDeleteUser}
          title="Xóa tài khoản" message={`Xóa tài khoản "${deleteUserName}"? Không thể hoàn tác.`}
          confirmText="Xóa tài khoản" cancelText="Hủy" isLoading={deleting} type="danger" />

        <ConfirmModal isOpen={!!deleteRoleCode} onClose={() => setDeleteRoleCode(null)} onConfirm={handleDeleteRole}
          title="Xóa vai trò" message={`Xóa vai trò "${deleteRoleCode}"? Có thể ảnh hưởng đến các tài khoản đang dùng vai trò này.`}
          confirmText="Xóa vai trò" cancelText="Hủy" isLoading={deletingRole} type="danger" />

        {/* Double-confirm modal for high-privilege roles */}
        <ConfirmModal
          isOpen={showAdminConfirm}
          onClose={() => setShowAdminConfirm(false)}
          onConfirm={submitCreateUser}
          title="Xác nhận cấp quyền Quản trị viên Tối cao"
          message={`Bạn đang chuẩn bị tạo tài khoản "${createForm.fullName}" (${createForm.email}) với vai trò QUẢN TRỊ TỐI CAO (${createForm.roleCode}). Tài khoản này sẽ có toàn quyền kiểm soát hệ thống và dữ liệu. Bạn có chắc chắn muốn tiếp tục?`}
          confirmText="Xác nhận cấp quyền"
          cancelText="Hủy"
          isLoading={creating}
          type="danger"
        />

      </div>
    </PermissionGuard>
  );
}
