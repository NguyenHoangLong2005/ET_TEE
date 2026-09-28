'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, X, Truck, RefreshCw, Save } from 'lucide-react';
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
  address?: string;
  phone?: string;
  email?: string;
  productType?: string;
  description?: string;
  /** null = nha cung ung DUNG CHUNG toan chuoi; co gia tri = rieng chi nhanh do. */
  shopId?: number | null;
}

export default function SuppliersPage() {
  const { user } = useAuth();
  const isAdmin = getActiveRole(user?.role ? [user.role] : (user as any)?.roles) === 'ADMIN';
  /**
   * SHOP_OWNER chi sua/xoa duoc nha cung ung RIENG cua dung chi nhanh minh
   * (backend: SupplierController.updateSupplier/deleteSupplier goi
   * StoreAccessGuard.assertOwnsShopForWrite, tu choi ca nha cung ung dung
   * chung lan nha cung ung chi nhanh khac). ADMIN sua/xoa duoc tat ca.
   */
  const canEditSupplier = (item: Supplier) =>
    isAdmin || (item.shopId != null && item.shopId === user?.shopId);
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  
  const [itemToDelete, setItemToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/api/suppliers?page=${page}&size=20&keyword=${encodeURIComponent(keyword)}`);
      if (res?.items) {
        setData(res.items);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.totalItems || res.items.length);
      } else if (Array.isArray(res)) {
        setData(res);
        setTotalPages(1);
        setTotalItems(res.length);
      } else if (res?.content) {
        setData(res.content);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.totalElements || res.content.length);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleOpenModal = (item?: Supplier) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = (formData.name || '').trim();
    const cleanEmail = (formData.email || '').trim();
    const cleanPhone = (formData.phone || '').trim().replace(/[\s.-]/g, '');
    if (!cleanName) {
      toast.error('Vui lòng nhập tên nhà cung cấp');
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Email nhà cung cấp không đúng định dạng');
      return;
    }

    const payload = {
      ...formData,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      address: (formData.address || '').trim(),
      productType: (formData.productType || '').trim(),
      description: (formData.description || '').trim(),
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
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({});
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu thông tin nhà cung cấp');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/suppliers/${itemToDelete.id}`);
      toast.success('Đã xóa nhà cung cấp');
      setData(prev => prev.filter(d => d.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || 'Xóa nhà cung cấp thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Tên nhà cung cấp',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900">{item.name}</div>
          <div className="text-xs text-slate-400 font-mono">#{item.id}</div>
        </div>
      ),
    },
    {
      key: 'productType',
      header: 'Loại mặt hàng',
      render: (item) => (
        item.productType ? (
          <span className="px-2.5 py-0.5 bg-cyan-50 text-cyan-800 rounded-full text-xs font-semibold border border-cyan-200">
            {item.productType}
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )
      ),
    },
    {
      key: 'phone',
      header: 'Điện thoại',
      render: (item) => (
        <span className="text-slate-800 font-mono text-xs">{item.phone || '—'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (item) => (
        <span className="text-slate-600 font-mono text-xs">{item.email || '—'}</span>
      ),
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      render: (item) => (
        <span className="text-slate-500 text-xs truncate max-w-xs inline-block" title={item.address}>
          {item.address || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (item) =>
        canEditSupplier(item) ? (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleOpenModal(item)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Sửa"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setItemToDelete(item)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Xóa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-300 italic" title="Nhà cung ứng dùng chung toàn chuỗi, chỉ Quản trị viên được sửa">
            Chỉ xem
          </span>
        ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">

        {/* Header */}
        <PageHeader
          title="Quản lý Nhà cung cấp"
          subtitle={
            isAdmin
              ? "Quản lý đối tác cung ứng vải, nguyên phụ liệu may mặc và đóng gói (dùng chung + từng chi nhánh)."
              : "Nhà cung ứng dùng chung toàn chuỗi chỉ xem được; bạn chỉ sửa/xóa được nhà cung ứng riêng của chi nhánh mình."
          }
          badge={isAdmin ? "HỆ THỐNG" : "CHI NHÁNH"}
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={fetchData}
                loading={loading}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Làm mới
              </Button>
              <Button
                onClick={() => handleOpenModal()}
                icon={<Plus className="w-4 h-4" />}
              >
                Thêm mới
              </Button>
            </div>
          }
        />

        {/* Table */}
        <DataTable<Supplier>
          data={data}
          columns={columns}
          loading={loading}
          rowKey={(item) => item.id}
          searchQuery={keyword}
          onSearchChange={(v) => { setKeyword(v); setPage(0); }}
          searchPlaceholder="Tìm kiếm nhà cung cấp theo tên, email, SĐT..."
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            onPageChange: (p) => setPage(p),
          }}
          emptyTitle="Không tìm thấy nhà cung cấp nào"
          emptyMessage="Chưa có nhà cung cấp nào hoặc không khớp với từ khóa tìm kiếm."
        />

        {/* Modal Create / Edit */}
        {isModalOpen && (!editingItem || canEditSupplier(editingItem)) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingItem ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Tên nhà cung cấp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="VD: Cung ứng vải Tân Bình"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Số điện thoại</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                      placeholder="0901234567"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Loại hàng</label>
                    <input
                      type="text"
                      value={formData.productType || ''}
                      onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Vải cotton / Phụ liệu"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Email liên hệ</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="supplier@textile.vn"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Địa chỉ</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Quận Tân Bình, TP.HCM"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Mô tả / Ghi chú</label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    placeholder="Chính sách thanh toán, chiết khấu..."
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSaving}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    loading={isSaving}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Lưu thông tin
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        <ConfirmModal
          isOpen={!!itemToDelete && canEditSupplier(itemToDelete)}
          title="Xóa nhà cung cấp"
          message={`Bạn có chắc muốn xóa nhà cung cấp "${itemToDelete?.name}" không?`}
          confirmText="Xác nhận xóa"
          cancelText="Hủy"
          type="danger"
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setItemToDelete(null)}
        />

      </div>
    </PermissionGuard>
  );
}
