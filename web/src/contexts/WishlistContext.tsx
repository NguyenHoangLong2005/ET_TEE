'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isStaffRoute } from '@/lib/utils/is-staff-route';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';
import { useAuth } from './AuthContext';

import { Product } from '@/lib/services/productService';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WishlistContextType {
  wishlistCount: number;
  wishlistItems: Product[];
  addToWishlist: (productId: number) => Promise<{ success: boolean; message?: string }>;
  removeFromWishlist: (productId: number) => Promise<{ success: boolean; message?: string }>;
  isInWishlist: (productId: number) => boolean;
  fetchWishlist: () => Promise<void>;
  fetchWishlistCount: () => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getBaseUrl = (): string => {
  return getApiBaseUrl();
};


const getHeaders = (): Record<string, string> => {
  return getAuthHeaders(true) as Record<string, string>;
};

// Module-level flag: ensures we only spam the console ONCE per session
// even if WishlistContext fetches are retried multiple times.
let hasWarnedWishlistDown = false;

/**
 * Safe fetch wrapper – never throws. Always returns { ok, status, body }.
 * If network fails or JSON parsing fails, returns { ok: false, status: 0, body: null }.
 */
async function safeFetchJson(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; body: any }> {
  try {
    const res = await fetch(url, options);
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // response had no/invalid JSON body – ignore
    }
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    if (!hasWarnedWishlistDown) {
      console.warn('[Wishlist] Backend unreachable — wishlist will run in degraded mode until the server is back.');
      hasWarnedWishlistDown = true;
    }
    return { ok: false, status: 0, body: null };
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const skipCustomerApis = isStaffRoute(pathname);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);

  useEffect(() => {
    // Phan he quan tri khong co wishlist -> bo qua 2 request moi lan load trang.
    if (skipCustomerApis) return;
    fetchWishlistCount();
    fetchWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, skipCustomerApis]);

  // ── fetchWishlistCount ──────────────────────────────────────────────────

  const fetchWishlistCount = async (): Promise<void> => {
    const { ok, body } = await safeFetchJson(
      `${getBaseUrl()}/api/wishlist/count`,
      { headers: getHeaders() }
    );
    if (ok && body?.success) {
      setWishlistCount(body.data?.count ?? 0);
    } else {
      // backend down, auth error, or unexpected response – degrade silently
      setWishlistCount(0);
    }
  };

  // ── fetchWishlist ───────────────────────────────────────────────────────

  const fetchWishlist = async (): Promise<void> => {
    const { ok, body } = await safeFetchJson(
      `${getBaseUrl()}/api/wishlist`,
      { headers: getHeaders() }
    );
    if (ok && body?.success) {
      setWishlistItems(body.data ?? []);
    } else {
      setWishlistItems([]);
    }
  };

  // ── addToWishlist ───────────────────────────────────────────────────────

  const addToWishlist = async (
    productId: number
  ): Promise<{ success: boolean; message?: string }> => {
    const { ok, body } = await safeFetchJson(
      `${getBaseUrl()}/api/wishlist/items/${productId}`,
      { method: 'POST', headers: getHeaders() }
    );
    if (ok) {
      await fetchWishlistCount();
      await fetchWishlist();
      return { success: true };
    }
    const message =
      body?.message ||
      (body === null ? 'Không kết nối được với máy chủ' : 'Không thể thêm yêu thích lúc này');
    return { success: false, message };
  };

  // ── removeFromWishlist ──────────────────────────────────────────────────

  const removeFromWishlist = async (
    productId: number
  ): Promise<{ success: boolean; message?: string }> => {
    const { ok, body } = await safeFetchJson(
      `${getBaseUrl()}/api/wishlist/items/${productId}`,
      { method: 'DELETE', headers: getHeaders() }
    );
    if (ok) {
      // optimistic update
      setWishlistItems(prev => prev.filter(item => item.id !== productId));
      setWishlistCount(prev => Math.max(0, prev - 1));
      return { success: true };
    }
    const message =
      body?.message ||
      (body === null ? 'Không kết nối được với máy chủ' : 'Không thể xóa yêu thích lúc này');
    return { success: false, message };
  };

  // ── isInWishlist ────────────────────────────────────────────────────────

  const isInWishlist = (productId: number): boolean => {
    return wishlistItems.some(item => item.id === productId);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistCount,
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        fetchWishlist,
        fetchWishlistCount,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextType {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
