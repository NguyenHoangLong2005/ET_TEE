'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit, Trash2, X, RefreshCw, Save, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveRole } from '@/lib/auth';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parentId?: number | null;
  parentName?: string;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  parentId: string | number;
}

interface CategoryFormProps {
  title: string;
  form: FormData;
  categories: Category[];
  selectedId?: number;
  isSubmitting: boolean;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFormChange: (patch: Partial<FormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function CategoryForm({
  title, form, categories, selectedId, isSubmitting,
  onNameChange, onFormChange, onSubmit, onClose,
}: CategoryFormProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Tên danh mục <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Thời trang Nam, Thời trang Nữ..."
              value={form.name}
              onChange={onNameChange}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => onFormChange({ slug: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Danh mục cha</label>
            <select
              value={form.parentId}
              onChange={(e) => onFormChange({ parentId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">-- Không có (Danh mục gốc) --</option>
              {categories
                .filter(c => c.id !== selectedId)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Mô tả</label>
            <textarea
              rows={3}
              placeholder="Mô tả ngắn về danh mục..."
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>Hủy</Button>
            <Button type="submit" loading={isSubmitting} icon={<Save className="w-4 h-4" />}>Lưu</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const emptyForm: FormData = { name: '', slug: '', description: '', parentId: '' };

export default function StoreOwnerCategoriesPage() {
  const { user } = useAuth();
  const isAdmin = getActiveRole(user?.role ? [user.role] : (user as any)?.roles) === 'ADMIN';
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<any>('/api/admin/categories?page=0&size=200');
      let list: Category[] = [];
      if (Array.isArray(res)) list = res;
      else if (res?.items && Array.isArray(res.items)) list = res.items;
      else if (res?.data?.items && Array.isArray(res.data.items)) list = res.data.items;
      else if (res?.content && Array.isArray(res.content)) list = res.content;
      setCategories(list);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách danh mục');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm(prev => ({ ...prev, name, slug: generateSlug(name) }));
  };

  const handleFormChange = (patch: Partial<FormData>) => {
    setForm(prev => ({ ...prev, ...patch }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setIsCreateOpen(true);
  };

  const openEdit = (cat: Category) => {
    setSelected(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', parentId: cat.parentId ?? '' });
    setIsEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Vui lòng điền tên và slug'); return; }
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/store-owner/categories', {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        parentId: form.parentId ? Number(form.parentId) : null,
      });
      toast.success('Thêm danh mục thành công');
      setIsCreateOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo danh mục');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !form.name.trim() || !form.slug.trim()) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/store-owner/categories/${selected.id}`, {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        parentId: form.parentId ? Number(form.parentId) : null,
      });
      toast.success('Cập nhật danh mục thành công');
      setIsEditOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi cập nhật danh mục');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/api/store-owner/categories/${toDelete.id}`);
      toast.success('Đã xóa danh mục');
      setToDelete(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa danh mục');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const kw = searchTerm.toLowerCase();
    return categories.filter(c =>
      c.name.toLowerCase().includes(kw) || c.slug.toLowerCase().includes(kw)
    );
  }, [categories, searchTerm]);

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Tên danh mục',
      render: (cat) => (
        <div>
          <div className="font-bold text-slate-900">{cat.name}</div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">{cat.slug}</div>
        </div>
      ),
    },
    {
      key: 'parentName',
      header: 'Danh mục cha',
      render: (cat) =>
        cat.parentName ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">
            <Layers className="w-3 h-3" />
            {cat.parentName}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">Danh mục gốc</span>
        ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (cat) => (
        <span className="line-clamp-1 max-w-[280px] text-xs text-slate-500">
          {cat.description || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (cat) =>
        isAdmin ? (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => openEdit(cat)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Sửa"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => setToDelete(cat)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Xóa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-300 italic">Chỉ xem</span>
        ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">

        <PageHeader
          title="Danh mục sản phẩm"
          subtitle={
            isAdmin
              ? "Quản lý danh mục dùng chung cho toàn hệ thống (VD: Thời trang Nam, Thời trang Nữ, Trẻ em...)"
              : "Danh mục sản phẩm dùng chung cho toàn hệ thống, chỉ Quản trị viên được thêm/sửa/xóa."
          }
          badge={isAdmin ? "HỆ THỐNG" : "CHỈ XEM"}
          actions={
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={fetchCategories} loading={isLoading} icon={<RefreshCw className="w-4 h-4" />}>
                Làm mới
              </Button>
              {isAdmin && (
                <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
                  Thêm danh mục
                </Button>
              )}
            </div>
          }
        />

        <DataTable<Category>
          data={filtered}
          columns={columns}
          loading={isLoading}
          rowKey={(c) => c.id}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Tìm danh mục theo tên, slug..."
          emptyTitle="Chưa có danh mục nào"
          emptyMessage="Nhấn Thêm danh mục để tạo danh mục đầu tiên cho chi nhánh."
        />

        {isAdmin && isCreateOpen && (
          <CategoryForm
            title="Thêm danh mục mới"
            form={form}
            categories={categories}
            isSubmitting={isSubmitting}
            onNameChange={handleNameChange}
            onFormChange={handleFormChange}
            onSubmit={handleCreate}
            onClose={() => setIsCreateOpen(false)}
          />
        )}

        {isAdmin && isEditOpen && selected && (
          <CategoryForm
            title={`Sửa: ${selected.name}`}
            form={form}
            categories={categories}
            selectedId={selected.id}
            isSubmitting={isSubmitting}
            onNameChange={handleNameChange}
            onFormChange={handleFormChange}
            onSubmit={handleEdit}
            onClose={() => setIsEditOpen(false)}
          />
        )}

        <ConfirmModal
          isOpen={isAdmin && !!toDelete}
          title="Xóa danh mục"
          message={`Bạn có chắc chắn muốn xóa danh mục "${toDelete?.name}"? Hành động này không thể hoàn tác.`}
          confirmText="Xóa"
          cancelText="Hủy"
          type="danger"
          isLoading={isSubmitting}
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        />

      </div>
    </PermissionGuard>
  );
}
