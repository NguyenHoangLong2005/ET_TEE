'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { User, Ruler, Package, Lock, Star, LogOut, Menu } from 'lucide-react';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=' + pathname);
    }
  }, [user, router, pathname]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const navItems = [
    { label: 'Hồ sơ của tôi', path: '/account/profile', icon: User },
    { label: 'Số đo & Kích cỡ', path: '/account/measurements', icon: Ruler },
    { label: 'Lịch sử đơn hàng', path: '/account/orders', icon: Package },
    { label: 'Đổi mật khẩu', path: '/account/change-password', icon: Lock },
    { label: 'Đánh giá của tôi', path: '/account/reviews', icon: Star },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Mobile menu toggle */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg w-full font-bold"
          >
            <Menu className="w-5 h-5" />
            Menu Tài Khoản
          </button>
        </div>

        {/* Sidebar */}
        <div className={`md:w-1/4 flex-shrink-0 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl uppercase">
                {user.fullName ? user.fullName.charAt(0) : 'U'}
              </div>
              <div>
                <p className="font-bold text-lg">{user.fullName}</p>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${
                      isActive ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 rounded-lg font-medium text-red-600 hover:bg-red-50 w-full text-left transition-colors mt-4"
              >
                <LogOut className="w-5 h-5" />
                Đăng xuất
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:w-3/4 flex-grow">
          <div className="bg-white rounded-2xl p-6 md:p-10 border border-gray-200 shadow-sm min-h-[500px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
