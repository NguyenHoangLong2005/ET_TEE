const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';
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
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
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

  async verifyEmail(data: any) {
    const payload = { ...data, guestToken: data?.guestToken ?? readGuestToken() };
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
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
    const res = await fetch(`${API_BASE_URL}/api/auth/resend-code`, {
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
      console.log('Attempting login to URL:', `${API_BASE_URL}/api/auth/login`);
      res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, guestToken: data?.guestToken ?? readGuestToken() }),
      });
    } catch (e: any) {
      if (e instanceof TypeError) {
        throw new Error('Không thể kết nối tới máy chủ. Kiểm tra backend đã chạy ở 127.0.0.1:8081 chưa.');
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
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    const data = await res.json();
    return {
      id: data.userId || data.id,
      email: data.email,
      fullName: data.fullName,
      role: data.role || 'USER',
      phone: data.phone || '',
      isEmailVerified: data.status === 'ACTIVE' || data.isEmailVerified,
      status: data.status
    };
  },

  async forgotPassword(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
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
    const res = await fetch(`${API_BASE_URL}/api/auth/resend-password-reset-code`, {
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
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
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
