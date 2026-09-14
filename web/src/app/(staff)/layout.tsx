'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/auth/login?redirect=/staff/dashboard');
      return;
    }
    // Decode JWT to check role
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role = payload?.role || payload?.authorities?.find((a: any) => a.startsWith('ROLE_'))?.replace('ROLE_', '');
      if (role !== 'STAFF' && role !== 'ADMIN') {
        router.push('/');
        return;
      }
    } catch (e) {
      // If decode fails, still allow — backend will reject
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return <>{children}</>;
}
