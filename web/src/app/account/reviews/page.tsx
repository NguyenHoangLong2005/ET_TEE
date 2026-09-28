'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Star, MessageSquare, AlertCircle, Package } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';

const getApiBase = () => getApiBaseUrl();

export default function AccountReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${getApiBase()}/api/account/reviews`, {
          headers: headers as Record<string, string>
        });
        const json = await res.json();
        if (json.success) {
          // Sort newest first
          const sorted = (json.data || []).sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setReviews(sorted);
        } else {
          setLoadError('Không thể tải danh sách đánh giá. Vui lòng thử lại.');
        }
      } catch {
        setLoadError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    if (filter === 'ALL') return reviews;
    return reviews.filter(r => r.status === filter);
  }, [reviews, filter]);

  const summary = useMemo(() => {
    if (reviews.length === 0) return { count: 0, avg: 0 };
    const sum = reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    return { count: reviews.length, avg: (sum / reviews.length).toFixed(1) };
  }, [reviews]);

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-8 pb-4 border-b border-slate-200/80 flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" /> Đánh giá của tôi
        </h2>
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-200/80 rounded-3xl p-6 animate-pulse shadow-sm">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-slate-200 rounded-2xl"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-48 bg-slate-200 rounded-lg"></div>
                  <div className="h-4 w-24 bg-slate-200 rounded-lg"></div>
                  <div className="h-4 w-full bg-slate-100 rounded-lg"></div>
                  <div className="h-4 w-3/4 bg-slate-100 rounded-lg"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-8 pb-4 border-b border-slate-200/80 flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" /> Đánh giá của tôi
        </h2>
        <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-6 text-center space-y-4 max-w-3xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <p className="text-rose-700 font-medium text-sm">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-xs uppercase tracking-wider"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-slate-200/80 gap-4">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" /> Đánh giá của tôi
        </h2>
        
        {reviews.length > 0 && (
          <div className="text-xs text-slate-600 bg-slate-50 px-4 py-2 rounded-full border border-slate-200/80 font-medium">
            Đã viết <span className="font-bold text-slate-900">{summary.count}</span> đánh giá • Trung bình <span className="font-bold text-amber-600">{summary.avg} ★</span>
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="flex overflow-x-auto pb-2 mb-6 gap-2 hide-scrollbar">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'APPROVED', label: 'Đã duyệt' },
            { id: 'PENDING', label: 'Chờ duyệt' },
            { id: 'REJECTED', label: 'Từ chối' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filter === tab.id 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="bg-slate-50/60 border border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Bạn chưa viết đánh giá nào</h3>
          <p className="text-slate-500 text-sm mb-6">Hãy chia sẻ cảm nhận về sản phẩm đã mua nhé!</p>
          <Link href="/account/orders" className="inline-block px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-wider rounded-full shadow-md hover:scale-105 active:scale-95 transition-all">
            Xem đơn hàng
          </Link>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-slate-50/60 border border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Không có đánh giá nào trong trạng thái này.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReviews.map(review => (
            <div key={review.id} className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                
                {/* Product Image Thumbnail */}
                <Link href={`/products/${review.productSlug}`} className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-200/80 overflow-hidden hidden sm:flex">
                  {review.productImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={review.productImageUrl} alt={review.productName} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-8 h-8 text-slate-300" />
                  )}
                </Link>

                {/* Content */}
                <div className="flex-grow space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <Link href={`/products/${review.productSlug}`} className="font-bold text-slate-900 text-base hover:text-primary line-clamp-1 block transition-colors">
                        {review.productName}
                      </Link>
                      <div className="flex items-center gap-2 flex-wrap">
                        {review.status === 'APPROVED' && <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">ĐÃ DUYỆT</span>}
                        {review.status === 'PENDING' && <span className="text-[10px] font-bold px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">CHỜ DUYỆT</span>}
                        {review.status === 'REJECTED' && <span className="text-[10px] font-bold px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-200">TỪ CHỐI</span>}
                        
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-current' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <p className="text-slate-700 text-sm leading-relaxed">{review.content}</p>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100">
                    {review.purchasedSize && (
                      <span>Size: <strong className="text-slate-900">{review.purchasedSize}</strong></span>
                    )}
                    {review.purchasedColor && (
                      <span className="flex items-center gap-1">
                        Màu: <span className="inline-block w-3 h-3 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: review.purchasedColor }} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

