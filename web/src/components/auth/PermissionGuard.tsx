'use client';

import React from 'react';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { getActiveRole } from '@/lib/auth';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  allowedRoles?: string[];
  requireAll?: boolean; // Nếu true, phải có TẤT CẢ quyền. Mặc định là false (chỉ cần 1 trong các quyền).
  fallback?: React.ReactNode;
}

export default function PermissionGuard({ 
  children, 
  requiredPermissions = [], 
  allowedRoles = [],
  requireAll = false,
  fallback
}: PermissionGuardProps) {
  const { user, isLoading } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="animate-pulse text-slate-400 text-sm font-medium">
          Đang kiểm tra quyền truy cập...
        </div>
      </div>
    );
  }

  const activeRole = getActiveRole(user?.role ? [user.role] : (user as any)?.roles);

  // Superuser bypass for ADMIN / SUPER_ADMIN
  if (activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  const normalizedAllowedRoles = (allowedRoles || []).map(r =>
    r.toUpperCase().replace(/^ROLE_/, '').trim()
  );

  const hasRequiredRole =
    normalizedAllowedRoles.length === 0 ||
    (Boolean(activeRole) && normalizedAllowedRoles.includes(activeRole));

  const hasRequiredPermission =
    !requiredPermissions || requiredPermissions.length === 0
      ? true
      : requireAll
        ? requiredPermissions.every(p => hasPermission(p))
        : hasAnyPermission(requiredPermissions);

  const isAuthorized = Boolean(user) && hasRequiredRole && hasRequiredPermission;

  if (!isAuthorized) {
    if (fallback !== undefined) return <>{fallback}</>;
    
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h2>
        <p className="text-slate-500 text-center max-w-md">
          Bạn không có đủ quyền hạn để xem trang này. Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là lỗi.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}


