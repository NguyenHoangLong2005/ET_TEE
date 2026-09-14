'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingBag, User, Heart, Menu, X, ChevronDown, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';

const MAIN_MENU = [
  { label: 'Nam', href: '/products?targetGroup=men' },
  { label: 'Nữ', href: '/products?targetGroup=women' },
  { label: 'Bé trai', href: '/products?targetGroup=kids&gender=boy' },
  { label: 'Bé gái', href: '/products?targetGroup=kids&gender=girl' },
  { label: 'Phụ kiện', href: '/products?category=accessories' },
  { label: 'Family Set', href: '/products?productType=family-set' },
  { label: 'Bộ sưu tập', href: '/products?collection=all' },
  { label: 'Sale', href: '/products?sale=true', isSale: true },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const { user: currentUser, logout } = useAuth();
  const { cart, openDrawer } = useCart();
  const { wishlistCount } = useWishlist();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Promo bar */}
      <div className="bg-[#e50027] text-white text-[11px] md:text-xs text-center py-2 font-medium tracking-widest uppercase">
        Freeship toàn quốc đơn từ 499K &nbsp;·&nbsp;
        <Link href="/products?sale=true" className="underline font-bold">Xem ưu đãi</Link>
      </div>

      <header className={`sticky top-0 z-50 w-full bg-white transition-shadow duration-200 ${isScrolled ? 'shadow-[0_1px_0_rgba(0,0,0,0.08)]' : 'border-b border-gray-100'}`}>
        
        {/* Main header row */}
        <div className="container mx-auto px-4 xl:px-8 flex items-center h-14 md:h-16 gap-4">
          
          {/* Mobile toggle */}
          <button
            className="md:hidden p-1.5 -ml-1 text-gray-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/logo.jpg"
              alt="ET.TEE"
              width={44}
              height={44}
              className="h-10 w-10 rounded-full object-cover"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {MAIN_MENU.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`px-3 py-1 text-[11px] font-bold tracking-widest whitespace-nowrap transition-colors rounded-sm hover:bg-gray-100 ${
                  item.isSale ? 'text-[#e50027]' : 'text-slate-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Search */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center border-b-2 border-slate-900">
                <input
                  autoFocus
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="w-36 md:w-56 text-sm py-1 px-2 outline-none bg-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="p-1 text-gray-500 hover:text-[#e50027]">
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-gray-700 hover:text-[#e50027] transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {currentUser ? (
              <div className="relative group hidden sm:flex">
                <Link href="/account/profile" className="p-2 text-gray-700 hover:text-[#e50027] transition-colors flex items-center">
                  <User className="w-5 h-5" />
                  <span className="ml-1 text-sm font-medium">{currentUser.fullName}</span>
                </Link>
                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="bg-white border border-gray-100 shadow-lg rounded-md py-2 w-48 text-sm">
                    <Link href="/account/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">Tài khoản của tôi</Link>
                    <Link href="/account/orders" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">Lịch sử đơn hàng</Link>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center">
                      <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/auth/login" className="p-2 text-gray-700 hover:text-[#e50027] transition-colors hidden sm:flex">
                <User className="w-5 h-5" />
              </Link>
            )}

            <Link href="/wishlist" className="p-2 text-gray-700 hover:text-[#e50027] transition-colors relative hidden sm:flex">
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-0 w-3.5 h-3.5 bg-[#e50027] text-white text-[8px] font-bold flex items-center justify-center rounded-full leading-none">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button 
              onClick={(e) => { e.preventDefault(); openDrawer(); }}
              className="p-2 text-gray-700 hover:text-[#e50027] transition-colors relative cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#e50027] text-white text-[9px] font-black flex items-center justify-center rounded-full leading-none">
                {cart?.totalQuantity || 0}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="w-[280px] bg-white h-full relative z-10 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <Image src="/images/logo.jpg" alt="ET.TEE" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-2">
              {MAIN_MENU.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-5 py-3.5 text-sm font-bold tracking-wider border-b border-gray-50 ${
                    item.isSale ? 'text-[#e50027]' : 'text-slate-800'
                  }`}
                >
                  {item.label}
                  <ChevronDown className="w-4 h-4 -rotate-90 text-gray-400" />
                </Link>
              ))}
            </nav>

            <div className="border-t border-gray-100 p-4 space-y-2 bg-gray-50">
              {currentUser ? (
                <>
                  <Link
                    href="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 px-2 text-sm font-medium text-slate-700"
                  >
                    <User className="w-5 h-5" /> Chào, {currentUser.fullName}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 py-2 px-2 text-sm font-medium text-slate-700"
                  >
                    <LogOut className="w-5 h-5" /> Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-2 px-2 text-sm font-medium text-slate-700"
                >
                  <User className="w-5 h-5" /> Đăng nhập
                </Link>
              )}
              <Link
                href="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 py-2 px-2 text-sm font-medium text-slate-700"
              >
                <Heart className="w-5 h-5" /> Sản phẩm yêu thích
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
