'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { User, Ruler, Package, Lock, Star, LogOut, Menu, X, ChevronRight, LifeBuoy } from 'lucide-react';
import PageBreadcrumb from '@/components/ui/PageBreadcrumb';

const navItems = [
  { label: 'Hồ sơ của tôi', path: '/account/profile', icon: User },
  { label: 'Số đo & Kích cỡ', path: '/account/measurements', icon: Ruler },
  { label: 'Lịch sử đơn hàng', path: '/account/orders', icon: Package },
  { label: 'Đổi mật khẩu', path: '/account/change-password', icon: Lock },
  { label: 'Đánh giá của tôi', path: '/account/reviews', icon: Star },
  { label: 'Hỗ trợ & Khiếu nại', path: '/account/tickets', icon: LifeBuoy },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login?redirect=' + encodeURIComponent(pathname));
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/4 flex-shrink-0">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 animate-pulse">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-200 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
          <div className="md:w-3/4 flex-grow">
            <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200/80 shadow-sm min-h-[500px] animate-pulse">
              <div className="h-8 w-48 bg-slate-200 rounded mb-6" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const activeItem = navItems.find(item => pathname.startsWith(item.path));
  const activeLabel = activeItem?.label || 'Tài khoản';

  const getInitials = (name: string) =>
    name ? name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() : 'U';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full text-slate-900">
      <PageBreadcrumb items={[{ label: 'Tài khoản', href: '/account/profile' }, { label: activeLabel }]} />

      <div className="flex flex-col md:flex-row gap-8 w-full">

        {/* Mobile top bar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="text-slate-900">Tài khoản</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-primary font-bold">{activeLabel}</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-700"
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`md:w-64 lg:w-72 flex-shrink-0 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80 sticky top-8 shadow-sm">

            {/* User info */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center font-black text-base uppercase shadow-sm">
                {(user as any).avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(user as any).avatarUrl}
                    alt={user.fullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  getInitials(user.fullName)
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate text-sm">{user.fullName}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                <span className="inline-block mt-1 text-[11px] font-bold text-primary bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                  {user.role === 'USER' ? 'Khách hàng' : user.role}
                </span>
              </div>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-wider ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="pt-3 mt-3 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-primary hover:bg-red-50 hover:text-primary w-full text-left transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full">
          <div className="w-full bg-white rounded-3xl p-6 md:p-10 border border-slate-200/80 shadow-sm min-h-[500px]">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
