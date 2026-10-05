"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit, Trash2, Eye, FileText, 
  CheckCircle, XCircle, Tag, X, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";

// --- Types ---
type PostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  coverImageUrl: string;
  status: PostStatus;
  author: string;
  publishedAt: string | null;
  views: number;
  tags: string[];
}

// --- Helper ---
const generateSlug = (text: string) => {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export default function PostManagementPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<PostStatus | 'ALL'>('ALL');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Post>>({
    title: "",
    slug: "",
    excerpt: "",
    coverImageUrl: "",
    status: "DRAFT",
    tags: []
  });
  const [tagInput, setTagInput] = useState("");

  const fetchPosts = async (silent?: unknown) => {
    try {
      if (silent !== true) setIsLoading(true);
      const baseUrl = getApiBaseUrl();
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const response = await fetch(`${baseUrl}/api/staff/marketing/posts`, {
        headers: authHeaders,
      });
      if (!response.ok) {
        throw new Error(`Lỗi tải danh sách bài viết (HTTP ${response.status})`);
      }
      const data = await response.json();
      setPosts(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
    } catch (error: any) {
      console.error("Failed to fetch posts", error);
      toast.error(error?.message || "Không thể tải danh sách bài viết");
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleOpenModal = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        ...post,
      });
      setTagInput(post.tags?.join(", ") || "");
    } else {
      setEditingPost(null);
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        coverImageUrl: "",
        status: "DRAFT",
        tags: []
      });
      setTagInput("");
    }
    setIsModalOpen(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      title: val,
      slug: !editingPost ? generateSlug(val) : prev.slug
    }));
  };

  const handleSavePost = async () => {
    if (!formData.title?.trim() || !formData.slug?.trim()) {
      toast.error("Vui lòng nhập tiêu đề và slug");
      return;
    }

    const tagsArray = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      ...formData,
      tags: tagsArray
    };

    const isEdit = !!editingPost;
    setIsSaving(true);
    
    try {
      const baseUrl = getApiBaseUrl();
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const url = isEdit 
        ? `${baseUrl}/api/staff/marketing/posts/${editingPost.id}`
        : `${baseUrl}/api/staff/marketing/posts`;
        
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Lưu bài viết thất bại (HTTP ${response.status})`);
      }
      
      toast.success(isEdit ? "Đã cập nhật bài viết thành công" : "Đã tạo bài viết mới thành công");
      setIsModalOpen(false);
      await fetchPosts(true);
    } catch (error: any) {
      console.error("Save post failed", error);
      toast.error(error?.message || "Không thể lưu bài viết");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: PostStatus) => {
    const newStatus: PostStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';

    try {
      const baseUrl = getApiBaseUrl();
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const response = await fetch(`${baseUrl}/api/staff/marketing/posts/${id}/status`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error(`Đổi trạng thái thất bại (HTTP ${response.status})`);
      }

      toast.success(`Đã ${newStatus === 'PUBLISHED' ? 'xuất bản' : 'chuyển về nháp'} bài viết`);
      setPosts(prev => prev.map(p => p.id === id ? { 
        ...p, 
        status: newStatus,
        publishedAt: newStatus === 'PUBLISHED' && !p.publishedAt ? new Date().toISOString() : p.publishedAt
      } : p));
    } catch (error: any) {
      console.error("Toggle status failed", error);
      toast.error(error?.message || "Không thể cập nhật trạng thái");
    }
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    const id = postToDelete;
    setIsDeleting(true);

    try {
      const baseUrl = getApiBaseUrl();
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`${baseUrl}/api/staff/marketing/posts/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) throw new Error(`Xóa bài viết thất bại (HTTP ${res.status})`);
      toast.success("Đã xóa bài viết thành công");
      setPosts(prev => prev.filter(p => p.id !== id));
      setPostToDelete(null);
    } catch (error: any) {
      console.error("Delete failed", error);
      toast.error(error?.message || "Không thể xóa bài viết");
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats calculation
  const publishedPosts = posts.filter(p => p.status === 'PUBLISHED').length;
  const draftPosts = posts.filter(p => p.status === 'DRAFT').length;
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesSearch = 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'ALL' || post.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [posts, searchQuery, filterStatus]);

  const columns: Column<Post>[] = useMemo(() => [
    {
      key: 'post',
      header: 'Bài viết',
      render: (post) => (
        <div className="flex items-start gap-3">
          <div className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
            {post.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={post.coverImageUrl} 
                alt={post.title} 
                className="w-full h-full object-cover" 
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300/e2e8f0/64748b?text=No+Image'; }} 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 line-clamp-1">{post.title}</p>
            <p className="text-xs font-mono text-slate-500 mt-0.5 line-clamp-1">{post.slug}</p>
            {post.tags && post.tags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {post.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    #{tag}
                  </span>
                ))}
                {post.tags.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{post.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (post) => {
        const badgeStatus = post.status === 'PUBLISHED' ? 'active' : post.status === 'DRAFT' ? 'draft' : 'inactive';
        const label = post.status === 'PUBLISHED' ? 'Đã xuất bản' : post.status === 'DRAFT' ? 'Bản nháp' : 'Lưu trữ';
        return <StatusBadge status={badgeStatus} label={label} />;
      },
    },
    {
      key: 'views',
      header: 'Hiệu suất',
      render: (post) => (
        <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>{post.views?.toLocaleString('vi-VN') || 0} lượt</span>
        </div>
      ),
    },
    {
      key: 'publishedAt',
      header: 'Thời gian & Tác giả',
      render: (post) => (
        <div className="text-xs">
          <p className="font-medium text-slate-700">
            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('vi-VN') : 'Chưa xuất bản'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{post.author || 'Tác giả'}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (post) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleOpenModal(post)}
            icon={<Edit className="w-3.5 h-3.5" />}
            title="Chỉnh sửa bài viết"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleToggleStatus(post.id, post.status)}
            icon={post.status === 'PUBLISHED' ? <XCircle className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
            title={post.status === 'PUBLISHED' ? 'Chuyển về Nháp' : 'Xuất bản'}
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPostToDelete(post.id)}
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
            title="Xóa bài viết"
          />
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <PageHeader
          title="Quản lý Bài Viết"
          subtitle="Nội dung blog, tin tức và chia sẻ xu hướng thời trang ET.TEE"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={fetchPosts}
                loading={isLoading}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              >
                Làm mới
              </Button>
              <Button 
                variant="primary"
                onClick={() => handleOpenModal()}
                icon={<Plus className="w-4 h-4" />}
              >
                Viết Bài Mới
              </Button>
            </div>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Đã xuất bản"
            value={publishedPosts}
            icon={CheckCircle}
            color="green"
            subtitle="Bài viết đang hiển thị trên trang tin"
          />
          <StatCard
            title="Bản nháp"
            value={draftPosts}
            icon={FileText}
            color="warning"
            subtitle="Bài viết đang soạn thảo"
          />
          <StatCard
            title="Lượt xem (Toàn bộ)"
            value={totalViews.toLocaleString('vi-VN')}
            icon={Eye}
            color="blue"
            subtitle="Lượt độc giả truy cập xem bài viết"
          />
        </div>

        {/* Data Table */}
        <DataTable<Post>
          columns={columns}
          data={filteredPosts}
          loading={isLoading}
          rowKey={(post) => post.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm kiếm theo tiêu đề, slug, tag..."
          emptyTitle="Chưa có bài viết nào"
          emptyMessage="Thay đổi từ khóa tìm kiếm hoặc bấm 'Viết Bài Mới' để bắt đầu soạn thảo."
          filterSlot={
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as PostStatus | 'ALL')}
                className="bg-white border border-slate-300 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none min-w-[130px]"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PUBLISHED">Đã xuất bản</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </div>
          }
        />

      </div>

      {/* Modal Cập nhật/Thêm mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => !isSaving && setIsModalOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-3xl relative z-10 max-h-[90vh] flex flex-col text-slate-900">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                {editingPost ? 'Cập nhật Bài Viết' : 'Viết Bài Mới'}
              </h2>
              <button 
                onClick={() => !isSaving && setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Tiêu đề bài viết <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.title || ''}
                  onChange={handleTitleChange}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  placeholder="Nhập tiêu đề bài viết..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Đường dẫn (Slug) <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors font-mono"
                  placeholder="duong-dan-bai-viet"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Mô tả ngắn (Excerpt)</label>
                <textarea 
                  value={formData.excerpt || ''}
                  onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors min-h-[75px]"
                  placeholder="Đoạn mô tả ngắn hiển thị ở danh sách bài viết..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nội dung bài viết</label>
                <textarea
                  value={formData.content || ''}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors min-h-[220px] leading-relaxed"
                  placeholder={"Viết nội dung bài viết...\n\n## Tiêu đề mục\nĐoạn văn của mục này.\n\n- Ý thứ nhất\n- Ý thứ hai"}
                />
                <p className="text-[11px] text-slate-500">
                  Cách đoạn bằng một dòng trống. Dòng bắt đầu bằng <code>## </code> là tiêu đề mục, bằng <code>- </code> là gạch đầu dòng.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">URL Ảnh bìa</label>
                  <input 
                    type="text" 
                    value={formData.coverImageUrl || ''}
                    onChange={(e) => setFormData({...formData, coverImageUrl: e.target.value})}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    placeholder="https://..."
                  />
                  {formData.coverImageUrl && (
                    <div className="mt-2 relative aspect-[16/9] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={formData.coverImageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Invalid+Image+URL';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Trạng thái xuất bản</label>
                    <select 
                      value={formData.status || 'DRAFT'}
                      onChange={(e) => setFormData({...formData, status: e.target.value as PostStatus})}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    >
                      <option value="DRAFT">Bản nháp</option>
                      <option value="PUBLISHED">Đã xuất bản</option>
                      <option value="ARCHIVED">Lưu trữ</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tags (phân cách bằng dấu phẩy)</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="text" 
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        placeholder="Thời trang, Xu hướng, Phối đồ..."
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 rounded-b-2xl">
              <Button 
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button 
                variant="primary"
                onClick={handleSavePost}
                loading={isSaving}
              >
                {editingPost ? 'Lưu thay đổi' : 'Tạo bài viết'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(postToDelete)}
        onClose={() => setPostToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa bài viết"
        message="Bạn có chắc chắn muốn xóa bài viết này khỏi hệ thống? Thao tác này không thể hoàn tác."
        confirmText="Xóa bài viết"
        type="danger"
        isLoading={isDeleting}
      />

    </div>
  );
}
