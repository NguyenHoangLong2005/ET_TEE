"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, ChevronRight, FolderTree, X, Save, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';

type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  displayOrder?: number;
  active?: boolean;
  children?: CategoryNode[];
};

// The seeded root categories are stored as raw English slugs (men, kids...). Show the
// Vietnamese storefront label in the list; the edit form still shows the stored name.
const FRIENDLY_LABELS: Record<string, string> = {
  men: 'Nam',
  women: 'Nữ',
  kids: 'Trẻ em',
  family: 'Gia đình',
  accessories: 'Phụ kiện',
};

const displayName = (node: { name: string; slug: string }) =>
  FRIENDLY_LABELS[node.slug?.toLowerCase()] ?? node.name;

const countDescendants = (node: CategoryNode): number =>
  (node.children || []).reduce((sum, c) => sum + 1 + countDescendants(c), 0);

export default function AdminCategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Parents start collapsed; clicking a parent row reveals its children.
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const toggleExpanded = (id: number) =>
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<CategoryNode | null>(null);
  const [parentNode, setParentNode] = useState<CategoryNode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    displayOrder: 0,
    active: true,
  });

  const fetchTree = async (silent?: unknown) => {
    try {
      if (silent !== true) setLoading(true);
      setError(null);
      const res = await apiClient.get<CategoryNode[]>('/api/admin/categories/tree');
      if (Array.isArray(res)) {
        setTree(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải cây danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  const openAddModal = (parent?: CategoryNode) => {
    setEditingNode(null);
    setParentNode(parent || null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      displayOrder: 0,
      active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (node: CategoryNode) => {
    setEditingNode(node);
    setParentNode(null);
    setFormData({
      name: node.name || '',
      slug: node.slug || '',
      description: node.description || '',
      imageUrl: node.imageUrl || '',
      displayOrder: Math.max(0, node.displayOrder ?? 0),
      active: node.active ?? true,
    });
    setModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    const safeDisplayOrder = Math.max(0, Number(formData.displayOrder) || 0);

    try {
      setIsSubmitting(true);
      setError(null);

      if (editingNode) {
        // Edit Mode
        await apiClient.put(`/api/admin/categories/${editingNode.id}`, {
          name: formData.name.trim(),
          slug: formData.slug.trim() || undefined,
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          parentId: editingNode.parentId ?? null,
          displayOrder: safeDisplayOrder,
          active: formData.active,
        });
        toast.success(`Đã cập nhật danh mục "${formData.name.trim()}"`);
      } else {
        // Create Mode
        await apiClient.post('/api/admin/categories', {
          name: formData.name.trim(),
          slug: formData.slug.trim() || undefined,
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          parentId: parentNode ? parentNode.id : null,
          displayOrder: safeDisplayOrder,
          active: formData.active,
        });
        toast.success(`Đã tạo danh mục "${formData.name.trim()}"`);
      }

      setModalOpen(false);
      await fetchTree(true);
    } catch (err: any) {
      toast.error(err?.message || 'Lưu danh mục thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deleteNode, setDeleteNode] = useState<{ id: number; name: string; childrenCount: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCategory = (id: number, name: string, childrenCount = 0) => {
    setDeleteNode({ id, name, childrenCount });
  };

  const executeDelete = async () => {
    if (!deleteNode) return;
    setIsDeleting(true);
    try {
      setError(null);
      await apiClient.delete(`/api/admin/categories/${deleteNode.id}`);
      toast.success(`Đã xóa danh mục "${deleteNode.name}"`);
      setDeleteNode(null);
      await fetchTree(true);
    } catch (err: any) {
      toast.error(err?.message || 'Xóa danh mục thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderTreeNode = (node: CategoryNode, depth = 0) => {
    const hasChildren = !!node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    return (
      <div key={node.id} className="space-y-2">
        <div
          onClick={hasChildren ? () => toggleExpanded(node.id) : undefined}
          onKeyDown={hasChildren ? e => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
              e.preventDefault();
              toggleExpanded(node.id);
            }
          } : undefined}
          role={hasChildren ? 'button' : undefined}
          tabIndex={hasChildren ? 0 : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-slate-50/80 ${
            node.active === false ? 'opacity-70' : ''
          } ${hasChildren ? 'cursor-pointer select-none' : ''}`}
          style={{ marginLeft: `${Math.min(depth * 24, 96)}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {hasChildren ? (
              <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <FolderTree className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">{displayName(node)}</span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">/{node.slug}</span>
                {node.active === false && <StatusBadge status="INACTIVE" label="Đang ẩn" />}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {node.description
                  ? node.description
                  : countDescendants(node) > 0
                    ? `${countDescendants(node)} danh mục con${isExpanded ? '' : ' · bấm để xem'}`
                    : 'Chưa có mô tả'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0" onClick={e => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setExpandedIds(prev => new Set(prev).add(node.id)); openAddModal(node); }}
              icon={<Plus className="w-4 h-4" />}
              title="Thêm danh mục con"
            >
              Thêm con
            </Button>
            <button
              onClick={() => openEditModal(node)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Sửa danh mục"
              aria-label={`Sửa danh mục ${displayName(node)}`}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteCategory(node.id, displayName(node), node.children?.length || 0)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Xóa danh mục"
              aria-label={`Xóa danh mục ${displayName(node)}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded ? (
          <div className="space-y-2">
            {node.children?.map(child => renderTreeNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN', 'SHOP_OWNER']} requiredPermissions={['MANAGE_CATEGORY']}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">
        <PageHeader
          title="Danh mục sản phẩm"
          subtitle="Cấu trúc danh mục hiển thị trên cửa hàng, dùng để phân loại và lọc sản phẩm."
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Danh mục sản phẩm" },
          ]}
          actions={
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={fetchTree} loading={loading} icon={<RefreshCw className="w-4 h-4" />}>
                Làm mới
              </Button>
              <Button onClick={() => openAddModal()} icon={<Plus className="w-4 h-4" />}>
                Thêm danh mục gốc
              </Button>
            </div>
          }
        />

        {error ? (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-medium">
            {error}
          </div>
        ) : null}

        {!loading && tree.length > 0 && (
          <p className="text-xs text-slate-500">
            <span className="font-bold text-slate-900">{tree.length}</span> danh mục gốc
            <span className="mx-2 text-slate-300">·</span>
            <span className="font-bold text-slate-900">{tree.reduce((n, c) => n + countDescendants(c), 0)}</span> danh mục con
          </p>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span>Đang tải danh mục...</span>
            </div>
          ) : tree.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <EmptyState
                icon={FolderTree}
                title="Chưa có danh mục nào"
                description="Bấm 'Thêm danh mục gốc' để bắt đầu xây dựng cấu trúc danh mục cho cửa hàng."
                action={{
                  label: "Thêm danh mục gốc",
                  onClick: () => openAddModal(),
                  icon: <Plus className="w-4 h-4" />,
                }}
              />
            </div>
          ) : (
            tree.map(node => renderTreeNode(node, 0))
          )}
        </div>

      {/* React Modal Form for Add/Edit Category */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                <span>
                  {editingNode 
                    ? `Chỉnh sửa: ${editingNode.name}` 
                    : parentNode 
                      ? `Thêm danh mục con cho "${displayName(parentNode)}"` 
                      : 'Thêm danh mục gốc'}
                </span>
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Áo sơ mi nam, Váy nữ..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Đường dẫn (slug)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="ao-so-mi-nam (tự tạo từ tên nếu để trống)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Mô tả danh mục
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết nhóm sản phẩm này..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Ảnh đại diện (đường dẫn)
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/category-image.jpg"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Trạng thái
                  </label>
                  <select
                    value={formData.active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  >
                    <option value="true">Đang hiển thị</option>
                    <option value="false">Đang ẩn</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
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

      {/* Modal Confirm Delete */}
      <ConfirmModal
        isOpen={!!deleteNode}
        onClose={() => setDeleteNode(null)}
        onConfirm={executeDelete}
        title="Xác nhận xóa danh mục"
        message={
          deleteNode
            ? `Bạn có chắc chắn muốn xóa danh mục "${deleteNode.name}"? ${
                deleteNode.childrenCount > 0
                  ? `Cảnh báo: Danh mục này đang chứa ${deleteNode.childrenCount} danh mục con trực tiếp sẽ bị ảnh hưởng!`
                  : "Các sản phẩm thuộc danh mục này có thể cần phân loại lại."
              }`
            : ""
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        isLoading={isDeleting}
        type="danger"
      />
      </div>
    </PermissionGuard>
  );
}
