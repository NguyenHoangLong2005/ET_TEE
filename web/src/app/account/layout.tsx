'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { User, Ruler, Package, Lock, Star, LogOut, Menu, X, ChevronRight } from 'lucide-react';

const navItems = [
  { label: 'Hồ sơ của tôi', path: '/account/profile', icon: User },
  { label: 'Số đo & Kích cỡ', path: '/account/measurements', icon: Ruler },
  { label: 'Lịch sử đơn hàng', path: '/account/orders', icon: Package },
  { label: 'Đổi mật khẩu', path: '/account/change-password', icon: Lock },
  { label: 'Đánh giá của tôi', path: '/account/reviews', icon: Star },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Only redirect after loading is complete
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login?redirect=' + encodeURIComponent(pathname));
      } else if (user.role && user.role !== 'USER') {
        const roleRedirectMap: Record<string, string> = {
          ADMIN: '/admin/dashboard',
          SHOP_OWNER: '/staff/dashboard',
          MARKETING_STAFF: '/staff/dashboard/marketing',
          SALES_STAFF: '/staff/dashboard/sales',
          WAREHOUSE_STAFF: '/staff/dashboard/warehouse',
          SHIPPING_STAFF: '/staff/dashboard/shipping',
          STAFF: '/staff/dashboard',
        };
        router.push(roleRedirectMap[user.role] || '/staff/dashboard');
      }
    }
  }, [user, isLoading, router, pathname]);

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar skeleton */}
          <div className="md:w-1/4 flex-shrink-0">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 animate-pulse">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
          {/* Content skeleton */}
          <div className="md:w-3/4 flex-grow">
            <div className="bg-white rounded-2xl p-6 md:p-10 border border-gray-200 shadow-sm min-h-[500px] animate-pulse">
              <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg" />
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
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 w-full">
      <div className="flex flex-col md:flex-row gap-8 w-full">

        {/* Mobile top bar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-gray-900">Tài khoản</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-semibold text-black">{activeLabel}</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`md:w-64 lg:w-72 flex-shrink-0 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 sticky top-8">

            {/* User info */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-black text-white flex items-center justify-center font-bold text-lg uppercase">
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
                <p className="font-bold text-gray-900 truncate">{user.fullName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-xs font-medium text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                  Khách hàng
                </span>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-black text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}

              <div className="pt-3 mt-3 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-red-500 hover:bg-red-50 hover:text-red-600 w-full text-left transition-all"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">Đăng xuất</span>
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 w-full">
          <div className="w-full bg-white rounded-2xl p-6 md:p-10 border border-gray-200 shadow-sm min-h-[500px]">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
