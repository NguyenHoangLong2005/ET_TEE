'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Star, MessageSquare, CornerDownRight, CheckCircle2, AlertCircle, 
  Search, Filter, RefreshCw, Send, Edit, EyeOff, ShieldCheck, 
  ShoppingBag, Sparkles, MessageCircle, HelpCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface ReviewReply {
  id: number;
  replyMessage: string;
  repliedBy: string;
  repliedAt: string;
}

interface CustomerReview {
  id: number;
  productSlug: string;
  productName: string;
  customerName: string;
  rating: number; // 1-5
  content: string;
  purchasedSize?: string;
  purchasedColor?: string;
  verifiedPurchase: boolean;
  createdAt: string;
  status: 'PENDING_REPLY' | 'REPLIED' | 'HIDDEN';
  reply?: ReviewReply;
}

const QUICK_TEMPLATES = [
  {
    title: '❤️ Cảm ơn đánh giá 5 sao',
    text: 'ET.TEE chân thành cảm ơn bạn đã tin tưởng và lựa chọn sản phẩm của shop! Sự hài lòng của bạn là động lực lớn nhất để ET.TEE tiếp tục hoàn thiện chất lượng dịch vụ. Chúc bạn luôn có những trải nghiệm tuyệt vời cùng ET.TEE nha! ✨'
  },
  {
    title: '🤝 Hỗ trợ Đổi trả hàng (1-3 sao)',
    text: 'Dạ ET.TEE rất tiếc vì trải nghiệm mua sắm vừa rồi chưa làm bạn hoàn toàn hài lòng. Bộ phận CSKH ET.TEE đã nhắn tin trực tiếp để hỗ trợ đổi size/mẫu hoàn toàn miễn phí cho bạn ngay nhé ạ! Cảm ơn góp ý quý báu của bạn!'
  },
  {
    title: '👕 Hướng dẫn bảo quản sản phẩm',
    text: 'ET.TEE cảm ơn bạn đã yêu thích sản phẩm ạ! Để áo giữ phom và màu sắc bền đẹp nhất, bạn nhớ giặt bằng nước lạnh và phơi mặt trái dưới bóng râm nhé. Chúc bạn có một ngày thật nhiều niềm vui!'
  }
];

export default function CskhReviewsPage() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_REPLY' | 'REPLIED' | 'HIDDEN'>('ALL');

  // Reply Modal State
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<CustomerReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Modal for Hide/Unhide
  const [hideTarget, setHideTarget] = useState<CustomerReview | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Fetch reviews from API
  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<CustomerReview[]>('/api/staff/cskh/reviews');
      if (Array.isArray(res)) {
        setReviews(res);
      } else {
        setReviews([]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách bình luận');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(rev => {
      if (ratingFilter > 0 && rev.rating !== ratingFilter) return false;
      if (statusFilter !== 'ALL' && rev.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rev.customerName.toLowerCase().includes(q);
        const matchProduct = rev.productName.toLowerCase().includes(q);
        const matchContent = rev.content.toLowerCase().includes(q);
        if (!matchName && !matchProduct && !matchContent) return false;
      }
      return true;
    });
  }, [reviews, ratingFilter, statusFilter, searchQuery]);

  // Statistics
  const totalCount = reviews.length;
  const pendingCount = reviews.filter(r => r.status === 'PENDING_REPLY').length;
  const repliedCount = reviews.filter(r => r.status === 'REPLIED').length;
  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / (totalCount || 1)).toFixed(1);

  // Open Reply Modal
  const handleOpenReplyModal = (review: CustomerReview) => {
    setSelectedReview(review);
    setReplyText(review.reply ? review.reply.replyMessage : '');
    setIsReplyModalOpen(true);
  };

  // Select Quick Template
  const handleSelectTemplate = (templateText: string) => {
    setReplyText(templateText);
  };

  // Submit Reply
  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        reviewId: selectedReview.id,
        replyMessage: replyText.trim()
      };

      await apiClient.post(`/api/staff/cskh/reviews/${selectedReview.id}/reply`, payload);

      const newReply: ReviewReply = {
        id: Date.now(),
        replyMessage: replyText.trim(),
        repliedBy: 'Chuyên viên CSKH ET.TEE',
        repliedAt: new Date().toISOString()
      };

      setReviews(prev => prev.map(r => {
        if (r.id === selectedReview.id) {
          return {
            ...r,
            status: 'REPLIED',
            reply: newReply
          };
        }
        return r;
      }));

      toast.success(`Đã gửi phản hồi cho khách hàng ${selectedReview.customerName} thành công!`);
      setIsReplyModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu phản hồi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Hide Review via ConfirmModal
  const handleConfirmToggleHide = async () => {
    if (!hideTarget) return;
    const newStatus = hideTarget.status === 'HIDDEN' ? 'PENDING_REPLY' : 'HIDDEN';
    try {
      setIsTogglingStatus(true);
      await apiClient.patch(`/api/staff/cskh/reviews/${hideTarget.id}/status`, { status: newStatus });
      setReviews(prev => prev.map(r => r.id === hideTarget.id ? { ...r, status: newStatus } : r));
      toast.success(newStatus === 'HIDDEN' ? 'Đã ẩn bình luận thành công' : 'Đã hiện bình luận lại');
      setHideTarget(null);
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi đổi trạng thái bình luận');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN', 'STAFF']}>
      <div className="min-h-screen bg-slate-50/60 p-6 md:p-8 font-sans antialiased text-slate-800 space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Quản Lý Đánh Giá Khách Hàng"
          subtitle="Phản hồi đánh giá sản phẩm 1-5 sao, giải đáp thắc mắc và nâng cao chất lượng dịch vụ"
          breadcrumbs={[
            { label: 'Staff Hub', href: '/staff/dashboard' },
            { label: 'CSKH', href: '/staff/support' },
            { label: 'Đánh giá' }
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/staff/support">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  <span>CSKH Hub</span>
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={fetchReviews}
                disabled={loading}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </Button>
            </div>
          }
        />

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Tổng Đánh giá"
            value={totalCount}
            icon={MessageCircle}
            color="info"
          />
          <StatCard
            title="Chờ CSKH Trả Lời"
            value={pendingCount}
            icon={AlertCircle}
            color="warning"
          />
          <StatCard
            title="Đã Phản Hồi"
            value={repliedCount}
            icon={CheckCircle2}
            color="success"
          />
          <StatCard
            title="Điểm Đánh Giá TB"
            value={`${avgRating} ⭐`}
            icon={Sparkles}
            color="purple"
          />
        </div>

        {/* Filter & Search Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc sao:
            </span>
            {[0, 5, 4, 3, 2, 1].map((stars) => (
              <button
                key={stars}
                onClick={() => setRatingFilter(stars)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  ratingFilter === stars
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {stars === 0 ? 'Tất cả' : `${stars} ⭐`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING_REPLY">Chờ phản hồi ({pendingCount})</option>
              <option value="REPLIED">Đã phản hồi ({repliedCount})</option>
              <option value="HIDDEN">Đã ẩn</option>
            </select>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên khách, sản phẩm, nội dung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* Main Reviews List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-red-600" />
              <span>Đang tải danh sách bình luận đánh giá...</span>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">Không tìm thấy bình luận đánh giá nào phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            filteredReviews.map((rev) => (
              <div 
                key={rev.id} 
                className={`bg-white rounded-2xl border transition-all p-5 space-y-4 shadow-2xs ${
                  rev.status === 'PENDING_REPLY' 
                    ? 'border-amber-200 bg-amber-50/10' 
                    : rev.status === 'HIDDEN'
                    ? 'border-slate-200 opacity-60 bg-slate-50'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 font-extrabold flex items-center justify-center text-sm">
                      {rev.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{rev.customerName}</h3>
                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Đã mua hàng
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(rev.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Rating Stars */}
                    <div className="flex items-center gap-0.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                        />
                      ))}
                      <span className="text-xs font-extrabold text-amber-800 ml-1.5">{rev.rating}.0</span>
                    </div>

                    {/* Status Badge */}
                    <StatusBadge
                      label={rev.status === 'PENDING_REPLY' ? 'Chờ CSKH' : rev.status === 'REPLIED' ? 'Đã phản hồi' : 'Đã ẩn'}
                      tone={rev.status === 'PENDING_REPLY' ? 'warning' : rev.status === 'REPLIED' ? 'success' : 'neutral'}
                    />
                  </div>
                </div>

                {/* Product Info & Customer Comment */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{rev.productName}</span>
                    {(rev.purchasedSize || rev.purchasedColor) && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-slate-600">
                        {rev.purchasedSize} / {rev.purchasedColor}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed font-medium bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
                    "{rev.content}"
                  </p>
                </div>

                {/* Staff Reply Block (if exists) */}
                {rev.reply && (
                  <div className="bg-red-50/60 border border-red-200/80 rounded-xl p-4 space-y-2 ml-4 relative">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-red-900">
                        <CornerDownRight className="w-4 h-4 text-red-600" />
                        <span>Phản hồi từ CSKH ET.TEE ({rev.reply.repliedBy})</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(rev.reply.repliedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed pl-5 font-normal">
                      {rev.reply.replyMessage}
                    </p>
                  </div>
                )}

                {/* Card Actions Footer */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHideTarget(rev)}
                    className="flex items-center gap-1"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{rev.status === 'HIDDEN' ? 'Hiện bình luận' : 'Ẩn bình luận'}</span>
                  </Button>

                  <Button
                    variant={rev.reply ? 'primary' : 'primary'}
                    size="sm"
                    onClick={() => handleOpenReplyModal(rev)}
                    className="flex items-center gap-1.5"
                  >
                    {rev.reply ? <Edit className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{rev.reply ? 'Sửa phản hồi' : 'Trả lời bình luận'}</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Trả Lời Bình Luận */}
        {isReplyModalOpen && selectedReview && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-red-500" />
                  <h3 className="font-extrabold text-base">Trả lời bình luận đánh giá</h3>
                </div>
                <button
                  onClick={() => setIsReplyModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveReply} className="p-6 space-y-5">
                {/* Customer Review Snapshot */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{selectedReview.customerName}</span>
                    <span className="text-amber-500 font-bold flex items-center gap-1">
                      {selectedReview.rating} ⭐
                    </span>
                  </div>
                  <p className="text-slate-700 italic">"{selectedReview.content}"</p>
                  <p className="text-[11px] text-slate-400">Sản phẩm: {selectedReview.productName}</p>
                </div>

                {/* Quick Reply Templates */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mẫu phản hồi nhanh (Click để chọn)
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {QUICK_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectTemplate(tmpl.text)}
                        className="text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50/50 hover:border-red-200 transition-all text-xs font-semibold text-slate-700"
                      >
                        <p className="font-bold text-slate-900 mb-0.5">{tmpl.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{tmpl.text}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea Reply */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nội dung phản hồi CSKH <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập câu trả lời lịch sự, chuyên nghiệp đại diện cho thương hiệu ET.TEE..."
                    className="w-full border border-slate-200/80 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsReplyModalOpen(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting || !replyText.trim()}
                    className="flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Modal for Hide/Unhide */}
        <ConfirmModal
          isOpen={Boolean(hideTarget)}
          onClose={() => setHideTarget(null)}
          onConfirm={handleConfirmToggleHide}
          title={hideTarget?.status === 'HIDDEN' ? 'Hiển thị lại bình luận' : 'Ẩn bình luận khỏi Storefront'}
          message={`Bạn có chắc muốn ${hideTarget?.status === 'HIDDEN' ? 'hiển thị lại' : 'ẩn'} đánh giá của "${hideTarget?.customerName}" cho sản phẩm "${hideTarget?.productName}"?`}
          confirmText={hideTarget?.status === 'HIDDEN' ? 'Hiển thị' : 'Ẩn bình luận'}
          type={hideTarget?.status === 'HIDDEN' ? 'info' : 'warning'}
          isLoading={isTogglingStatus}
        />
      </div>
    </PermissionGuard>
  );
}
