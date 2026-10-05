'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, X, RefreshCw, Save, Lock } from 'lucide-react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveRole } from '@/lib/auth';

interface Supplier {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  productType?: string | null;
  description?: string | null;
  /** null = shared across all branches; a number = private to that branch. */
  shopId?: number | null;
  productCount?: number;
}

interface DeleteCheck { canDelete: boolean; reason?: string | null; productCount: number }

interface FormState {
  name: string;
  phone: string;
  email: string;
  productType: string;
  address: string;
  description: string;
}

const emptyForm: FormState = { name: '', phone: '', email: '', productType: '', address: '', description: '' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{8,15}$/;

const inputClass =
  'w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]';
const labelClass = 'block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1.5';

export default function SuppliersPage() {
  const { user } = useAuth();
  const isAdmin = getActiveRole(user?.role ? [user.role] : (user as any)?.roles) === 'ADMIN';
  /**
   * A SHOP_OWNER may edit shared suppliers and the ones private to their own branch, but never
   * another branch's; only their own branch's suppliers can be deleted, because deleting a
   * shared one would remove it for every branch. ADMIN may change everything.
   * (The backend enforces the same rules.)
   */
  const canEditSupplier = (item: Supplier) =>
    isAdmin || item.shopId == null || item.shopId === user?.shopId;
  const canDeleteSupplier = (item: Supplier) =>
    isAdmin || (item.shopId != null && item.shopId === user?.shopId);

  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<Supplier | null>(null);
  const [deleteCheck, setDeleteCheck] = useState<DeleteCheck | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    try {
      const res = await apiClient.get<any>(`/api/suppliers?page=${page}&size=20&keyword=${encodeURIComponent(keyword.trim())}`);
      setData(res?.items ?? (Array.isArray(res) ? res : []));
      setTotalPages(Math.max(1, Number(res?.totalPages ?? 1)));
      setTotalItems(Number(res?.totalItems ?? res?.items?.length ?? 0));
      setLoadError(null);
    } catch (err: any) {
      // Never pretend the list is empty when the request actually failed.
      setData([]);
      setLoadError(err?.message || 'Không thể tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const openModal = (item?: Supplier) => {
    setSubmitted(false);
    if (item) {
      setEditingItem(item);
      setForm({
        name: item.name ?? '',
        phone: item.phone ?? '',
        email: item.email ?? '',
        productType: item.productType ?? '',
        address: item.address ?? '',
        description: item.description ?? '',
      });
    } else {
      setEditingItem(null);
      setForm(emptyForm);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingItem(null); };

  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.name.trim()) errors.name = 'Nhập tên nhà cung cấp.';
  else if (form.name.trim().length > 255) errors.name = 'Tên tối đa 255 ký tự.';
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) errors.email = 'Email không đúng định dạng.';
  if (form.phone.trim() && !PHONE_RE.test(form.phone.trim().replace(/[\s.()-]/g, ''))) errors.phone = 'Số điện thoại gồm 8–15 chữ số.';
  const hasErrors = Object.keys(errors).length > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim().replace(/[\s.()-]/g, ''),
      email: form.email.trim(),
      productType: form.productType.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
    };

    setIsSaving(true);
    try {
      if (editingItem) {
        await apiClient.put(`/api/suppliers/${editingItem.id}`, payload);
        toast.success('Cập nhật nhà cung cấp thành công');
      } else {
        await apiClient.post('/api/suppliers', payload);
        toast.success('Thêm nhà cung cấp mới thành công');
      }
      closeModal();
      fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu thông tin nhà cung cấp');
    } finally {
      setIsSaving(false);
    }
  };

  const openDelete = async (item: Supplier) => {
    setItemToDelete(item);
    setDeleteCheck(null);
    try {
      setDeleteCheck(await apiClient.get<DeleteCheck>(`/api/suppliers/${item.id}/delete-check`));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể kiểm tra điều kiện xóa');
      setItemToDelete(null);
    }
  };
  const closeDelete = () => { setItemToDelete(null); setDeleteCheck(null); };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/suppliers/${itemToDelete.id}`);
      toast.success('Đã xóa nhà cung cấp');
      closeDelete();
      if (data.length === 1 && page > 0) setPage(page - 1);
      else fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Xóa nhà cung cấp thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  const fieldError = (k: keyof FormState) =>
    submitted && errors[k] ? <p className="mt-1 text-xs font-medium text-[#BD001F]" role="alert">{errors[k]}</p> : null;
  const border = (k: keyof FormState) => (submitted && errors[k] ? 'border-[#E50027]' : '');

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Nhà cung cấp',
      width: '26%',
      render: (item) => (
        <div className="min-w-0">
          <div className="font-bold text-zinc-900 break-words">{item.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
            <span className="font-mono">#{item.id}</span>
            {item.shopId == null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                <Lock className="w-3 h-3" /> Dùng chung
              </span>
            ) : (
              <span className="rounded-full bg-[#FFF0F2] px-2 py-0.5 font-medium text-[#BD001F]">Riêng</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'productType',
      header: 'Loại mặt hàng',
      width: '18%',
      render: (item) =>
        item.productType ? (
          <span className="text-sm text-zinc-700 line-clamp-2" title={item.productType}>{item.productType}</span>
        ) : (
          <span className="text-zinc-300 text-xs">—</span>
        ),
    },
    {
      key: 'contact',
      header: 'Liên hệ',
      width: '22%',
      render: (item) => (
        <div className="min-w-0 space-y-0.5 text-xs">
          {item.phone ? <a href={`tel:${item.phone}`} className="block font-medium text-zinc-800 hover:underline">{item.phone}</a> : <span className="block text-zinc-300">—</span>}
          {item.email && <a href={`mailto:${item.email}`} className="block truncate text-zinc-500 hover:underline" title={item.email}>{item.email}</a>}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      width: '18%',
      render: (item) => (
        <span className="text-xs text-zinc-500 line-clamp-2" title={item.address ?? undefined}>{item.address || '—'}</span>
      ),
    },
    {
      key: 'productCount',
      header: 'Sản phẩm',
      width: '8%',
      align: 'right',
      render: (item) => (
        <span className="inline-flex min-w-[2rem] justify-center px-2 py-0.5 rounded-full bg-zinc-100 font-semibold text-zinc-800 text-xs tabular-nums">
          {item.productCount ?? 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: '96px',
      align: 'right',
      render: (item) =>
        canEditSupplier(item) ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => openModal(item)}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              title="Sửa" aria-label="Sửa"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {canDeleteSupplier(item) ? (
              <button
                onClick={() => openDelete(item)}
                className="p-1.5 text-zinc-400 hover:text-[#E50027] hover:bg-[#FFF0F2] rounded-lg transition-colors"
                title="Xóa" aria-label="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <span className="p-1.5 text-zinc-200" title="Nhà cung cấp dùng chung: chỉ Quản trị viên được xóa">
                <Trash2 className="w-4 h-4" />
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs italic text-zinc-300" title="Nhà cung cấp của cửa hàng khác, bạn chỉ xem được">
            Chỉ xem
          </span>
        ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">

        <PageHeader
          title="Quản lý Nhà cung cấp"
          subtitle={
            isAdmin
              ? 'Đối tác cung ứng vải, nguyên phụ liệu và đóng gói (dùng chung + riêng từng cửa hàng).'
              : 'Nhà cung cấp dùng chung chỉ xem được; bạn thêm, sửa, xóa được nhà cung cấp riêng của mình.'
          }
          badge={isAdmin ? 'HỆ THỐNG' : undefined}
          actions={
            <div className="flex items-center gap-2.5">
              <Button variant="outline" onClick={fetchData} loading={loading} icon={<RefreshCw className="w-4 h-4" />}>
                Làm mới
              </Button>
              <Button onClick={() => openModal()} icon={<Plus className="w-4 h-4" />}>
                Thêm mới
              </Button>
            </div>
          }
        />

        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F4C0C8] bg-[#FFF0F2] px-4 py-3 text-sm text-[#950019]">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={fetchData}>Thử lại</Button>
          </div>
        )}

        <DataTable<Supplier>
          data={data}
          columns={columns}
          loading={loading}
          fixedLayout
          rowKey={(item) => item.id}
          searchQuery={keyword}
          onSearchChange={(v) => { setKeyword(v); setPage(0); }}
          searchPlaceholder="Tìm theo tên, loại hàng, email..."
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            onPageChange: (p) => setPage(p),
          }}
          emptyTitle={keyword.trim() ? 'Không có kết quả phù hợp' : 'Chưa có nhà cung cấp nào'}
          emptyMessage={
            keyword.trim()
              ? `Không có nhà cung cấp nào khớp với "${keyword.trim()}".`
              : 'Nhấn Thêm mới để tạo nhà cung cấp đầu tiên.'
          }
        />

        {isModalOpen && (!editingItem || canEditSupplier(editingItem)) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                <h3 className="text-sm font-semibold text-zinc-900">
                  {editingItem ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
                </h3>
                <button type="button" onClick={closeModal} aria-label="Đóng"
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4" noValidate>
                <div>
                  <label className={labelClass}>Tên nhà cung cấp <span className="text-[#E50027]">*</span></label>
                  <input
                    type="text" value={form.name} maxLength={255}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`${inputClass} ${border('name')}`}
                    placeholder="VD: Cung ứng vải Tân Bình"
                  />
                  {fieldError('name')}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Số điện thoại</label>
                    <input
                      type="tel" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={`${inputClass} font-mono ${border('phone')}`}
                      placeholder="0901234567"
                    />
                    {fieldError('phone')}
                  </div>
                  <div>
                    <label className={labelClass}>Loại hàng</label>
                    <input
                      type="text" value={form.productType} maxLength={150}
                      onChange={(e) => setForm({ ...form, productType: e.target.value })}
                      className={inputClass}
                      placeholder="Vải cotton / Phụ liệu"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Email liên hệ</label>
                  <input
                    type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`${inputClass} ${border('email')}`}
                    placeholder="supplier@textile.vn"
                  />
                  {fieldError('email')}
                </div>

                <div>
                  <label className={labelClass}>Địa chỉ</label>
                  <input
                    type="text" value={form.address} maxLength={255}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className={inputClass}
                    placeholder="Quận Tân Bình, TP.HCM"
                  />
                </div>

                <div>
                  <label className={labelClass}>Mô tả / Ghi chú</label>
                  <textarea
                    rows={2} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={`${inputClass} resize-none`}
                    placeholder="Chính sách thanh toán, chiết khấu..."
                  />
                </div>

                {!editingItem && !isAdmin && (
                  <p className="text-xs text-zinc-500">Nhà cung cấp mới sẽ là nhà cung cấp riêng của bạn.</p>
                )}
                {editingItem && editingItem.shopId == null && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Đây là nhà cung cấp dùng chung: thay đổi sẽ áp dụng cho tất cả.
                  </p>
                )}

                <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>Hủy</Button>
                  <Button type="submit" loading={isSaving} icon={<Save className="w-4 h-4" />}>Lưu thông tin</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={!!itemToDelete && !!deleteCheck}
          title={deleteCheck?.canDelete ? 'Xóa nhà cung cấp' : 'Không thể xóa nhà cung cấp'}
          message={
            deleteCheck?.canDelete
              ? `Bạn có chắc muốn xóa nhà cung cấp "${itemToDelete?.name}" không?`
              : (
                <div className="space-y-2">
                  <p>{deleteCheck?.reason}</p>
                  <p className="text-xs text-slate-500">Sản phẩm đang dùng: {deleteCheck?.productCount ?? 0}</p>
                </div>
              )
          }
          confirmText={deleteCheck?.canDelete ? 'Xác nhận xóa' : 'Đã hiểu'}
          cancelText="Hủy"
          type={deleteCheck?.canDelete ? 'danger' : 'warning'}
          isLoading={isDeleting}
          onConfirm={deleteCheck?.canDelete ? handleDelete : closeDelete}
          onClose={closeDelete}
        />

      </div>
    </PermissionGuard>
  );
}
