'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import StaffSidebar from '@/components/layout/StaffSidebar';
import StaffHeader from '@/components/layout/StaffHeader';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login?redirect=/staff/dashboard');
      return;
    }
    // Decode JWT to check role
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      let role = payload?.role || payload?.authorities?.find((a: any) => a.startsWith('ROLE_'))?.replace('ROLE_', '');
      
      // TEST MODE: Override role if test_role is in localStorage
      const testRole = typeof window !== 'undefined' ? localStorage.getItem('test_role') : null;
      if (testRole) {
        role = testRole;
      }

      const STAFF_ROLES = ['STAFF', 'ADMIN', 'SHOP_OWNER', 'MARKETING_STAFF', 'SALES_STAFF', 'WAREHOUSE_STAFF', 'SHIPPING_STAFF'];
      if (!STAFF_ROLES.includes(role)) {
        router.push('/');
        return;
      }
      setUserRole(role);
    } catch (e) {
      // If decode fails, still allow — backend will reject
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 relative">
      <StaffSidebar role={userRole} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <StaffHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
