'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

export default function RootLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Ẩn Header/Footer/CartDrawer cho các trang auth và toàn bộ phân hệ staff/admin/store-owner
  const isAuthPage = pathname?.startsWith('/auth') || pathname === '/login';
  const isStaffPage = pathname?.startsWith('/admin') || pathname?.startsWith('/staff') || pathname?.startsWith('/store-owner');
  const hideCustomerShell = isAuthPage || isStaffPage;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {!hideCustomerShell && <Header />}
      <main className={`flex-1 flex flex-col ${isAuthPage ? 'min-h-screen' : ''}`}>
        {children}
      </main>
      {!hideCustomerShell && <Footer />}
      {!hideCustomerShell && <CartDrawer />}
    </div>
  );
}
