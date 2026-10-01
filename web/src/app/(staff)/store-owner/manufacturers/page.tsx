'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, X, Factory, RefreshCw, Save } from 'lucide-react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Manufacturer {
  id: number;
  name: string;
  country?: string;
  website?: string;
  contactEmail?: string;
  description?: string;
  productCount?: number;
}

export default function ManufacturersPage() {
  // PermissionGuard below limits the page to SHOP_OWNER / ADMIN / SUPER_ADMIN, all of whom may manage.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Manufacturer | null>(null);
  const [formData, setFormData] = useState<Partial<Manufacturer>>({});

  const [itemToDelete, setItemToDelete] = useState<Manufacturer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    try {
      const res = await apiClient.get<any>(`/api/manufacturers?page=${page}&size=20&keyword=${encodeURIComponent(keyword)}`);
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
      setLoadError(null);
    } catch (err: any) {
      // Never pretend the list is empty when the request actually failed.
      setData([]);
      setLoadError(err?.message || 'Không thể tải danh sách nhà sản xuất');
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

  const handleOpenModal = (item?: Manufacturer) => {
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
    const cleanEmail = (formData.contactEmail || '').trim();
    if (!cleanName) {
      toast.error('Vui lòng nhập tên nhà sản xuất');
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Email liên hệ không đúng định dạng');
      return;
    }

    const payload = {
      name: cleanName,
      contactEmail: cleanEmail,
      country: (formData.country || '').trim() || 'Việt Nam',
      website: (formData.website || '').trim(),
      description: (formData.description || '').trim(),
    };

    setIsSaving(true);
    try {
      if (editingItem) {
        await apiClient.put(`/api/manufacturers/${editingItem.id}`, payload);
        toast.success('Cập nhật nhà sản xuất thành công');
      } else {
        await apiClient.post('/api/manufacturers', payload);
        toast.success('Thêm nhà sản xuất mới thành công');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({});
      fetchData(true);
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu nhà sản xuất');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/manufacturers/${itemToDelete.id}`);
      toast.success('Đã xóa nhà sản xuất');
      setItemToDelete(null);
      // Step back a page if we just removed the last row of a non-first page.
      if (data.length === 1 && page > 0) setPage(page - 1);
      else fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Xóa nhà sản xuất thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Manufacturer>[] = [
    {
      key: 'name',
      header: 'Tên nhà sản xuất',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900">{item.name}</div>
          <div className="text-xs text-slate-400 font-mono">#{item.id}</div>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Quốc gia',
      render: (item) => (
        <span className="text-slate-700 font-medium text-xs">{item.country || 'Việt Nam'}</span>
      ),
    },
    {
      key: 'website',
      header: 'Website',
      render: (item) => (
        item.website ? (
          <a
            href={item.website.startsWith('http') ? item.website : `https://${item.website}`}
            target="_blank"
            rel="noreferrer"
            className="text-[#BD001F] hover:underline text-xs truncate max-w-[200px] inline-block"
          >
            {item.website}
          </a>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )
      ),
    },
    {
      key: 'contactEmail',
      header: 'Email liên hệ',
      render: (item) => (
        <span className="text-slate-600 font-mono text-xs">{item.contactEmail || '—'}</span>
      ),
    },
    {
      key: 'productCount',
      header: 'Số sản phẩm',
      align: 'right',
      render: (item) => (
        <span className="inline-flex min-w-[2rem] justify-center px-2 py-0.5 rounded-full bg-zinc-100 font-semibold text-zinc-800 text-xs tabular-nums">
          {item.productCount || 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenModal(item)}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Sửa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setItemToDelete(item)}
            className="p-1.5 text-zinc-400 hover:text-[#E50027] hover:bg-[#FFF0F2] rounded-lg transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">

        {/* Header */}
        <PageHeader
          title="Quản lý Nhà sản xuất"
          subtitle="Quản lý các đối tác gia công và xưởng sản xuất (dùng chung toàn hệ thống). Số sản phẩm là số sản phẩm đã chọn nhà sản xuất này trong form sản phẩm."
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
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

        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F4C0C8] bg-[#FFF0F2] px-4 py-3 text-sm text-[#950019]">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={fetchData}>Thử lại</Button>
          </div>
        )}

        {/* Table */}
        <DataTable<Manufacturer>
          data={data}
          columns={columns}
          loading={loading}
          rowKey={(item) => item.id}
          searchQuery={keyword}
          onSearchChange={(v) => { setKeyword(v); setPage(0); }}
          searchPlaceholder="Tìm kiếm nhà sản xuất..."
          pagination={{
            currentPage: page,
            totalPages,
            totalItems,
            onPageChange: (p) => setPage(p),
          }}
          emptyTitle={keyword.trim() ? 'Không có kết quả phù hợp' : 'Chưa có nhà sản xuất nào'}
          emptyMessage={
            keyword.trim()
              ? `Không có nhà sản xuất nào khớp với "${keyword.trim()}".`
              : 'Nhấn Thêm mới để tạo nhà sản xuất đầu tiên.'
          }
        />

        {/* Modal Create / Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingItem ? 'Sửa nhà sản xuất' : 'Thêm nhà sản xuất mới'}
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
                    Tên nhà sản xuất <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]"
                    placeholder="VD: Xưởng may ET.TEE Sài Gòn"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Quốc gia</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]"
                      placeholder="Việt Nam"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Website</label>
                    <input
                      type="text"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]"
                      placeholder="ettee.vn"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Email liên hệ</label>
                  <input
                    type="email"
                    value={formData.contactEmail || ''}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]"
                    placeholder="contact@factory.vn"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Mô tả</label>
                  <textarea
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027] resize-none"
                    placeholder="Mô tả năng lực xưởng..."
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <Button
                    variant="outline"
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
          isOpen={!!itemToDelete}
          title="Xóa nhà sản xuất"
          message={
            <div className="space-y-2">
              <p>Bạn có chắc muốn xóa nhà sản xuất "{itemToDelete?.name}" không?</p>
              {(itemToDelete?.productCount ?? 0) > 0 && (
                <p className="text-amber-700">
                  Hiện có {itemToDelete?.productCount} sản phẩm đang chọn nhà sản xuất này. Các sản phẩm không bị xóa, nhưng sẽ mất liên kết nhà sản xuất khi bạn mở lại form.
                </p>
              )}
            </div>
          }
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
