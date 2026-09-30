import { getApiBaseUrl } from '@/lib/api-config';

const getBaseUrl = () => getApiBaseUrl();
const GUEST_TOKEN_STORAGE_KEY = 'guest_cart_token';
const AUTH_TOKEN_STORAGE_KEY = 'auth_token';
const CART_MERGE_WARNING_KEY = 'cart_merge_warnings';


function readGuestToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(GUEST_TOKEN_STORAGE_KEY);
}

function readMergeWarnings(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(CART_MERGE_WARNING_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function rememberMergeWarnings(warnings: string[] | null | undefined) {
  if (typeof window === 'undefined') return;
  if (!warnings || warnings.length === 0) {
    window.sessionStorage.removeItem(CART_MERGE_WARNING_KEY);
    return;
  }
  window.sessionStorage.setItem(CART_MERGE_WARNING_KEY, JSON.stringify(warnings));
}

export const authService = {
  async register(data: any) {
    const payload = { ...data, guestToken: data?.guestToken ?? readGuestToken() };
    const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Lỗi đăng ký');
    }
    return res.json();
  },

  async checkEmail(email: string) {
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/check-email?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        return { available: false }; // fallback
      }
      return res.json();
    } catch (e) {
      return { available: false };
    }
  },

  async verifyEmail(data: any) {
    const payload = { ...data, guestToken: data?.guestToken ?? readGuestToken() };
    const res = await fetch(`${getBaseUrl()}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Lỗi xác thực email');
    }
    const body = await res.json();
    rememberMergeWarnings(body?.cartWarnings);
    return body;
  },

  async resendCode(data: any) {
    const res = await fetch(`${getBaseUrl()}/api/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Lỗi gửi lại mã');
    }
    return res.json();
  },

  async login(data: any) {
    let res;
    try {
      res = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, guestToken: data?.guestToken ?? readGuestToken() }),
      });
    } catch (e: any) {
      if (e instanceof TypeError) {
        throw new Error('Không thể kết nối tới máy chủ. Vui lòng thử lại sau.');
      }
      throw e;
    }

    if (!res.ok) {
      let error;
      try {
        error = await res.json();
      } catch (e) {
        throw new Error('Đã xảy ra lỗi không xác định.');
      }
      throw new Error(error.error || 'Lỗi đăng nhập');
    }
    const body = await res.json();

    if (typeof window !== 'undefined' && body?.token) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, body.token);
      rememberMergeWarnings(body?.cartWarnings);
      try {
        const payload = JSON.parse(atob(body.token.split('.')[1]));
        body.role = payload?.role || payload?.authorities?.find((a: any) => a.startsWith('ROLE_'))?.replace('ROLE_', '');
        body.permissions = payload?.authorities || [];
      } catch (e) {}
    }

    return body;
  },

  getPendingCartMergeWarnings() {
    return readMergeWarnings();
  },

  clearPendingCartMergeWarnings() {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(CART_MERGE_WARNING_KEY);
  },

  async getMe(token: string) {
    let res;
    try {
      res = await fetch(`${getBaseUrl()}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
    } catch (e) {
      throw new Error('Không thể kết nối tới máy chủ.');
    }
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    const raw = await res.json();
    const data = raw?.data ? raw.data : raw;
    
    let role = data?.role || (data?.roles && data?.roles.length > 0 ? data.roles[0] : undefined);
    let permissions: string[] = data?.permissions || data?.authorities || [];

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!role) {
          role = payload?.role || payload?.authorities?.find((a: any) => a.startsWith('ROLE_'))?.replace('ROLE_', '');
        }
        if (permissions.length === 0 && payload?.authorities) {
          permissions = payload.authorities;
        }
      } catch (e) {}
    }
    
    return {
      id: data?.userId || data?.id,
      email: data?.email,
      fullName: data?.fullName,
      role: role || 'USER',
      permissions,
      phone: data?.phone || '',
      isEmailVerified: data?.status === 'ACTIVE' || data?.isEmailVerified,
      status: data?.status
    };
  },

  async forgotPassword(data: any) {
    const res = await fetch(`${getBaseUrl()}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Lỗi yêu cầu khôi phục mật khẩu');
    }
    return res.json();
  },

  async resendPasswordResetCode(data: any) {
    const res = await fetch(`${getBaseUrl()}/api/auth/resend-password-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Lỗi gửi lại mã khôi phục');
    }
    return res.json();
  },

  async resetPassword(data: any) {
    const res = await fetch(`${getBaseUrl()}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Lỗi đổi mật khẩu');
    }
    return res.json();
  }
};
