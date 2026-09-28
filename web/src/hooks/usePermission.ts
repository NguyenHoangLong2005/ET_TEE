'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStoredUser, normalizeRoleCode } from '@/lib/auth';

export type PermissionState = 'loading' | 'allowed' | 'denied';

/**
 * Hook kiểm tra quyền truy cập dựa trên permission granular của backend.
 * Tương thích cả AuthContext, ettee_user (AUTH_STORAGE) và fallback user_info cũ.
 */
export function usePermission(required: string | string[]): PermissionState {
  const { user, isLoading } = useAuth();
  const [state, setState] = useState<PermissionState>('loading');

  useEffect(() => {
    if (isLoading) {
      setState('loading');
      return;
    }

    try {
      // 1. Lấy thông tin user từ AuthContext hoặc Storage
      const stored = getStoredUser();
      const rawLegacy = typeof window !== 'undefined' ? localStorage.getItem('user_info') : null;
      const legacyUser = rawLegacy ? JSON.parse(rawLegacy) : null;

      const role = normalizeRoleCode(user?.role || stored?.roles?.[0] || legacyUser?.role);
      
      // ADMIN và SUPER_ADMIN luôn có toàn quyền bypass
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        setState('allowed');
        return;
      }

      // 2. Thu thập danh sách permissions
      const perms: string[] = [
        ...(user?.permissions ?? []),
        ...(stored?.permissions ?? []),
        ...(legacyUser?.permissions ?? []),
      ].map((p) => p.toUpperCase());

      const need = (Array.isArray(required) ? required : [required]).map((p) => p.toUpperCase());

      if (need.length === 0) {
        setState('allowed');
        return;
      }

      // Kiểm tra xem user có đủ tất cả permissions được yêu cầu không
      const hasAll = need.every((p) => perms.includes(p));
      setState(hasAll ? 'allowed' : 'denied');
    } catch {
      setState('denied');
    }
  }, [required, user, isLoading]);

  return state;
}

/**
 * Helper kiểm tra nhanh xem user hiện tại có bất kỳ quyền nào trong danh sách không.
 */
export function useHasAnyPermission(required: string[]): boolean {
  const { user } = useAuth();
  const stored = getStoredUser();
  const role = normalizeRoleCode(user?.role || stored?.roles?.[0]);

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;

  const perms = [
    ...(user?.permissions ?? []),
    ...(stored?.permissions ?? []),
  ].map((p) => p.toUpperCase());

  const need = required.map((p) => p.toUpperCase());
  return need.some((p) => perms.includes(p));
}

export default usePermission;
