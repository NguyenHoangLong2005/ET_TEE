'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReviewService, Review, ReviewEligibility } from '@/lib/services/reviewService';
import { Star, CheckCircle } from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getAuthToken } from '@/lib/auth';

export default function ProductReviews({ productId, slug }: { productId: number, slug: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingSummary, setRatingSummary] = useState<Record<number, number>>({1:0, 2:0, 3:0, 4:0, 5:0});
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  // The review the customer just wrote. The list is sorted by date and paginated, so a new
  // review can sit several pages down; pin it on top so it shows up right away.
  const [myReview, setMyReview] = useState<Review | null>(null);
  
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  
  // Guest Review State
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestOrderCode, setGuestOrderCode] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestChecking, setGuestChecking] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const data = await ReviewService.getReviewsByProductSlug(slug);
      setReviews(data.items);
      setAverageRating(data.averageRating);
      setTotalReviews(data.totalReviews);
      setRatingSummary(data.ratingSummary);
      setPage(0);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    }
  }, [slug]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await ReviewService.getReviewsByProductSlug(slug, next);
      setReviews(prev => {
        const seen = new Set(prev.map(r => r.id));
        return [...prev, ...data.items.filter(r => !seen.has(r.id))];
      });
      setPage(next);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to load more reviews', err);
      toast.error('Không thể tải thêm đánh giá');
    } finally {
      setLoadingMore(false);
    }
  };

  const checkEligibility = useCallback(async (orderCode?: string, email?: string) => {
    try {
      const token = getAuthToken();
      if (token || (orderCode && email)) {
        const elig = await ReviewService.checkReviewEligibility(token, slug, orderCode, email);
        setEligibility(elig);
        return elig;
      } else {
        setEligibility({ canReview: false, reason: 'NOT_LOGGED_IN' });
      }
    } catch (err) {
      setEligibility({ canReview: false, reason: 'NOT_LOGGED_IN' });
    }
  }, [slug]);

  const handleGuestCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestOrderCode.trim() || !guestEmail.trim()) {
      toast.error('Vui lòng nhập mã đơn hàng và email/số điện thoại');
      return;
    }
    setGuestChecking(true);
    const result = await checkEligibility(guestOrderCode.trim(), guestEmail.trim());
    setGuestChecking(false);
    
    if (result && !result.canReview) {
      if (result.reason === 'NOT_PURCHASED') toast.error('Không tìm thấy đơn hàng hợp lệ');
      else if (result.reason === 'NOT_DELIVERED') toast.error('Đơn hàng cần được giao thành công trước khi đánh giá');
      else if (result.reason === 'ALREADY_REVIEWED') toast.error('Sản phẩm này đã được đánh giá từ đơn hàng này');
      else toast.error('Không đủ điều kiện đánh giá');
    }
  };

  useEffect(() => {
    fetchReviews();
    checkEligibility();
  }, [fetchReviews, checkEligibility, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibility?.canReview || !eligibility.orderItemId) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const token = getAuthToken();
      if (!token && (!guestOrderCode || !guestEmail)) throw new Error('Không tìm thấy thông tin xác thực');
      
      const created = await ReviewService.createReview(token, slug, {
        orderItemId: eligibility.orderItemId,
        rating,
        content,
        orderCode: token ? undefined : guestOrderCode.trim(),
        customerEmailOrPhone: token ? undefined : guestEmail.trim()
      });
      
      toast.success('Gửi đánh giá thành công!');
      setMyReview(created);
      
      setContent('');
      setRating(5);
      
      await fetchReviews();
      await checkEligibility();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedReviews = myReview
    ? [myReview, ...reviews.filter(r => r.id !== myReview.id)]
    : reviews;

  return (
    <div className="mt-16" id="reviews">
      <h2 className="text-2xl font-bold uppercase text-slate-900 mb-8 border-b pb-4">
        Đánh giá khách hàng
      </h2>

      <div className="flex flex-col md:flex-row gap-12 mb-12">
        {/* Summary */}
        <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-5xl font-black text-slate-900 mb-2">{averageRating.toFixed(1)}</div>
          <div className="flex mb-2">
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} className={`w-5 h-5 ${star <= averageRating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-slate-200'}`} />
            ))}
          </div>
          <p className="text-sm text-slate-500">{totalReviews} đánh giá</p>
          
          <div className="w-full mt-6 space-y-2">
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingSummary[star] || 0;
              const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center text-sm">
                  <div className="w-8 flex items-center">{star} <Star className="w-3 h-3 ml-1 fill-gray-400 text-slate-400" /></div>
                  <div className="flex-1 mx-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-black" style={{ width: `${percent}%` }}></div>
                  </div>
                  <div className="w-8 text-right text-slate-500">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review Form Area */}
        <div className="w-full md:w-2/3">
          {eligibility?.canReview ? (
            <form onSubmit={handleSubmit} className="border border-slate-200 p-6 rounded-xl bg-white shadow-sm">
              <h3 className="font-bold uppercase mb-4">Viết đánh giá của bạn</h3>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Đánh giá sao</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">Nhận xét chi tiết</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
                  className="w-full border border-slate-300 p-3 text-sm focus:outline-none focus:border-black rounded-lg"
                />
              </div>

              <div className="text-sm text-slate-500 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-700">Đơn hàng hợp lệ</p>
                  <p className="mt-1">Size: {eligibility.purchasedSize} | Màu: <span className="inline-block w-3 h-3 rounded-full border border-slate-300" style={{backgroundColor: eligibility.purchasedColor}}/></p>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-black text-white px-8 py-3 font-bold text-sm uppercase rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors w-full sm:w-auto"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </form>
          ) : (
            <div className="h-full flex flex-col justify-center border border-slate-100 bg-slate-50 p-8 rounded-xl text-center text-sm text-slate-600">
              {eligibility?.reason === 'NOT_LOGGED_IN' && (
                <div>
                  <p className="mb-4 text-base">Vui lòng đăng nhập để đánh giá sản phẩm này.</p>
                  <div className="flex justify-center gap-4">
                    <Link href={`/auth/login?redirect=/products/${slug}#reviews`} className="inline-block px-6 py-2 bg-black text-white font-bold uppercase rounded hover:bg-slate-800 transition-colors">
                      Đăng nhập
                    </Link>
                  </div>
                  
                  <div className="mt-8 border-t border-slate-200 pt-6">
                    {!showGuestForm ? (
                      <button 
                        onClick={() => setShowGuestForm(true)}
                        className="text-sm font-bold uppercase text-slate-700 hover:text-black transition-colors underline underline-offset-4"
                      >
                        Bạn đã mua hàng với tư cách khách vãng lai? Đánh giá bằng mã đơn hàng
                      </button>
                    ) : (
                      <form onSubmit={handleGuestCheck} className="max-w-sm mx-auto text-left">
                        <p className="text-sm font-bold mb-4 uppercase text-center">Xác minh đơn hàng khách vãng lai</p>
                        <div className="mb-3">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Mã đơn hàng</label>
                          <input 
                            type="text" 
                            required
                            value={guestOrderCode}
                            onChange={(e) => setGuestOrderCode(e.target.value)}
                            placeholder="VD: ORD-ABC123XYZ"
                            className="w-full border border-slate-300 rounded p-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email / Số điện thoại</label>
                          <input 
                            type="text" 
                            required
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="Đã dùng khi đặt hàng"
                            className="w-full border border-slate-300 rounded p-2 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setShowGuestForm(false)}
                            className="flex-1 px-4 py-2 bg-slate-200 text-slate-800 rounded font-bold text-xs uppercase hover:bg-slate-300"
                          >
                            Hủy
                          </button>
                          <button 
                            type="submit"
                            disabled={guestChecking}
                            className="flex-1 px-4 py-2 bg-black text-white rounded font-bold text-xs uppercase hover:bg-slate-800 disabled:opacity-50"
                          >
                            {guestChecking ? 'Đang kiểm tra...' : 'Xác minh'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
              {eligibility?.reason === 'NOT_PURCHASED' && (
                <p className="text-base flex items-center justify-center gap-2">
                  Chỉ những khách hàng đã mua sản phẩm này mới có thể viết đánh giá.
                </p>
              )}
              {eligibility?.reason === 'NOT_DELIVERED' && (
                <p className="text-base flex items-center justify-center gap-2">
                  Bạn có thể đánh giá sản phẩm sau khi đơn hàng được giao thành công.
                </p>
              )}
              {eligibility?.reason === 'ALREADY_REVIEWED' && (
                <div className="text-green-600">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-base font-medium">Bạn đã gửi đánh giá cho sản phẩm này rồi. Cảm ơn bạn!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div>
        <h3 className="font-bold uppercase mb-6">{Math.max(totalReviews, displayedReviews.length)} Bình luận</h3>
        {displayedReviews.length === 0 ? (
          <p className="text-slate-500 italic py-8 text-center bg-slate-50 rounded-xl border border-slate-100">Chưa có đánh giá nào cho sản phẩm này.</p>
        ) : (
          <div className="space-y-6">
            {displayedReviews.map((review) => (
              <div key={review.id} className="border-b border-slate-100 pb-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-900">
                      {review.customerNameSnapshot}
                      {myReview?.id === review.id && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">Đánh giá của bạn</span>
                      )}
                    </p>
                    {review.verifiedPurchase && (
                      <span className="flex items-center text-xs text-green-600 mt-1">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Đã mua hàng
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                
                <div className="flex mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-slate-200'}`} />
                  ))}
                </div>
                
                <p className="text-slate-700 text-sm leading-relaxed mb-2">{review.content}</p>
                {review.purchasedSize && review.purchasedColor && (
                  <p className="text-xs text-slate-500">
                    Phân loại: Size {review.purchasedSize}, <span className="inline-block w-2.5 h-2.5 rounded-full border border-slate-300 align-middle ml-1" style={{backgroundColor: review.purchasedColor}}/>
                  </p>
                )}
              </div>
            ))}
            {page + 1 < totalPages && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-slate-900 px-8 py-3 text-xs font-black uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-900 hover:text-white disabled:opacity-50"
                >
                  {loadingMore ? 'Đang tải...' : 'Xem thêm đánh giá'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

