export type CartItem = {
  id: number;
  variantId: number;
  productSlug: string;
  productName: string;
  productImage: string;
  color: string;
  colorHex: string;
  size: string;
  price: number;
  salePrice: number;
  quantity: number;
  availableQuantity: number;
  itemTotal: number;
};

export type CartData = {
  id: number;
  items: CartItem[];
  subtotal: number;
  totalQuantity: number;
};

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';
};

import { getAuthHeaders } from '@/lib/auth';

const getHeaders = () => {
  return getAuthHeaders(true) as Record<string, string>;
};

export const CartService = {
  async getCart(): Promise<CartData | null> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/cart`, {
        headers: getHeaders()
      });
      if (res.status === 401 || res.status === 403 || res.status === 404) return null;
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (error) {
      console.warn("Cart fetch failed:", error);
      return null;
    }
  },

  async addToCart(variantId: number, quantity: number): Promise<CartData> {
    const res = await fetch(`${getBaseUrl()}/api/cart/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ variantId, quantity })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || error.message || 'Lỗi khi thêm vào giỏ hàng');
    }
    return await res.json();
  },

  async updateQuantity(itemId: number, quantity: number): Promise<CartData> {
    const res = await fetch(`${getBaseUrl()}/api/cart/items/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ quantity })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || error.message || 'Lỗi cập nhật số lượng');
    }
    return await res.json();
  },

  async removeItem(itemId: number): Promise<CartData> {
    const res = await fetch(`${getBaseUrl()}/api/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || error.message || 'Lỗi xóa sản phẩm');
    }
    return await res.json();
  },

  async mergeCart(): Promise<void> {
    const { getGuestCartToken, getAuthToken } = await import('@/lib/auth');
    const guestToken = getGuestCartToken();
    const token = getAuthToken();
    
    if (token && guestToken) {
      try {
        await fetch(`${getBaseUrl()}/api/cart/merge`, {
          method: 'POST',
          headers: getHeaders()
        });
        localStorage.removeItem('guest_cart_token');
      } catch (e) {
        console.error('Failed to merge cart', e);
      }
    }
  }
};
