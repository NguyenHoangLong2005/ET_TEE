'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff } from 'lucide-react';

interface RoleGateProps {
  /**
   * Roles allowed. Defaults to ['MARKETING_STAFF', 'STAFF', 'ADMIN'].
   * Empty / undefined means any authenticated user.
   */
  allow?: string[];
  children: React.ReactNode;
}

const STAFF_ROLES = ['MARKETING_STAFF', 'STAFF', 'ADMIN'];

export default function RoleGate({ allow = STAFF_ROLES, children }: RoleGateProps) {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_info');
      if (!raw) {
        setState('denied');
        return;
      }
      const u = JSON.parse(raw);
      const role = u?.role;
      if (!role) {
        setState('denied');
        return;
      }
      if (allow.length === 0 || allow.includes(role)) {
        setState('allowed');
      } else {
        setState('denied');
      }
    } catch {
      setState('denied');
    }
  }, [allow]);

  if (state === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
        <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <ShieldOff size={22} />
          </div>
          <h1 className="mt-4 text-[18px] font-semibold text-slate-900">Bạn không có quyền truy cập</h1>
          <p className="mt-1.5 text-[13px] text-slate-600">
            Khu vực này chỉ dành cho nhân viên marketing / quản trị viên. Vui lòng đăng nhập bằng tài khoản phù hợp.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={() => router.push('/auth/login')}
              className="h-9 px-3.5 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => router.push('/')}
              className="h-9 px-3.5 rounded-md border border-slate-300 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
