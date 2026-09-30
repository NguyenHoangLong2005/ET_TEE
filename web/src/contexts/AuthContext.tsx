'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService } from '@/lib/services/authService';
import {
  getAuthToken,
  getStoredUser,
  setAuthSession,
  clearAuthSession,
  getUserEffectivePermissions,
  hasAnyPermission as checkAnyPermission,
  setAdminRemember,
  clearAdminRemember,
  AUTH_STORAGE,
} from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string | number;
  email: string;
  fullName: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  phone?: string;
  shopId?: number | null;
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  updateUser: () => {}
});

// Role-based dashboard redirect map (module-level để tránh re-create)
const ROLE_REDIRECT_MAP: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/admin/dashboard',
  SHOP_OWNER: '/store-owner/dashboard',
  MARKETING_STAFF: '/staff/dashboard/marketing',
  SALES_STAFF: '/staff/dashboard/sales',
  CSKH_STAFF: '/staff/tickets',
  WAREHOUSE_STAFF: '/staff/dashboard/warehouse',
  SHIPPING_STAFF: '/staff/dashboard/shipping',
  STAFF: '/staff/dashboard/sales',
};

// Danh sách role quản lý (không phải khách hàng / USER)
const ADMIN_ROLES = Object.keys(ROLE_REDIRECT_MAP);

function getDashboardForRole(role: string): string | null {
  return ROLE_REDIRECT_MAP[role] || null;
}

function isStaffRoute(path: string): boolean {
  return path?.startsWith('/staff') || path?.startsWith('/admin') || path?.startsWith('/store-owner');
}

/** Normalize role string: uppercase, bỏ prefix ROLE_ */
function normalizeRole(raw: string | null | undefined): string {
  if (!raw) return 'USER';
  return raw.toUpperCase().replace(/^ROLE_/, '');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Ref dùng để tránh redirect lặp cho trường hợp login-page redirect
  const hasCheckedLoginRedirect = useRef(false);

  const [user, setUser] = useState<User | null>(() => {
    const stored = getStoredUser();
    if (!stored) return null;
    const activeRole = normalizeRole(stored.roles?.[0]);
    return {
      id: stored.id || '',
      email: stored.email || '',
      fullName: stored.fullName || '',
      role: activeRole,
      roles: stored.roles || [activeRole],
      permissions: stored.permissions || [],
      phone: stored.phone || '',
      shopId: stored.shopId ?? null,
      isEmailVerified: stored.status === 'ACTIVE',
    };
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        clearAuthSession();
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const userData = await authService.getMe(token);
        if (!isMounted) return;
        const activeRole = normalizeRole(userData.role);
        const extraRoles = (userData as any).roles || [];
        const normalizedRoles = Array.from(new Set([activeRole, ...extraRoles]));
        const rawPermissions = (userData as any).permissions || [];
        const formattedUser: User = {
          ...userData,
          role: activeRole,
          roles: normalizedRoles,
          permissions: rawPermissions,
          shopId: (userData as any).shopId ?? null,
        };
        setUser(formattedUser);
        setAuthSession({
          ...formattedUser,
          id: String(formattedUser.id),
          roles: normalizedRoles,
          permissions: rawPermissions,
          shopId: (userData as any).shopId ?? null,
          accessToken: token,
        });
      } catch (error: any) {
        if (!isMounted) return;
        if (error?.message === 'Unauthorized') {
          clearAuthSession();
          setUser(null);
          setIsLoading(false);
          return;
        }
        // Lỗi mạng / server → dùng stored user
        const stored = getStoredUser();
        if (stored) {
          const activeRole = normalizeRole(stored.roles?.[0]);
          setUser({
            id: stored.id || '',
            email: stored.email || '',
            fullName: stored.fullName || '',
            role: activeRole,
            roles: stored.roles || [activeRole],
            permissions: stored.permissions || [],
            phone: stored.phone || '',
            isEmailVerified: stored.status === 'ACTIVE',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Redirect logic cho tài khoản quản trị ─────────────────────────────────
  useEffect(() => {
    if (isLoading || !user) return;

    const activeRole = normalizeRole(user.role);
    const dashboard = getDashboardForRole(activeRole);
    if (!dashboard) return;

    const isOnStaff = isStaffRoute(pathname);

    // Case 1: Đang ở /auth/login → redirect ngay
    if (pathname === '/auth/login' && !hasCheckedLoginRedirect.current) {
      hasCheckedLoginRedirect.current = true;
      router.replace(dashboard);
      return;
    }

    // Case 2: Mở lại browser với "Ghi nhớ đăng nhập"
    const isRememberedToken = !!window.localStorage.getItem(AUTH_STORAGE.accessToken);
    const hasAutoRedirected = !!window.sessionStorage.getItem(AUTH_STORAGE.autoRedirected);

    if (isRememberedToken && !isOnStaff && !hasAutoRedirected && pathname !== '/auth/login') {
      window.sessionStorage.setItem(AUTH_STORAGE.autoRedirected, '1');
      router.replace(dashboard);
    }
  }, [pathname, user, isLoading, router]);

  const login = async (token: string, remember: boolean = true) => {
    // Đặt lại cờ login-redirect để nếu sau đăng nhập navigate về /auth/login vẫn redirect được
    hasCheckedLoginRedirect.current = true;

    // Reset sessionStorage auto-redirect flag để login mới có thể trigger redirect
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(AUTH_STORAGE.autoRedirected);
    }

    if (remember) {
      localStorage.setItem(AUTH_STORAGE.accessToken, token);
      sessionStorage.removeItem(AUTH_STORAGE.accessToken);
      document.cookie = `auth_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      sessionStorage.setItem(AUTH_STORAGE.accessToken, token);
      localStorage.removeItem(AUTH_STORAGE.accessToken);
      document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }

    try {
      const userData = await authService.getMe(token);
      const activeRole = normalizeRole(userData.role);
      const extraRoles = (userData as any).roles || [];
      const normalizedRoles = Array.from(new Set([activeRole, ...extraRoles]));
      const rawPermissions = (userData as any).permissions || [];
      const formattedUser: User = {
        ...userData,
        role: activeRole,
        roles: normalizedRoles,
        permissions: rawPermissions,
        shopId: (userData as any).shopId ?? null,
      };

      // Merge guest cart BEFORE setting user state so CartContext fetches the merged cart
      try {
        const { CartService } = await import('@/lib/services/cartService');
        await CartService.mergeCart();
      } catch (err) {
        console.error('Merge cart failed', err);
      }

      setAuthSession({
        ...formattedUser,
        id: String(formattedUser.id),
        roles: normalizedRoles,
        permissions: rawPermissions,
        shopId: (userData as any).shopId ?? null,
        accessToken: token,
      });
      setUser(formattedUser);

      // Lưu flag admin remember (vẫn giữ để backward compat)
      if (remember && ADMIN_ROLES.includes(activeRole)) {
        setAdminRemember(activeRole);
      } else {
        clearAdminRemember();
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin user trong lúc đăng nhập:', error);
      throw error;
    }
  };

  const logout = () => {
    hasCheckedLoginRedirect.current = false;
    clearAuthSession(); // đã bao gồm xóa adminRemember và autoRedirected
    setUser(null);
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = 'test_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  };

  const updateUser = (updatedData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedData };
      setAuthSession({
        ...updated,
        id: String(updated.id),
        roles: updated.roles || [updated.role],
        accessToken: getAuthToken() || '',
      });
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const usePermissions = () => {
  const { user } = useAuth();

  const userRoles = user?.roles && user.roles.length > 0 ? user.roles : (user?.role ? [user.role] : []);
  const permissions = getUserEffectivePermissions(user?.permissions, userRoles);

  const hasPermission = (permission: string) => {
    return checkAnyPermission(user?.permissions, [permission], userRoles);
  };

  const hasAnyPermission = (requiredPermissions: string[]) => {
    return checkAnyPermission(user?.permissions, requiredPermissions, userRoles);
  };

  return { permissions, hasPermission, hasAnyPermission };
};
