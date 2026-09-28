"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, Edit, Trash2, Image as ImageIcon, Link as LinkIcon,
  Calendar, Activity, MousePointerClick,
  Eye, CheckCircle, XCircle, Filter, X
} from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";
import ConfirmModal from "@/components/ui/ConfirmModal";

// --- Types ---
type Position = 'ALL' | 'HERO' | 'POPUP' | 'SIDEBAR' | 'CATEGORY' | 'FOOTER' | 'MOBILE_BANNER';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: Position;
  displayOrder: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
}

export default function BannerManagementPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPosition, setFilterPosition] = useState<Position>('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Banner>>({
    title: "",
    imageUrl: "",
    linkUrl: "",
    position: "HERO",
    displayOrder: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    isActive: true
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const baseUrl = getApiBaseUrl();
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const response = await fetch(`${baseUrl}/api/marketing/admin/banners`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setBanners(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to fetch banners", error);
      setBanners([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        ...banner,
        startDate: banner.startDate.split('T')[0],
        endDate: banner.endDate.split('T')[0]
      });
    } else {
      setEditingBanner(null);
      setFormData({
        title: "",
        imageUrl: "",
        linkUrl: "",
        position: "HERO",
        displayOrder: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!formData.title || !formData.imageUrl || !formData.position) {
      toast.error("Vui lòng điền các trường bắt buộc");
      return;
    }

    const payload = {
      ...formData,
      startDate: new Date(formData.startDate as string).toISOString(),
      endDate: new Date(formData.endDate as string).toISOString()
    };

    const isEdit = !!editingBanner;

    // Optimistic update
    const tempId = isEdit ? editingBanner.id : `temp-${Date.now()}`;
    const newBanner = { ...payload, id: tempId, impressions: isEdit ? editingBanner.impressions : 0, clicks: isEdit ? editingBanner.clicks : 0 } as Banner;

    if (isEdit) {
      setBanners(prev => prev.map(b => b.id === tempId ? newBanner : b));
    } else {
      setBanners(prev => [newBanner, ...prev]);
    }

    setIsModalOpen(false);
    toast.success(isEdit ? "Đã cập nhật banner" : "Đã tạo banner mới");

    try {
      const baseUrl = getApiBaseUrl();
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const url = isEdit
        ? `${baseUrl}/api/marketing/admin/banners/${editingBanner.id}`
        : `${baseUrl}/api/marketing/admin/banners`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Không thể lưu banner");
      }

      toast.success(isEdit ? "Cập nhật banner thành công" : "Tạo banner thành công");
      await fetchBanners();
    } catch (error: any) {
      toast.error(error?.message || "Lỗi khi lưu banner");
      await fetchBanners();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    // Optimistic
    setBanners(prev => prev.map(b => b.id === id ? { ...b, isActive: newStatus } : b));

    try {
      const baseUrl = getApiBaseUrl();
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`${baseUrl}/api/staff/marketing/banners/${id}/status`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại");
      toast.success(`Đã ${newStatus ? 'kích hoạt' : 'ẩn'} banner`);
    } catch (error: any) {
      toast.error(error?.message || "Lỗi cập nhật trạng thái banner");
      await fetchBanners();
    }
  };

  const handleConfirmDelete = async () => {
    if (!bannerToDelete) return;
    const id = bannerToDelete;

    // Optimistic
    setBanners(prev => prev.filter(b => b.id !== id));
    toast.success("Đã xóa banner thành công");
    setIsDeleting(true);

    try {
      const baseUrl = getApiBaseUrl();
      const authHeaders = getAuthHeaders() as Record<string, string>;
      await fetch(`${baseUrl}/api/marketing/admin/banners/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      setBannerToDelete(null);
    } catch (error) {
      console.error("Delete failed", error);
      toast.error("Không thể xóa banner trên hệ thống");
    } finally {
      setIsDeleting(false);
    }
  };

  // Derived stats
  const activeBanners = banners.filter(b => b.isActive).length;
  const totalImpressions = banners.reduce((acc, b) => acc + (b.impressions || 0), 0);
  const topBanner = [...banners].sort((a, b) => {
    const ctrA = a.impressions ? a.clicks / a.impressions : 0;
    const ctrB = b.impressions ? b.clicks / b.impressions : 0;
    return ctrB - ctrA;
  })[0];
  const topCtr = topBanner && topBanner.impressions ? ((topBanner.clicks / topBanner.impressions) * 100).toFixed(1) : "0.0";

  const filteredBanners = filterPosition === 'ALL'
    ? banners
    : banners.filter(b => b.position === filterPosition);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quản lý Banner</h1>
            <p className="text-slate-500 mt-1">Cấu hình các banner quảng cáo trên hệ thống</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-sm"
          >
            <Plus size={18} />
            <span>Thêm Banner</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Banner Đang Hoạt Động</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2">{activeBanners}<span className="text-lg text-slate-400 font-normal"> / {banners.length}</span></h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl">
                <Activity className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Lượt Xem (Tháng này)</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2">{totalImpressions.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-pink-50 rounded-xl">
                <Eye className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Banner Hiệu Quả Nhất</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold text-slate-900">{topCtr}%</h3>
                  <span className="text-sm text-slate-500">CTR</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">{topBanner?.title || 'N/A'}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <MousePointerClick className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <Filter size={18} className="text-slate-400 flex-shrink-0" />
            {(['ALL', 'HERO', 'POPUP', 'SIDEBAR', 'CATEGORY', 'FOOTER'] as Position[]).map(pos => (
              <button
                key={pos}
                onClick={() => setFilterPosition(pos)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filterPosition === pos
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                }`}
              >
                {pos === 'ALL' ? 'Tất cả' : pos}
              </button>
            ))}
          </div>
        </div>

        {/* Grid List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
            <ImageIcon className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700">Không có banner nào</h3>
            <p className="text-slate-400 mt-1">Thay đổi bộ lọc hoặc thêm banner mới</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBanners.map(banner => (
              <div key={banner.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors group flex flex-col shadow-sm">
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'
                    }}
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-medium rounded-lg border border-white/10">
                      {banner.position}
                    </span>
                    <span className={`px-2.5 py-1 backdrop-blur-md text-xs font-medium rounded-lg border flex items-center gap-1 ${
                      banner.isActive
                        ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/40"
                        : "bg-slate-500/20 text-slate-100 border-slate-400/40"
                    }`}>
                      {banner.isActive ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Action overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleOpenModal(banner)}
                      className="p-2.5 bg-white/10 hover:bg-rose-500 hover:text-white text-white rounded-full backdrop-blur-md transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(banner.id, banner.isActive)}
                      className="p-2.5 bg-white/10 hover:bg-amber-500 hover:text-white text-white rounded-full backdrop-blur-md transition-colors"
                      title={banner.isActive ? "Ẩn" : "Kích hoạt"}
                    >
                      {banner.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                    </button>
                    <button
                      onClick={() => setBannerToDelete(banner.id)}
                      className="p-2.5 bg-white/10 hover:bg-red-500 hover:text-white text-white rounded-full backdrop-blur-md transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-lg text-slate-900 mb-2 line-clamp-1" title={banner.title}>
                    {banner.title}
                  </h3>

                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center text-sm text-slate-500 gap-2">
                      <LinkIcon size={14} className="text-slate-400" />
                      <span className="truncate">{banner.linkUrl || 'Không có link'}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500 gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{new Date(banner.startDate).toLocaleDateString()} - {new Date(banner.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Lượt xem</p>
                      <p className="font-medium text-slate-700">{banner.impressions?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Tỷ lệ Click (CTR)</p>
                      <p className="font-medium text-slate-700">
                        {banner.impressions ? ((banner.clicks / banner.impressions) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Cập nhật/Thêm mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl relative z-10 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingBanner ? 'Cập nhật Banner' : 'Thêm Banner Mới'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tiêu đề Banner <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 transition-colors"
                  placeholder="VD: Flash Sale Mùa Hè"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">URL Hình Ảnh <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 transition-colors"
                  placeholder="https://..."
                />
                {formData.imageUrl && (
                  <div className="mt-2 relative aspect-[21/9] bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Invalid+Image+URL'
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Vị trí hiển thị <span className="text-rose-500">*</span></label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value as Position})}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 transition-colors"
                  >
                    <option value="HERO">Trang chủ Hero</option>
                    <option value="POPUP">Popup Khuyến mãi</option>
                    <option value="SIDEBAR">Cột bên</option>
                    <option value="CATEGORY">Trang danh mục</option>
                    <option value="FOOTER">Cuối trang</option>
                    <option value="MOBILE_BANNER">Mobile Banner</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 1})}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 transition-colors"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Đường dẫn khi click</label>
                <input
                  type="text"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({...formData, linkUrl: e.target.value})}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 transition-colors"
                  placeholder="/collections/summer"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700">Trạng thái Hoạt động</span>
                </label>
              </div>

            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-full font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveBanner}
                className="px-5 py-2.5 rounded-full font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Lưu Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(bannerToDelete)}
        onClose={() => setBannerToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa banner"
        message="Bạn có chắc chắn muốn xóa banner quảng cáo này khỏi hệ thống? Thao tác này không thể hoàn tác."
        confirmText="Xóa banner"
        type="danger"
        isLoading={isDeleting}
      />

    </div>
  );
}
