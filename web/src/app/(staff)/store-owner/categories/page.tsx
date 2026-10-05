'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit, Trash2, X, RefreshCw, Save, Layers, CornerDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  parentId?: number | null;
  parentName?: string;
  displayOrder?: number;
  active?: boolean;
  depth?: number;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  parentId: string | number;
  displayOrder: string | number;
  active: boolean;
}

interface DeleteCheck {
  canDelete: boolean;
  reason?: string | null;
  childCount: number;
  productCount: number;
  openOrderCount: number;
}

/** Order categories as a tree (parent, then its children) and tag each with depth. */
function buildTree(list: Category[]): Category[] {
  const ids = new Set(list.map(c => c.id));
  const byParent = new Map<number | null, Category[]>();
  for (const c of list) {
    const key = c.parentId != null && ids.has(c.parentId) ? c.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const out: Category[] = [];
  const walk = (parent: number | null, depth: number) => {
    const kids = (byParent.get(parent) ?? [])
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id);
    for (const k of kids) {
      out.push({ ...k, depth });
      walk(k.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** ids of a category and all of its descendants (invalid parent choices). */
function descendantIds(list: Category[], id: number): Set<number> {
  const result = new Set<number>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of list) {
      if (c.parentId != null && result.has(c.parentId) && !result.has(c.id)) {
        result.add(c.id);
        grew = true;
      }
    }
  }
  return result;
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
  const blockedParents = selectedId != null ? descendantIds(categories, selectedId) : new Set<number>();
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
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]"
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
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Danh mục cha</label>
            <select
              value={form.parentId}
              onChange={(e) => onFormChange({ parentId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]"
            >
              <option value="">-- Không có (Danh mục gốc) --</option>
              {categories
                .filter(c => !blockedParents.has(c.id))
                .map(c => <option key={c.id} value={c.id}>{'— '.repeat(c.depth ?? 0)}{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Thứ tự hiển thị</label>
              <input
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) => onFormChange({ displayOrder: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Trạng thái</label>
              <label className="flex items-center gap-2 h-[42px] text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => onFormChange({ active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 accent-[#E50027]"
                />
                Hiển thị trên cửa hàng
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Mô tả</label>
            <textarea
              rows={3}
              placeholder="Mô tả ngắn về danh mục..."
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027] resize-none"
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
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const emptyForm: FormData = { name: '', slug: '', description: '', parentId: '', displayOrder: 0, active: true };

export default function StoreOwnerCategoriesPage() {
  // PermissionGuard below already limits this page to SHOP_OWNER / ADMIN / SUPER_ADMIN,
  // all of whom may manage categories.
  const [categories, setCategories] = useState<Category[]>([]);
  const [deleteCheck, setDeleteCheck] = useState<DeleteCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);

  const fetchCategories = useCallback(async (silent?: unknown) => {
    if (silent !== true) setIsLoading(true);
    try {
      // /api/admin/** is ADMIN-only (403 for SHOP_OWNER); this endpoint allows both.
      const res = await apiClient.get<any>('/api/store-owner/categories?page=0&size=200');
      let list: Category[] = [];
      if (Array.isArray(res)) list = res;
      else if (res?.items && Array.isArray(res.items)) list = res.items;
      else if (res?.data?.items && Array.isArray(res.data.items)) list = res.data.items;
      else if (res?.content && Array.isArray(res.content)) list = res.content;
      const nameById = new Map(list.map(c => [c.id, c.name]));
      setCategories(buildTree(list.map(c => ({
        ...c,
        parentName: c.parentName ?? (c.parentId != null ? nameById.get(c.parentId) : undefined),
      }))));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách danh mục');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Slug follows the name only while creating; editing keeps the URL stable.
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm(prev => ({ ...prev, name, ...(isEditOpen ? {} : { slug: generateSlug(name) }) }));
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
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      parentId: cat.parentId ?? '',
      displayOrder: cat.displayOrder ?? 0,
      active: cat.active ?? true,
    });
    setIsEditOpen(true);
  };

  const openDelete = async (cat: Category) => {
    setToDelete(cat);
    setDeleteCheck(null);
    setIsChecking(true);
    try {
      const res = await apiClient.get<DeleteCheck>(`/api/store-owner/categories/${cat.id}/delete-check`);
      setDeleteCheck(res);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể kiểm tra điều kiện xóa');
      setToDelete(null);
    } finally {
      setIsChecking(false);
    }
  };

  const closeDelete = () => { setToDelete(null); setDeleteCheck(null); };

  const buildPayload = (extra?: Partial<Category>) => ({
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || null,
    parentId: form.parentId ? Number(form.parentId) : null,
    displayOrder: Number(form.displayOrder) || 0,
    active: form.active,
    // the update endpoint overwrites imageUrl, so echo the existing value back
    imageUrl: extra?.imageUrl ?? null,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Vui lòng điền tên và slug'); return; }
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/store-owner/categories', buildPayload());
      toast.success('Thêm danh mục thành công');
      setIsCreateOpen(false);
      fetchCategories(true);
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
      await apiClient.put(`/api/store-owner/categories/${selected.id}`, buildPayload(selected));
      toast.success('Cập nhật danh mục thành công');
      setIsEditOpen(false);
      fetchCategories(true);
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
      closeDelete();
      fetchCategories(true);
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
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: searchTerm.trim() ? 0 : (cat.depth ?? 0) * 24 }}
        >
          {!searchTerm.trim() && (cat.depth ?? 0) > 0 && <CornerDownRight className="w-3.5 h-3.5 text-[#EC8D9A] shrink-0" />}
          <div>
            <div className={`text-zinc-900 ${(cat.depth ?? 0) === 0 ? 'font-bold' : 'font-medium'}`}>{cat.name}</div>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">{cat.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Trạng thái',
      render: (cat) =>
        cat.active === false ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />Đang ẩn
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Hiển thị
          </span>
        ),
    },
    {
      key: 'parentName',
      header: 'Danh mục cha',
      render: (cat) =>
        cat.parentName ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-xs font-medium">
            <Layers className="w-3 h-3 text-zinc-400" />
            {cat.parentName}
          </span>
        ) : (
          <span className="text-slate-400 italic text-xs">Danh mục gốc</span>
        ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (cat) =>
        cat.description ? (
          <span className="line-clamp-2 max-w-[320px] text-xs text-zinc-600" title={cat.description}>
            {cat.description}
          </span>
        ) : (
          <button
            onClick={() => openEdit(cat)}
            className="text-xs italic text-zinc-400 hover:text-[#E50027] transition-colors"
          >
            Chưa có mô tả — thêm
          </button>
        ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (cat) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEdit(cat)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            title="Sửa"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => openDelete(cat)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-[#E50027] hover:bg-[#FFF0F2] transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const stats = useMemo(() => ({
    total: categories.length,
    roots: categories.filter(c => !c.depth).length,
    hidden: categories.filter(c => c.active === false).length,
  }), [categories]);

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">

        <PageHeader
          title="Danh mục sản phẩm"
          subtitle="Danh mục dùng chung cho toàn hệ thống. Xóa chỉ được khi không còn danh mục con, sản phẩm và đơn hàng chưa hoàn tất liên quan."
          actions={
            <div className="flex items-center gap-2.5">
              <Button variant="outline" onClick={fetchCategories} loading={isLoading} icon={<RefreshCw className="w-4 h-4" />}>
                Làm mới
              </Button>
              <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
                Thêm danh mục
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-3 gap-3 max-w-xl">
          {[
            { label: 'Tổng danh mục', value: stats.total },
            { label: 'Danh mục gốc', value: stats.roots },
            { label: 'Đang ẩn', value: stats.hidden },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 border-l-4 border-l-[#E50027]/70">
              <div className="text-xs font-medium text-zinc-500">{s.label}</div>
              <div className="text-2xl font-bold text-zinc-900 tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        <DataTable<Category>
          data={filtered}
          columns={columns}
          loading={isLoading}
          rowKey={(c) => c.id}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Tìm danh mục theo tên, slug..."
          emptyTitle="Chưa có danh mục nào"
          emptyMessage="Nhấn Thêm danh mục để tạo danh mục đầu tiên."
        />

        {isCreateOpen && (
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

        {isEditOpen && selected && (
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
          isOpen={!!toDelete && !isChecking && !!deleteCheck}
          title={deleteCheck?.canDelete ? 'Xóa danh mục' : 'Không thể xóa danh mục'}
          message={
            deleteCheck?.canDelete
              ? `Bạn có chắc chắn muốn xóa danh mục "${toDelete?.name}"? Hành động này không thể hoàn tác.`
              : (
                <div className="space-y-2">
                  <p>{deleteCheck?.reason}</p>
                  <ul className="text-xs text-slate-500 list-disc pl-5">
                    <li>Danh mục con: {deleteCheck?.childCount ?? 0}</li>
                    <li>Sản phẩm: {deleteCheck?.productCount ?? 0}</li>
                    <li>Đơn hàng chưa hoàn tất: {deleteCheck?.openOrderCount ?? 0}</li>
                  </ul>
                </div>
              )
          }
          confirmText={deleteCheck?.canDelete ? 'Xóa' : 'Đã hiểu'}
          cancelText="Hủy"
          type={deleteCheck?.canDelete ? 'danger' : 'warning'}
          isLoading={isSubmitting}
          onConfirm={deleteCheck?.canDelete ? handleDelete : closeDelete}
          onClose={closeDelete}
        />

      </div>
    </PermissionGuard>
  );
}
