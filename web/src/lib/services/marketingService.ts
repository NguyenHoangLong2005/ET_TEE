'use client';

import { getAuthHeaders, getAuthToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────
export type BannerStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
export type VoucherType = 'PERCENT' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
export type VoucherTarget = 'ALL' | 'NEW_CUSTOMER' | 'RETURNING_CUSTOMER';
export type VoucherStatus = 'ACTIVE' | 'PAUSED' | 'EXPIRED';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
export type CampaignGoal = 'SALES' | 'TRAFFIC' | 'NEW_USER' | 'CLEAR_STOCK';
export type PlacementStatus = 'ACTIVE' | 'PAUSED';
export type EventType = 'IMPRESSION' | 'CLICK' | 'CONVERSION';

export interface Banner {
  id?: number;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  position: string;          // HOME_HERO | HOME_MID | CATEGORY_TOP | PRODUCT_DETAIL | HERO | MIDDLE | POPUP
  displayOrder?: number;
  priority?: number;
  status?: BannerStatus;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Voucher {
  id?: number;
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  usedCount?: number;
  perUserLimit?: number;
  isActive?: boolean;
  status?: VoucherStatus;
  targetGroup?: VoucherTarget;
  freeShipping?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: string;
  updatedBy?: string;
}

export interface Campaign {
  id?: number;
  name: string;
  code?: string;
  description?: string;
  goal?: CampaignGoal;
  status?: CampaignStatus;
  budget?: number;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: string;
  updatedBy?: string;
}

export interface ProductPlacement {
  id?: number;
  placementKey: string;          // HOME_NEW | HOME_BEST_SELLER | HOME_RECOMMENDED | CATEGORY_FEATURED
  productId: number;
  productName?: string;
  position: number;
  status?: PlacementStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: string;
  updatedBy?: string;
}

export interface VoucherDiscountResponse {
  code: string;
  name: string;
  type: VoucherType;
  discountAmount: number;
  finalTotal: number;
  freeShipping: boolean;
}

export interface AnalyticsOverview {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  revenue: number;
  topBanners: Array<{ bannerId: number; count: number; title?: string; imageUrl?: string }>;
  topCampaigns: Array<{ campaignId: number; name?: string; count: number }>;
  topVouchers: Array<{ voucherId: number; code?: string; name?: string; count: number }>;
}

export interface CampaignAnalytics {
  campaignId: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  revenue: number;
}

export interface BannerAnalytics {
  bannerId: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch helpers
// ─────────────────────────────────────────────────────────────────────────
async function admin(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders() as Record<string, string>,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function publicFetch(path: string) {
  const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function publicPost(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────
export const marketingService = {
  // Public
  getPublicBanners: (position?: string) =>
    publicFetch(`/api/marketing/banners${position ? `?position=${encodeURIComponent(position)}` : ''}`),
  getPublicPlacements: (key: string) =>
    publicFetch(`/api/marketing/public/placements?key=${encodeURIComponent(key)}`),
  validateVoucher: (code: string, subtotal: number) =>
    publicPost('/api/marketing/vouchers/validate', { code, subtotal }),
  trackEvent: (data: {
    eventType: EventType;
    campaignId?: number;
    bannerId?: number;
    voucherId?: number;
    productId?: string | number;
    sessionId?: string;
    orderId?: number;
    revenue?: number;
  }) => publicPost('/api/marketing/public/track', data),

  // Banners
  listBanners: () => admin('/api/marketing/admin/banners'),
  createBanner: (data: Partial<Banner>) => admin('/api/marketing/admin/banners', { method: 'POST', body: JSON.stringify(data) }),
  updateBanner: (id: number, data: Partial<Banner>) =>
    admin(`/api/marketing/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateBannerStatus: (id: number, status: BannerStatus) =>
    admin(`/api/marketing/admin/banners/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteBanner: (id: number) => admin(`/api/marketing/admin/banners/${id}`, { method: 'DELETE' }),

  // Vouchers
  listVouchers: () => admin('/api/marketing/admin/vouchers'),
  createVoucher: (data: Partial<Voucher>) => admin('/api/marketing/admin/vouchers', { method: 'POST', body: JSON.stringify(data) }),
  updateVoucher: (id: number, data: Partial<Voucher>) =>
    admin(`/api/marketing/admin/vouchers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateVoucherStatus: (id: number, status: VoucherStatus) =>
    admin(`/api/marketing/admin/vouchers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteVoucher: (id: number) => admin(`/api/marketing/admin/vouchers/${id}`, { method: 'DELETE' }),

  // Campaigns
  listCampaigns: () => admin('/api/marketing/admin/campaigns'),
  getCampaign: (id: number) => admin(`/api/marketing/admin/campaigns/${id}`),
  createCampaign: (data: Partial<Campaign>) => admin('/api/marketing/admin/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id: number, data: Partial<Campaign>) =>
    admin(`/api/marketing/admin/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateCampaignStatus: (id: number, status: CampaignStatus) =>
    admin(`/api/marketing/admin/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteCampaign: (id: number) => admin(`/api/marketing/admin/campaigns/${id}`, { method: 'DELETE' }),

  // Placements
  listPlacements: () => admin('/api/marketing/admin/placements'),
  createPlacement: (data: Partial<ProductPlacement>) =>
    admin('/api/marketing/admin/placements', { method: 'POST', body: JSON.stringify(data) }),
  updatePlacement: (id: number, data: Partial<ProductPlacement>) =>
    admin(`/api/marketing/admin/placements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlacement: (id: number) => admin(`/api/marketing/admin/placements/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalyticsOverview: (since?: string) =>
    admin(`/api/marketing/admin/analytics/overview${since ? `?since=${encodeURIComponent(since)}` : ''}`),
  getCampaignAnalytics: (id: number) => admin(`/api/marketing/admin/analytics/campaigns/${id}`),
  getBannerAnalytics: (id: number) => admin(`/api/marketing/admin/analytics/banners/${id}`),
  getVoucherAnalytics: (id: number) => admin(`/api/marketing/admin/analytics/vouchers/${id}`),
};
