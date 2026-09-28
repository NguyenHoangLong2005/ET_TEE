"use client";

import React, { useEffect, useState } from 'react';
import { Network, Plus, Trash2, Edit, ChevronRight, FolderTree, X, Save, RefreshCw } from 'lucide-react';
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

export default function AdminCategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchTree = async () => {
    try {
      setLoading(true);
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
      await fetchTree();
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
      await fetchTree();
    } catch (err: any) {
      toast.error(err?.message || 'Xóa danh mục thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderTreeNode = (node: CategoryNode, depth = 0) => {
    return (
      <div key={node.id} className="space-y-2">
        <div 
          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition gap-3 shadow-sm"
          style={{ marginLeft: `${Math.min(depth * 20, 80)}px` }}
        >
          <div className="flex items-center gap-3">
            {depth > 0 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
            <FolderTree className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 text-sm">{node.name}</span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">/{node.slug}</span>
                {node.active === false && (
                  <StatusBadge status="INACTIVE" label="Ẩn" />
                )}
              </div>
              {node.description ? <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{node.description}</p> : null}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => openAddModal(node)}
              className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 flex items-center gap-1 transition"
              title="Thêm danh mục con"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Con</span>
            </button>
            <button
              onClick={() => openEditModal(node)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Sửa danh mục"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteCategory(node.id, node.name, node.children?.length || 0)}
              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
              title="Xóa danh mục"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {node.children && node.children.length > 0 ? (
          <div className="space-y-2">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN', 'SHOP_OWNER']} requiredPermissions={['MANAGE_CATEGORY']}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Cây Danh Mục Hệ Thống"
          subtitle="Quản lý danh mục đa cấp, sắp xếp phân cấp sản phẩm toàn sàn"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Danh mục sản phẩm" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={fetchTree}
                title="Tải lại cây danh mục"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="primary"
                onClick={() => openAddModal()}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Thêm Danh Mục Gốc
              </Button>
            </div>
          }
        />

        {error ? (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-medium">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Đang tải cây danh mục...</span>
            </div>
          ) : tree.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
              <EmptyState
                icon={FolderTree}
                title="Chưa có danh mục nào được khởi tạo"
                description="Bấm nút 'Thêm Danh Mục Gốc' để bắt đầu thiết lập cấu trúc cây sản phẩm."
                action={{
                  label: "Thêm Danh Mục Gốc",
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
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-600" />
                <span>
                  {editingNode 
                    ? `Chỉnh Sửa: ${editingNode.name}` 
                    : parentNode 
                      ? `Thêm Danh Mục Con cho "${parentNode.name}"` 
                      : 'Thêm Danh Mục Gốc'}
                </span>
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tên danh mục <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Áo sơ mi nam, Váy nữ..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Mã Slug (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Ví dụ: ao-so-mi-nam (tự sinh từ tên nếu để trống)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Mô tả danh mục
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết nhóm sản phẩm này..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Link ảnh banner / đại diện
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/category-image.jpg"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  >
                    <option value="true">Hiển thị (Active)</option>
                    <option value="false">Ẩn (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-sm font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Danh Mục'}</span>
                </button>
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
