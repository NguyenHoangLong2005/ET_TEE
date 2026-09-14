'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, LogOut, User2 } from 'lucide-react';
import MarketingSidebar from './MarketingSidebar';

interface MarketingShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function MarketingShell({ children, title, subtitle, action }: MarketingShellProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user_info') : null;
      if (raw) {
        const u = JSON.parse(raw);
        setUserEmail(u?.email || null);
      } else {
        const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (t) setUserEmail('Đã đăng nhập');
      }
    } catch {}
  }, []);

  const onLogout = () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
    } catch {}
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <MarketingSidebar />
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
            <div className="flex items-center justify-between px-6 lg:px-8 h-14">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="text-[12px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Về trang khách hàng
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-[12px] font-semibold text-slate-700 uppercase tracking-wider">
                  Marketing Staff
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200">
                  <User2 size={14} className="text-slate-500" />
                  <span className="text-[12px] text-slate-700 font-medium">
                    {userEmail || 'Tài khoản'}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="text-[12px] px-3 py-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 inline-flex items-center gap-1"
                >
                  <LogOut size={14} /> Đăng xuất
                </button>
              </div>
            </div>
          </header>

          {/* Page header */}
          <div className="px-6 lg:px-8 pt-7 pb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-[13px] text-slate-500 max-w-xl">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>

          {/* Content */}
          <main className="px-6 lg:px-8 pb-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
