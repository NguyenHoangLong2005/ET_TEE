import { getApiBaseUrl } from '@/lib/api-config';
import { getAuthHeaders } from '@/lib/auth';

// Customer side of vouchers and marketing email (backend CustomerMarketingController).
// Vouchers are brand-wide: a shopper is a customer of ET.TEE, not of one branch.

export type VoucherOption = {
  code: string;
  name: string;
  description: string | null;
  type: string;
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  freeShipping: boolean;
  endDate: string | null;
  /** issued to this customer only (welcome, comeback, customer-care compensation) */
  personal: boolean;
  usable: boolean;
  discountAmount: number;
  /** why not usable (e.g. minimum order not reached) */
  reason: string | null;
};

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) throw new Error(body.message || body.error || 'Có lỗi xảy ra');
  return body.data as T;
}

export const CustomerMarketingService = {
  /** Usable vouchers first, biggest discount first, for the given order subtotal. */
  async vouchersForMe(subtotal: number): Promise<VoucherOption[]> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/public/vouchers/for-me?subtotal=${Math.max(0, Math.round(subtotal))}`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      return await json<VoucherOption[]>(res);
    } catch {
      return [];
    }
  },

  /** Resolves to the message to show: usually "check your mailbox to confirm". */
  async subscribeNewsletter(email: string): Promise<string> {
    const res = await fetch(`${getApiBaseUrl()}/api/public/newsletter`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await json<{ message?: string } | null>(res);
    return data?.message || 'Vui lòng kiểm tra email để xác nhận đăng ký.';
  },

  async confirmNewsletter(token: string): Promise<boolean> {
    const res = await fetch(`${getApiBaseUrl()}/api/public/newsletter/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return (await json<{ confirmed: boolean }>(res)).confirmed;
  },

  async unsubscribe(token: string): Promise<boolean> {
    const res = await fetch(`${getApiBaseUrl()}/api/public/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return (await json<{ unsubscribed: boolean }>(res)).unsubscribed;
  },

  async getConsent(): Promise<{ subscribed: boolean; since: string }> {
    return json(await fetch(`${getApiBaseUrl()}/api/account/marketing-consent`, { headers: getAuthHeaders(), cache: 'no-store' }));
  },

  async setConsent(subscribed: boolean): Promise<{ subscribed: boolean; since: string }> {
    return json(await fetch(`${getApiBaseUrl()}/api/account/marketing-consent`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ subscribed }),
    }));
  },
};
