"use client";

import { useEffect, useState, useMemo } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";
import { toast } from "sonner";
import { 
  Search, Plus, Copy, Edit2, Trash2, CheckCircle2, XCircle,
  Ticket, TrendingUp, DollarSign, Calendar, LayoutGrid, Tag, Target,
  RefreshCw, Power
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";

// Types
type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIP";
// Mirrors MarketingService.validateVoucherTransition: staff toggle ACTIVE <-> PAUSED; the rest are
// terminal or belong to shop-owner approval. Sending "INACTIVE" was always rejected.
type VoucherStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED" | "PENDING_APPROVAL" | "REJECTED";
const STATUS_LABEL: Record<VoucherStatus, string> = {
  ACTIVE: "Kích hoạt", PAUSED: "Tạm dừng", CANCELLED: "Đã hủy", EXPIRED: "Hết hạn",
  PENDING_APPROVAL: "Chờ duyệt", REJECTED: "Bị từ chối",
};
const canToggle = (s: VoucherStatus) => s === "ACTIVE" || s === "PAUSED";
const STATUS_TONE: Record<VoucherStatus, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success", PAUSED: "neutral", CANCELLED: "danger", EXPIRED: "danger",
  PENDING_APPROVAL: "warning", REJECTED: "danger",
};

interface Voucher {
  id: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderValue: number;
  maxUsage: number;
  usageCount: number;
  expiresAt: string;
  status: VoucherStatus;
  isPublic?: boolean;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<Partial<Voucher>>({
    code: "",
    name: "",
    discountType: "PERCENTAGE",
    discountValue: 0,
    minOrderValue: 0,
    maxUsage: 100,
    maxDiscountAmount: 0,
    expiresAt: new Date().toISOString().slice(0, 16),
    isPublic: true,
  });

  const fetchData = async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`${baseUrl}/api/marketing/admin/vouchers`, { headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể tải danh sách mã giảm giá");
      }
      const data = await res.json();
      const voucherList = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setVouchers(voucherList);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi tải danh sách voucher");
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Đã copy mã voucher: " + code);
  };

  const handleOpenModal = (voucher?: Voucher) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setFormData({
        ...voucher,
        // Prefilling 1970 for a voucher without expiry would expire it on save.
        expiresAt: voucher.expiresAt ? new Date(voucher.expiresAt).toISOString().slice(0, 16) : "",
      });
    } else {
      setEditingVoucher(null);
      setFormData({
        code: "",
        name: "",
        discountType: "PERCENTAGE",
        discountValue: 0,
        minOrderValue: 0,
        maxUsage: 100,
        maxDiscountAmount: 0,
        expiresAt: new Date().toISOString().slice(0, 16),
        isPublic: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code?.trim() || !formData.name?.trim()) {
      toast.error("Vui lòng điền mã và tên voucher");
      return;
    }

    const isEditing = !!editingVoucher;
    const url = isEditing
      ? `${getApiBaseUrl()}/api/marketing/admin/vouchers/${editingVoucher.id}`
      : `${getApiBaseUrl()}/api/marketing/admin/vouchers`;
    const method = isEditing ? "PUT" : "POST";
    const headers = {
      ...(getAuthHeaders() as Record<string, string>),
      "Content-Type": "application/json",
    };
    
    const payload = {
      code: formData.code?.toUpperCase().trim() || "",
      name: formData.name?.trim() || "",
      discountType: formData.discountType as DiscountType,
      discountValue: Number(formData.discountValue),
      minOrderValue: Number(formData.minOrderValue),
      maxUsage: Number(formData.maxUsage),
      maxDiscountAmount: Number(formData.maxDiscountAmount),
      expiresAt: new Date(formData.expiresAt as string).toISOString(),
      isPublic: !!formData.isPublic,
    };

    setIsSaving(true);
    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Lỗi khi lưu voucher");
      }
      // New vouchers from marketing staff wait in the store owner approval queue before going live.
      toast.success(isEditing ? "Cập nhật voucher thành công" : "Đã tạo voucher và gửi chủ cửa hàng phê duyệt");
      setIsModalOpen(false);
      await fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || "Không thể lưu voucher");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: VoucherStatus) => {
    const newStatus: VoucherStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const url = `${getApiBaseUrl()}/api/marketing/admin/vouchers/${id}/status`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { ...(getAuthHeaders() as Record<string, string>), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể thay đổi trạng thái");
      }
      setVouchers(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
      toast.success(`Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'tạm dừng'} voucher`);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi đổi trạng thái voucher");
    }
  };

  const handleDelete = async () => {
    if (!voucherToDelete) return;
    
    setIsDeleting(true);
    try {
      const url = `${getApiBaseUrl()}/api/marketing/admin/vouchers/${voucherToDelete.id}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders() as Record<string, string>,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể xóa voucher");
      }
      setVouchers(prev => prev.filter(v => v.id !== voucherToDelete.id));
      setIsDeleteModalOpen(false);
      setVoucherToDelete(null);
      toast.success("Đã xóa voucher thành công");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xóa voucher");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const matchSearch = !search || 
        v.code.toLowerCase().includes(search.toLowerCase()) || 
        v.name.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "ALL" || v.discountType === filterType;
      const matchStatus = filterStatus === "ALL" || v.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [vouchers, search, filterType, filterStatus]);

  const activeCount = useMemo(() => vouchers.filter(v => v.status === "ACTIVE").length, [vouchers]);
  const totalUsages = useMemo(() => vouchers.reduce((sum, v) => sum + (v.usageCount || 0), 0), [vouchers]);

  const columns: Column<Voucher>[] = [
    {
      key: "code",
      header: "Mã / Tên voucher",
      render: (v) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {v.code}
            </span>
            <button
              onClick={() => copyToClipboard(v.code)}
              className="text-slate-400 hover:text-slate-600 transition"
              title="Sao chép mã"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-xs text-slate-600 font-medium">{v.name}</div>
        </div>
      )
    },
    {
      key: "discount",
      header: "Mức giảm",
      render: (v) => (
        <div className="text-xs">
          <span className="font-bold text-emerald-600">
            {v.discountType === "PERCENTAGE" && `${v.discountValue}%`}
            {v.discountType === "FIXED_AMOUNT" && formatCurrency(v.discountValue)}
            {v.discountType === "FREE_SHIP" && "Miễn phí ship"}
          </span>
          {!!v.maxDiscountAmount && v.maxDiscountAmount > 0 && (
            <div className="text-[11px] text-slate-400">Tối đa {formatCurrency(v.maxDiscountAmount)}</div>
          )}
        </div>
      )
    },
    {
      key: "minOrderValue",
      header: "Đơn tối thiểu",
      render: (v) => (
        <span className="text-xs font-mono text-slate-700">
          {formatCurrency(v.minOrderValue)}
        </span>
      )
    },
    {
      key: "usage",
      header: "Lượt dùng",
      render: (v) => (
        <div className="text-xs space-y-1">
          <div className="flex justify-between font-mono text-[11px] text-slate-600">
            <span>{v.usageCount} / {v.maxUsage}</span>
            <span>{Math.round((v.usageCount / (v.maxUsage || 1)) * 100)}%</span>
          </div>
          <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ width: `${Math.min(100, Math.round((v.usageCount / (v.maxUsage || 1)) * 100))}%` }} 
            />
          </div>
        </div>
      )
    },
    {
      key: "expiresAt",
      header: "Hạn sử dụng",
      render: (v) => {
        // end_date is nullable: no expiry. new Date(null) would render 1970 / "Invalid Date".
        if (!v.expiresAt) return <span className="text-xs text-slate-400">Không thời hạn</span>;
        const isExpired = new Date(v.expiresAt) < new Date();
        return (
          <span className={`text-xs ${isExpired ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
            {new Date(v.expiresAt).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
            {isExpired && <span className="block text-[10px] text-rose-500">Hết hạn</span>}
          </span>
        );
      }
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (v) => (
        <StatusBadge
          status={v.status}
          label={STATUS_LABEL[v.status] ?? v.status}
          tone={STATUS_TONE[v.status]}
        />
      )
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (v) => (
        <div className="flex items-center gap-1.5 justify-end">
          {canToggle(v.status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleStatus(v.id, v.status)}
              title={v.status === "ACTIVE" ? "Tạm dừng" : "Kích hoạt"}
              icon={<Power className="w-3.5 h-3.5" />}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenModal(v)}
            title="Sửa voucher"
            icon={<Edit2 className="w-3.5 h-3.5" />}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setVoucherToDelete(v);
              setIsDeleteModalOpen(true);
            }}
            title="Xóa voucher"
            className="text-rose-600 hover:text-rose-700"
            icon={<Trash2 className="w-3.5 h-3.5" />}
          />
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-8 space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản Lý Voucher & Mã Khuyến Mãi"
        subtitle="Quản lý cấu hình khuyến mãi, mã voucher và hạn mức phát hành toàn hệ thống"
        breadcrumbs={[
          { label: "Marketing", href: "/staff/dashboard/marketing" },
          { label: "Voucher" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenModal()}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Tạo voucher mới
            </Button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Tổng voucher"
          value={vouchers.length}
          icon={Ticket}
          color="blue"
        />
        <StatCard
          title="Đang kích hoạt"
          value={activeCount}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          title="Lượt sử dụng tích lũy"
          value={totalUsages}
          icon={TrendingUp}
          color="warning"
        />
      </div>

      {/* Filters & Data Table */}
      <DataTable<Voucher>
        columns={columns}
        data={filteredVouchers}
        rowKey={(v) => v.id}
        loading={loading}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm mã hoặc tên voucher..."
        emptyTitle="Không có voucher nào"
        emptyMessage="Chưa có mã khuyến mãi nào được tạo hoặc khớp với bộ lọc."
        filterSlot={
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="PERCENTAGE">Phần trăm</option>
              <option value="FIXED_AMOUNT">Giảm tiền mặt</option>
              <option value="FREE_SHIP">Miễn phí ship</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Kích hoạt</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="EXPIRED">Hết hạn</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
        }
      />

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                {editingVoucher ? "Chỉnh Sửa Voucher" : "Tạo Voucher Mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mã Voucher *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: SUMMER2026"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Loại giảm giá</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="PERCENTAGE">Theo Phần Trăm (%)</option>
                    <option value="FIXED_AMOUNT">Số Tiền Cố Định (VND)</option>
                    <option value="FREE_SHIP">Miễn Phí Vận Chuyển</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tên chương trình / Mô tả *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Giảm giá mùa hè cho đơn từ 500k"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {formData.discountType === "PERCENTAGE" ? "Mức giảm (%) *" : "Số tiền giảm (VND) *"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.discountValue || ""}
                    placeholder="0"
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Giảm tối đa (VND)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={formData.discountType !== "PERCENTAGE"}
                    value={formData.maxDiscountAmount || ""}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                    placeholder="0 là không giới hạn"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Đơn hàng tối thiểu (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderValue || ""}
                    placeholder="0"
                    onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số lượt dùng tối đa</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUsage || ""}
                    onChange={(e) => setFormData({ ...formData, maxUsage: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Hạn sử dụng *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <label htmlFor="isPublic" className="text-slate-700 cursor-pointer font-medium">
                  Hiển thị công khai trong danh sách voucher khách hàng
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
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
                  loading={isSaving}
                >
                  {editingVoucher ? "Cập nhật voucher" : "Tạo voucher"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setVoucherToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Xác nhận xóa voucher"
        message={`Bạn có chắc chắn muốn xóa mã voucher "${voucherToDelete?.code}"? Thao tác này không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
