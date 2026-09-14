const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';
};

export type Review = {
  id: number;
  rating: number;
  content: string;
  customerNameSnapshot: string;
  purchasedSize?: string;
  purchasedColor?: string;
  verifiedPurchase: boolean;
  createdAt: string;
};

export type ReviewSummary = {
  items: Review[];
  averageRating: number;
  totalReviews: number;
  ratingSummary: Record<number, number>;
  currentPage: number;
  totalPages: number;
};

export type ReviewEligibility = {
  canReview: boolean;
  reason: 'NOT_LOGGED_IN' | 'NOT_PURCHASED' | 'NOT_DELIVERED' | 'ALREADY_REVIEWED' | 'ELIGIBLE';
  orderItemId?: number;
  purchasedSize?: string;
  purchasedColor?: string;
};

export const ReviewService = {
  async getReviewsByProductSlug(slug: string, page = 0, pageSize = 5, rating?: number): Promise<ReviewSummary> {
    let url = `${getBaseUrl()}/api/products/${slug}/reviews?page=${page}&pageSize=${pageSize}`;
    if (rating) {
      url += `&rating=${rating}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Lỗi khi tải đánh giá');
    return res.json();
  },

  async checkReviewEligibility(token: string | null, slug: string, orderCode?: string, email?: string): Promise<ReviewEligibility> {
    if (!token && (!orderCode || !email)) return { canReview: false, reason: 'NOT_LOGGED_IN' };

    let url = `${getBaseUrl()}/api/products/${slug}/reviews/eligibility`;
    if (orderCode && email) {
      url += `?orderCode=${encodeURIComponent(orderCode)}&email=${encodeURIComponent(email)}`;
    }

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      return { canReview: false, reason: 'NOT_LOGGED_IN' };
    }
    return res.json();
  },

  async createReview(token: string | null, slug: string, data: { orderItemId: number; rating: number; content: string; orderCode?: string; customerEmailOrPhone?: string }): Promise<Review> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getBaseUrl()}/api/products/${slug}/reviews`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    const json = await res.json();

    if (!res.ok) {
      if (res.status === 401) throw new Error('Vui lòng đăng nhập để đánh giá');
      if (res.status === 403) {
        throw new Error(json.message === 'NOT_PURCHASED' ? 'Bạn phải mua sản phẩm mới có quyền đánh giá' : 'Đơn hàng chưa được giao thành công');
      }
      if (res.status === 409) throw new Error('Bạn đã đánh giá sản phẩm này rồi');
      throw new Error(json.message || 'Lỗi khi gửi đánh giá');
    }

    return json.data;
  }
};
