'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, RefreshCw, Save, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';

interface Shop {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
}

interface FormData {
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

const emptyForm: FormData = { name: '', address: '', phone: '', isActive: true };

export default function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShops = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Shop[]>('/api/admin/shops');
      setShops(data || []);
    } catch (e: any) {
      toast.error(e.message || 'Không thể tải danh sách chi nhánh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShops(); }, [fetchShops]);

  const openCreate = () => {
    setEditingShop(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (shop: Shop) => {
    setEditingShop(shop);
    setForm({
      name: shop.name,
      address: shop.address || '',
      phone: shop.phone || '',
      isActive: shop.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Tên chi nhánh không được để trống');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        isActive: form.isActive,
      };
      if (editingShop) {
        await apiClient.put(`/api/admin/shops/${editingShop.id}`, payload);
        toast.success('Cập nhật chi nhánh thành công');
      } else {
        await apiClient.post('/api/admin/shops', payload);
        toast.success('Tạo chi nhánh thành công');
      }
      setIsModalOpen(false);
      fetchShops();
    } catch (e: any) {
      toast.error(e.message || 'Không thể lưu chi nhánh');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Shop>[] = [
    {
      key: 'id',
      header: 'Mã',
      render: (s) => <span className="font-mono text-xs text-slate-500">#{s.id}</span>,
    },
    {
      key: 'name',
      header: 'Tên chi nhánh',
      render: (s) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-900 text-sm">{s.name}</span>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      render: (s) => (
        <span className="text-slate-500 text-xs truncate max-w-xs inline-block" title={s.address || undefined}>
          {s.address || '— (chưa cập nhật)'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Điện thoại',
      render: (s) => <span className="text-slate-700 font-mono text-xs">{s.phone || '—'}</span>,
    },
    {
      key: 'isActive',
      header: 'Trạng thái',
      render: (s) =>
        s.isActive ? (
          <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
            Đang hoạt động
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
            Ngừng hoạt động
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (s) => (
        <button
          onClick={() => openEdit(s)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Sửa"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">
        <PageHeader
          title="Quản lý Chi nhánh"
          subtitle="Danh sách chi nhánh của chuỗi ET.TEE. Ngừng hoạt động một chi nhánh không xóa đơn hàng/nhân viên đã gắn với nó."
          badge="HỆ THỐNG"
          actions={
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={fetchShops} loading={loading} icon={<RefreshCw className="w-4 h-4" />}>
                Làm mới
              </Button>
              <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
                Thêm chi nhánh
              </Button>
            </div>
          }
        />

        <DataTable<Shop>
          data={shops}
          columns={columns}
          loading={loading}
          rowKey={(s) => s.id}
          emptyTitle="Chưa có chi nhánh nào"
          emptyMessage="Nhấn Thêm chi nhánh để tạo chi nhánh đầu tiên."
        />

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingShop ? `Sửa: ${editingShop.name}` : 'Thêm chi nhánh mới'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Tên chi nhánh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="VD: ET.TEE Chi nhánh Quận 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Địa chỉ</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Điện thoại</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="VD: 028 1234 5678"
                  />
                </div>
                <label className="flex items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  Chi nhánh đang hoạt động
                </label>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" loading={isSubmitting} icon={<Save className="w-4 h-4" />}>
                    Lưu
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
