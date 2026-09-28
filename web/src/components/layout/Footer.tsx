"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/staff') || pathname?.startsWith('/admin') || pathname?.startsWith('/store-owner')) {
    return null;
  }

  return (
    <footer className="bg-[#f4f4f4] text-[#18181B] text-[13px] border-t border-slate-200">
      <div className="container mx-auto px-4 xl:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12">
          
          {/* Brand & Contact */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <h2 className="text-2xl font-black tracking-tighter text-primary uppercase">ET.TEE</h2>
            </Link>
            <p className="text-slate-600 mb-6 max-w-sm leading-relaxed">
              Thương hiệu thời trang gia đình hàng đầu Việt Nam. Chất lượng vượt trội, thiết kế đa dụng cho cuộc sống hằng ngày.
            </p>
            
            <div className="space-y-3 text-slate-600">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Tầng 3, Tòa nhà Lotte Center, 54 Liễu Giai, Ba Đình, Hà Nội</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 shrink-0" />
                <span>1900 1234 (Từ 8:00 - 22:00)</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 shrink-0" />
                <span>support@ettee.vn</span>
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="font-bold text-[14px] uppercase tracking-wider mb-5">VỀ ET.TEE</h3>
            <ul className="space-y-4 text-slate-600">
              <li><Link href="/about" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Giới thiệu</Link></li>
              <li><Link href="/stores" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Danh sách cửa hàng</Link></li>
              <li><Link href="/careers" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Tuyển dụng</Link></li>
              <li><Link href="/news" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Tin tức</Link></li>
              <li><Link href="/contact" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Liên hệ</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-[14px] uppercase tracking-wider mb-5">TRỢ GIÚP</h3>
            <ul className="space-y-4 text-slate-600">
              <li><Link href="/faq" className="hover:text-primary hover:underline underline-offset-4 transition-colors">FAQ</Link></li>
              <li><Link href="/policy/shipping" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Chính sách vận chuyển</Link></li>
              <li><Link href="/policy/return" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Chính sách đổi trả</Link></li>
              <li><Link href="/size-guide" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Hướng dẫn chọn size</Link></li>
              <li><Link href="/terms" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Quy định chung</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-bold text-[14px] uppercase tracking-wider mb-5">TÀI KHOẢN KẾT NỐI</h3>
            <ul className="space-y-4 text-slate-600 mb-8">
              <li><Link href="/account/profile" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Tài khoản của tôi</Link></li>
              <li><Link href="/account/orders" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Lịch sử đơn hàng</Link></li>
              <li><Link href="/wishlist" className="hover:text-primary hover:underline underline-offset-4 transition-colors">Danh sách yêu thích</Link></li>
            </ul>
            
            <div className="flex items-center gap-4">
              <a href="https://facebook.com" className="w-10 h-10 bg-white border border-slate-300 flex items-center justify-center hover:border-primary hover:text-primary transition-colors text-sm font-bold" aria-label="Facebook">
                FB
              </a>
              <a href="https://instagram.com" className="w-10 h-10 bg-white border border-slate-300 flex items-center justify-center hover:border-primary hover:text-primary transition-colors text-sm font-bold" aria-label="Instagram">
                IG
              </a>
              <a href="https://youtube.com" className="w-10 h-10 bg-white border border-slate-300 flex items-center justify-center hover:border-primary hover:text-primary transition-colors text-sm font-bold" aria-label="Youtube">
                YT
              </a>
            </div>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>Bản quyền © 2026 ET.TEE. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#18181B] hover:underline transition-colors">Chính sách bảo mật</Link>
            <span className="w-px h-3 bg-slate-300"></span>
            <Link href="/terms" className="hover:text-[#18181B] hover:underline transition-colors">Điều khoản sử dụng</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

