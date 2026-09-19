"use client";

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GlobalGuard() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user || !pathname) return;
    
    const isStaffUser = user.role !== 'USER';
    const isStaffRoute = pathname.startsWith('/staff') || pathname.startsWith('/admin');
    const isAuthRoute = pathname.startsWith('/auth');

    // If a staff member tries to access a customer route, forcefully redirect them to their portal
    if (isStaffUser && !isStaffRoute && !isAuthRoute) {
      const roleRedirectMap: Record<string, string> = {
        ADMIN: '/admin/dashboard',
        SHOP_OWNER: '/staff/dashboard',
        MARKETING_STAFF: '/staff/dashboard/marketing',
        SALES_STAFF: '/staff/dashboard/sales',
        WAREHOUSE_STAFF: '/staff/dashboard/warehouse',
        SHIPPING_STAFF: '/staff/dashboard/shipping',
        STAFF: '/staff/dashboard',
      };
      router.replace(roleRedirectMap[user.role] || '/staff/dashboard');
    }
  }, [user, isLoading, pathname, router]);

  return null;
}
