// Campaign Management: c:\userdata\fashion-recommendation-system\web\src\app\(staff)\staff\dashboard\marketing\campaigns\page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Megaphone, Plus, Calendar, Tag, Activity, Pause, Play, Trash2,
  BarChart2, X, DollarSign, Users, CheckCircle2, Clock3
} from "lucide-react";
import { getAuthHeaders } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";
import ConfirmModal from "@/components/ui/ConfirmModal";

// Types
type CampaignType = "FLASH_SALE" | "SEASONAL" | "LOYALTY" | "REFERRAL";
type TargetAudience = "ALL" | "NEW_CUSTOMERS" | "RETURNING" | "VIP";
type CampaignStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED";

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget: number;
  description: string;
  targetAudience: TargetAudience;
  linkedVouchersCount?: number;
}

const STATUS_CFG: Record<CampaignStatus, { label: string; cls: string }> = {
  ACTIVE:    { label: "Đang chạy",   cls: "bg-emerald-100 text-emerald-700" },
  SCHEDULED: { label: "Sắp diễn ra", cls: "bg-sky-100 text-sky-700" },
  PAUSED:    { label: "Tạm dừng",    cls: "bg-amber-100 text-amber-700" },
  ENDED:     { label: "Đã kết thúc", cls: "bg-slate-100 text-slate-500" },
  CANCELLED: { label: "Đã hủy",      cls: "bg-rose-100 text-rose-700" },
  DRAFT:     { label: "Bản nháp",    cls: "bg-slate-100 text-slate-600" },
};

export default function CampaignsPage() {
  const baseUrl = getApiBaseUrl();
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Form State
  const [formData, setFormData] = useState({
    name: "",
    type: "SEASONAL" as CampaignType,
    description: "",
    startDate: "",
    endDate: "",
    budget: 0,
    targetAudience: "ALL" as TargetAudience,
  });

  // Modal State
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignStats, setCampaignStats] = useState<{
    impressions?: number;
    clicks?: number;
    ctr?: number;
    conversions?: number;
    revenue?: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (!selectedCampaignId) {
      setCampaignStats(null);
      return;
    }
    const fetchCampaignStats = async () => {
      setIsLoadingStats(true);
      try {
        const authHeaders = getAuthHeaders() as Record<string, string>;
        const res = await fetch(`${baseUrl}/api/staff/marketing/analytics/campaigns/${selectedCampaignId}`, {
          headers: authHeaders,
        });
        if (res.ok) {
          const data = await res.json();
          setCampaignStats(data);
        } else {
          setCampaignStats({ impressions: 0, clicks: 0, ctr: 0, conversions: 0, revenue: 0 });
        }
      } catch {
        setCampaignStats({ impressions: 0, clicks: 0, ctr: 0, conversions: 0, revenue: 0 });
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchCampaignStats();
  }, [selectedCampaignId, baseUrl]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const response = await fetch(`${baseUrl}/api/staff/marketing/campaigns`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.data ?? data?.content ?? []);
      setCampaigns(Array.isArray(list) ? list : []);
    } catch (error) {
      console.warn("Failed to fetch campaigns", error);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const response = await fetch(`${baseUrl}/api/staff/marketing/campaigns`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Tạo chiến dịch thất bại");
      }

      toast.success("Chiến dịch đã được tạo thành công");
      await fetchCampaigns();
      setActiveTab("list");
      setFormData({
        name: "",
        type: "SEASONAL" as CampaignType,
        description: "",
        startDate: "",
        endDate: "",
        budget: 0,
        targetAudience: "ALL" as TargetAudience,
      });
    } catch (error: any) {
      toast.error(error?.message || "Không thể tạo chiến dịch");
    }
  };

  const toggleStatus = async (id: string, currentStatus: CampaignStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    // Optimistic
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as CampaignStatus } : c));

    try {
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`${baseUrl}/api/staff/marketing/campaigns/${id}/status`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Cập nhật trạng thái thất bại");
      toast.success(`Đã ${newStatus === "ACTIVE" ? "kích hoạt" : "tạm dừng"} chiến dịch`);
    } catch (error: any) {
      toast.error(error?.message || `Lỗi cập nhật trạng thái chiến dịch`);
      fetchCampaigns();
    }
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;
    const id = campaignToDelete;

    // Optimistic
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setIsDeleting(true);

    try {
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`${baseUrl}/api/staff/marketing/campaigns/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Xóa chiến dịch thất bại");
      toast.success("Đã xóa chiến dịch thành công");
      setCampaignToDelete(null);
    } catch (error: any) {
      toast.error(error?.message || "Không thể xóa chiến dịch trên hệ thống");
      fetchCampaigns();
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats — all derived from real data, no placeholders
  const activeCount = campaigns.filter(c => c.status === "ACTIVE").length;
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
  const endingSoonCount = campaigns.filter(c => {
    if (c.status !== "ACTIVE" || !c.endDate) return false;
    const days = (new Date(c.endDate).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 3;
  }).length;
  const draftCount = campaigns.filter(c => c.status === "DRAFT").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-slate-500 text-sm">Chiến dịch hoạt động</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
              <Activity size={20} />
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-slate-500 text-sm">Tổng ngân sách</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{(totalBudget / 1000000).toFixed(0)}M ₫</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-slate-500 text-sm">Sắp kết thúc (≤3 ngày)</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{endingSoonCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock3 size={20} />
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-slate-500 text-sm">Bản nháp</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{draftCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'list' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            onClick={() => setActiveTab('list')}
          >
            <Megaphone size={18} />
            Danh sách chiến dịch
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'create' ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            onClick={() => setActiveTab('create')}
          >
            <Plus size={18} />
            Tạo chiến dịch mới
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'list' ? (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-10 text-slate-400">Đang tải...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                <Megaphone className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <p className="font-semibold text-slate-700">Chưa có chiến dịch nào</p>
                <p className="text-sm text-slate-400 mt-1">Tạo chiến dịch đầu tiên để bắt đầu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {campaigns.map(camp => {
                  const statusCfg = STATUS_CFG[camp.status] ?? STATUS_CFG.DRAFT;
                  const canToggle = camp.status === "ACTIVE" || camp.status === "PAUSED";
                  return (
                    <div key={camp.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-violet-300 transition-colors shadow-sm">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">{camp.name}</h3>
                            <div className="flex gap-2 mt-2">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                {camp.type}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${statusCfg.cls}`}>
                                {statusCfg.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canToggle && (
                              <button onClick={() => toggleStatus(camp.id, camp.status)} className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors" title="Bật/Tắt">
                                {camp.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
                              </button>
                            )}
                            <button onClick={() => setCampaignToDelete(camp.id)} className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-full transition-colors" title="Xóa">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{camp.description}</p>

                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-violet-500" />
                            <span className="truncate">{new Date(camp.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign size={14} className="text-violet-500" />
                            <span>{(camp.budget / 1000).toLocaleString()}k ₫</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-violet-500" />
                            <span>{camp.targetAudience}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tag size={14} className="text-violet-500" />
                            <span>{camp.linkedVouchersCount ?? 0} Vouchers</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedCampaignId(camp.id)}
                        className="w-full py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-violet-200"
                      >
                        <BarChart2 size={16} />
                        Xem phân tích
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Tạo chiến dịch mới</h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tên chiến dịch</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500 text-slate-900" placeholder="VD: Khuyến mãi mùa Hè" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Loại</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as CampaignType})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500 text-slate-900">
                    <option value="FLASH_SALE">Flash Sale</option>
                    <option value="SEASONAL">Theo mùa</option>
                    <option value="LOYALTY">Loyalty Program</option>
                    <option value="REFERRAL">Referral</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mô tả</label>
                  <textarea rows={3} required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500 text-slate-900" placeholder="Chi tiết chiến dịch..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Thời gian bắt đầu</label>
                  <input required type="datetime-local" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500 text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Thời gian kết thúc</label>
                  <input required type="datetime-local" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500 text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Ngân sách (VNĐ)</label>
                  <input required type="number" min="0" value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500 text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Đối tượng mục tiêu</label>
                  <select value={formData.targetAudience} onChange={e => setFormData({...formData, targetAudience: e.target.value as TargetAudience})} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500 text-slate-900">
                    <option value="ALL">Tất cả</option>
                    <option value="NEW_CUSTOMERS">Khách hàng mới</option>
                    <option value="RETURNING">Khách hàng quay lại</option>
                    <option value="VIP">Khách VIP</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors">
                  Lưu chiến dịch
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Analytics Modal */}
        {selectedCampaignId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <BarChart2 className="text-violet-600" /> Phân tích chiến dịch
                </h3>
                <button onClick={() => setSelectedCampaignId(null)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {(() => {
                  const camp = campaigns.find(c => c.id === selectedCampaignId);
                  if (isLoadingStats) {
                    return (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-sm">Đang tải phân tích chiến dịch...</p>
                      </div>
                    );
                  }

                  const views = campaignStats?.impressions ?? 0;
                  const clicks = campaignStats?.clicks ?? 0;
                  const conversions = campaignStats?.conversions ?? 0;
                  const ctr = campaignStats?.ctr ?? (views > 0 ? Number(((clicks / views) * 100).toFixed(1)) : 0);
                  const revenue = campaignStats?.revenue ?? 0;
                  const budget = camp?.budget || 0;
                  const roi = budget > 0 ? (((revenue - budget) / budget) * 100).toFixed(1) : "0.0";

                  return (
                    <div>
                      <h4 className="text-lg font-medium text-slate-900 mb-6">{camp?.name}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-slate-500 text-sm mb-1">Lượt xem</p>
                          <p className="text-2xl font-bold text-slate-900">{views.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-slate-500 text-sm mb-1">Lượt click</p>
                          <p className="text-2xl font-bold text-slate-900">{clicks.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-slate-500 text-sm mb-1">CTR</p>
                          <p className="text-2xl font-bold text-violet-600">{ctr}%</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-slate-500 text-sm mb-1">Chuyển đổi</p>
                          <p className="text-2xl font-bold text-emerald-600">{conversions.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 md:col-span-2">
                          <p className="text-slate-500 text-sm mb-1">Doanh thu mang lại</p>
                          <p className="text-2xl font-bold text-amber-600">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(revenue)}</p>
                          {budget > 0 && (
                            <p className="text-sm mt-1 text-slate-500">ROI: <span className={Number(roi) > 0 ? 'text-emerald-600' : 'text-rose-600'}>{roi}%</span></p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button onClick={() => setSelectedCampaignId(null)} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={Boolean(campaignToDelete)}
          onClose={() => setCampaignToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Xác nhận xóa chiến dịch"
          message="Bạn có chắc chắn muốn xóa chiến dịch marketing này khỏi hệ thống? Dữ liệu thống kê liên quan sẽ bị gỡ bỏ."
          confirmText="Xóa chiến dịch"
          type="danger"
          isLoading={isDeleting}
        />

      </div>
    </div>
  );
}
