'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, MessageSquare, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';

export default function AccountReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${API_BASE}/api/account/reviews`, {
          headers: headers as Record<string, string>
        });
        const json = await res.json();
        if (json.success) {
          setReviews(json.data || []);
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

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-black uppercase mb-8 pb-4 border-b border-gray-100 flex items-center gap-2">
          <Star className="w-6 h-6" /> Đánh giá của tôi
        </h2>
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
              <div className="flex justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-5 w-48 bg-gray-200 rounded"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-4 w-full bg-gray-100 rounded"></div>
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
        <h2 className="text-2xl font-black uppercase mb-8 pb-4 border-b border-gray-100 flex items-center gap-2">
          <Star className="w-6 h-6" /> Đánh giá của tôi
        </h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-600 font-medium">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-black uppercase mb-8 pb-4 border-b border-gray-100 flex items-center gap-2">
        <Star className="w-6 h-6" /> Đánh giá của tôi
      </h2>

      {reviews.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Bạn chưa viết đánh giá nào</h3>
          <p className="text-gray-500 mb-6">Hãy chia sẻ cảm nhận về sản phẩm đã mua nhé!</p>
          <Link href="/account/orders" className="inline-block px-8 py-3 bg-black text-white font-bold uppercase rounded hover:bg-gray-800 transition-colors">
            Xem đơn hàng
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map(review => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                {/* Content */}
                <div className="flex-grow space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href={`/products/${review.productSlug}`} className="font-bold text-lg hover:underline decoration-2 underline-offset-4">
                      {review.productName}
                    </Link>

                    {review.status === 'APPROVED' && <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded uppercase">Đã duyệt</span>}
                    {review.status === 'PENDING' && <span className="text-xs font-bold px-2 py-1 bg-yellow-100 text-yellow-700 rounded uppercase">Chờ duyệt</span>}
                    {review.status === 'REJECTED' && <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded uppercase">Từ chối</span>}
                  </div>

                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                    ))}
                  </div>

                  <p className="text-gray-700">{review.content}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 pt-2 border-t border-gray-50">
                    <span>Size: <strong className="text-black">{review.purchasedSize}</strong></span>
                    {review.purchasedColor && (
                      <span>Màu: <span className="inline-block w-3 h-3 rounded-full border border-gray-300 align-middle ml-1" style={{ backgroundColor: review.purchasedColor }} /></span>
                    )}
                    <span>Ngày: {new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  <Link
                    href={`/products/${review.productSlug}#reviews`}
                    className="inline-block px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
                  >
                    Xem sản phẩm
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
