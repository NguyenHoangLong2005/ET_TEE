'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingBag, User, Heart, Menu, X, ChevronDown, LogOut, Sparkles, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';

const MAIN_MENU = [
  { label: 'Nam', href: '/products?targetGroup=men' },
  { label: 'Nữ', href: '/products?targetGroup=women' },
  { label: 'Bé trai', href: '/products?targetGroup=boys' },
  { label: 'Bé gái', href: '/products?targetGroup=girls' },
  { label: 'Phụ kiện', href: '/products?category=accessories' },
  { label: 'Gia đình', href: '/products?targetGroup=family' },
  { label: 'Sale', href: '/products?status=sale', isSale: true },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user: currentUser, logout } = useAuth();
  const { cart, openDrawer } = useCart();
  const { wishlistCount } = useWishlist();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (pathname?.startsWith('/staff') || pathname?.startsWith('/admin') || pathname?.startsWith('/store-owner')) {
    return null;
  }

  const handleLogout = () => {
    logout();
    window.location.href = '/';
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
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-[11px] md:text-xs py-2 px-4 shadow-sm relative z-50">
        <div className="container mx-auto flex items-center justify-between font-medium tracking-wide">
          <div className="hidden sm:flex items-center gap-1.5 text-red-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Thời Trang Cao Cấp ET.TEE</span>
          </div>
          
          <div className="mx-auto sm:mx-0 flex items-center gap-2">
            <span>🔥 Freeship toàn quốc đơn từ <strong className="text-amber-300">499.000đ</strong></span>
            <span className="opacity-40">|</span>
            <Link href="/products?status=sale" className="font-bold underline hover:text-amber-200 transition-colors flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Săn ngay
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4 text-[11px] text-red-100">
            <Link href="/news" className="hover:underline">Tin tức</Link>
            <Link href="/stores" className="hover:underline">Hệ thống cửa hàng</Link>
            <Link href="/faq" className="hover:underline">Hỗ trợ 24/7</Link>
          </div>
        </div>
      </div>

      {/* Minimalist Sticky Header */}
      <header className={`sticky top-0 z-40 w-full transition-all duration-300 bg-white border-b ${
        isScrolled 
          ? 'border-slate-200 py-2 shadow-sm' 
          : 'border-transparent py-4'
      }`}>
        
        {/* Main header row */}
        <div className="container mx-auto px-4 xl:px-8 flex items-center h-14 md:h-16 gap-4 md:gap-8">
          
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border-2 border-slate-900 group-hover:scale-105 transition-transform duration-300 shadow-sm">
              <Image
                src="/images/logo.jpg"
                alt="ET.TEE"
                fill
                sizes="(max-width: 768px) 40px, 44px"
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl md:text-2xl tracking-tighter text-slate-900 leading-none group-hover:text-red-600 transition-colors">
                ET.TEE
              </span>
              <span className="text-[9px] font-bold tracking-[0.25em] text-slate-400 uppercase leading-tight">
                STUDIO
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {MAIN_MENU.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`px-4 py-2 text-[13px] font-semibold tracking-wide uppercase transition-colors duration-200 relative group ${
                  item.isSale 
                    ? 'text-red-600 hover:text-red-700' 
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 ml-auto">
            {/* Search Input Bar */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center bg-slate-100 rounded-full px-3 py-1.5 border border-slate-300 focus-within:border-slate-900 transition-all shadow-inner">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Tìm kiếm quần áo, phụ kiện..."
                  className="w-36 sm:w-56 md:w-64 text-xs bg-transparent outline-none text-slate-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="p-1 text-slate-400 hover:text-slate-900">
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2.5 text-slate-700 hover:text-red-600 hover:bg-slate-100 rounded-full transition-colors"
                title="Tìm kiếm"
                aria-label="Tìm kiếm sản phẩm"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Wishlist Link */}
            <Link 
              href="/wishlist" 
              className="p-2 text-slate-700 hover:text-black transition-colors relative hidden sm:flex"
              title="Sản phẩm yêu thích"
              aria-label="Danh sách sản phẩm yêu thích"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full leading-none shadow-sm animate-pulse">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Account Icon Dropdown */}
            {mounted && currentUser ? (
              <div className="relative group hidden sm:block">
                <Link 
                  href="/account/profile" 
                  className="flex items-center gap-2 p-1.5 pl-3 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                    {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate">{currentUser.fullName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-white border border-slate-100 shadow-xl rounded-xl py-2 w-52 text-xs font-semibold overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                      <p className="font-bold text-slate-900">{currentUser.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                    </div>
                    <Link href="/account/profile" className="block px-4 py-2.5 text-slate-700 hover:bg-slate-100 hover:text-red-600 transition-colors">
                      Tài khoản của tôi
                    </Link>
                    <Link href="/account/orders" className="block px-4 py-2.5 text-slate-700 hover:bg-slate-100 hover:text-red-600 transition-colors">
                      Lịch sử đơn hàng
                    </Link>
                    <button 
                      onClick={handleLogout} 
                      className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 flex items-center transition-colors border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link 
                href="/auth/login" 
                className="p-2.5 text-slate-700 hover:text-red-600 hover:bg-slate-100 rounded-full transition-colors hidden sm:flex"
                title="Đăng nhập"
                aria-label="Đăng nhập tài khoản"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

            {/* Shopping Cart Button */}
            <button 
              onClick={(e) => { e.preventDefault(); openDrawer(); }}
              className="p-2 text-slate-700 hover:text-black transition-colors relative"
              aria-label="Giỏ hàng"
            >
              <ShoppingBag className="w-5 h-5" />
              {cart?.totalQuantity ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-[9px] font-bold flex items-center justify-center rounded-full leading-none">
                  {cart.totalQuantity}
                </span>
              ) : null}
            </button>

          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="w-[300px] bg-white h-full relative z-10 flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/images/logo.jpg" alt="ET.TEE" width={36} height={36} className="h-9 w-9 rounded-full object-cover border border-slate-900" />
                <span className="font-black text-xl tracking-tight text-slate-900">ET.TEE</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-900" aria-label="Đóng menu">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 py-3 px-4 space-y-1">
              {MAIN_MENU.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider ${
                    item.isSale ? 'text-red-600 bg-red-50' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                  <ChevronDown className="w-4 h-4 -rotate-90 text-slate-400" />
                </Link>
              ))}
              <Link
                href="/news"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-100"
              >
                Tin tức
                <ChevronDown className="w-4 h-4 -rotate-90 text-slate-400" />
              </Link>
            </nav>

            <div className="border-t border-slate-100 p-5 space-y-3 bg-slate-50">
              {mounted && currentUser ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                      {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</span>
                      <span className="text-[10px] text-slate-400 truncate">{currentUser.email}</span>
                    </div>
                  </div>
                  <Link
                    href="/account/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2.5 px-3 text-sm font-semibold text-slate-700 hover:text-slate-900"
                  >
                    Lịch sử đơn hàng
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 py-2.5 px-3 text-sm font-semibold text-red-600"
                  >
                    <LogOut className="w-4 h-4" /> Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-wider shadow-sm"
                >
                  <User className="w-4 h-4" /> Đăng nhập / Đăng ký
                </Link>
              )}
              <Link
                href="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold text-slate-700 hover:text-red-600"
              >
                <Heart className="w-4 h-4" /> Sản phẩm yêu thích ({wishlistCount})
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


