'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import StaffSidebar from '@/components/layout/StaffSidebar';
import StaffHeader from '@/components/layout/StaffHeader';
import { useAuth } from '@/contexts/AuthContext';
import { getStoredUser, normalizeRoleCode } from '@/lib/auth';

import { STAFF_ROLES, ROLE_DEFAULT_HOME, isRouteAllowedForStaffRole } from '@/config/role-navigation.config';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;
    const storedUser = getStoredUser();
    const rawRole = user?.role || storedUser?.roles?.[0];
    const userRole = normalizeRoleCode(rawRole);
    if (!user && !storedUser) { router.push('/auth/login'); return; }
    const isStaffRole = Boolean(userRole && STAFF_ROLES.includes(userRole));
    if (!isStaffRole) { router.push('/auth/login'); return; }
  }, [user, isLoading, mounted, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  const storedUser = getStoredUser();
  const rawRole = user?.role || storedUser?.roles?.[0];
  const userRole = normalizeRoleCode(rawRole);
  const isStaffRole = Boolean(userRole && STAFF_ROLES.includes(userRole));

  if (!isStaffRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h2>
          <p className="text-slate-500 mb-6 text-sm">Bạn không có quyền truy cập khu vực quản trị.</p>
          <button type="button" onClick={() => router.push('/auth/login')}
            className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm">
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  const isRoutePermitted = isRouteAllowedForStaffRole(pathname || '', userRole);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#F8FAFC', fontFamily: 'var(--font-sans, sans-serif)' }}
      data-admin-area="true"
    >
      <div className="shrink-0">
        <StaffSidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StaffHeader />
        <main className="flex-1 overflow-y-auto" style={{ background: '#F8FAFC' }}>
          {isRoutePermitted ? (
            children
          ) : (
            <div className="min-h-[70vh] flex items-center justify-center p-6">
              <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center" style={{ boxShadow: 'var(--shadow-flat)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#DC2626' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-900 mb-2">Không đủ quyền truy cập</h2>
                <p className="text-slate-500 text-sm mb-5 leading-relaxed">
                  Vai trò <strong className="text-slate-700">{userRole}</strong> không được phép truy cập đường dẫn{' '}
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">{pathname}</code>.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROLE_DEFAULT_HOME[userRole] || '/staff/dashboard')}
                  className="px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Về bảng điều khiển của tôi
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

