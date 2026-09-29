'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';

type Slide = {
  id: string;
  bg: string;
  href: string;
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
};

const FALLBACK_SLIDES: Slide[] = [
  { 
    id: 'b1', 
    bg: '/images/banners/home/banner-1.webp', 
    href: '/products',
    badge: 'NEW COLLECTION 2026',
    title: 'BỘ SƯU TẬP THU ĐÔNG',
    subtitle: 'Đẳng cấp & phong cách xu hướng thời trang hiện đại',
    cta: 'Khám Phá Ngay',
  },
  { 
    id: 'b2', 
    bg: '/images/banners/home/banner-2.webp', 
    href: '/products?sort=best-seller',
    badge: 'HOT TRENDING',
    title: 'BEST SELLERS 2026',
    subtitle: 'Những trang phục được săn đón và lựa chọn nhiều nhất',
    cta: 'Sắm Ngay',
  },
  { 
    id: 'b3', 
    bg: '/images/banners/home/banner-3.webp', 
    href: '/products?targetGroup=family',
    badge: 'FAMILY SET',
    title: 'ĐỒNG PHỤC GIA ĐÌNH',
    subtitle: 'Gắn kết tình thân với thiết kế mặc đồng điệu cả nhà',
    cta: 'Xem Bộ Sưu Tập',
  },
  { 
    id: 'b4', 
    bg: '/images/banners/home/banner-4.webp', 
    href: '/products?targetGroup=women',
    badge: 'WOMEN COLLECTION',
    title: 'THỜI TRANG NỮ CAO CẤP',
    subtitle: 'Thanh lịch - Quyến rũ - Tinh tế trong từng đường nét',
    cta: 'Mua Sản Phẩm Nữ',
  },
  { 
    id: 'b5', 
    bg: '/images/banners/home/banner-5.webp', 
    href: '/products?targetGroup=men',
    badge: 'MEN COLLECTION',
    title: 'THỜI TRANG NAM HIỆN ĐẠI',
    subtitle: 'Phong cách nam tính, năng động và lịch lãm',
    cta: 'Mua Sản Phẩm Nam',
  },
  { 
    id: 'b6', 
    bg: '/images/banners/home/banner-6.webp', 
    href: '/products?targetGroup=kids',
    badge: 'KIDS FASHION',
    title: 'BỘ SƯU TẬP TRẺ EM',
    subtitle: 'Chất liệu hữu cơ siêu mềm mại, an toàn tuyệt đối cho bé',
    cta: 'Khám Phá Đồ Bé',
  },
  { 
    id: 'b7', 
    bg: '/images/banners/home/banner-7.webp', 
    href: '/products?sale=true',
    badge: 'MEGA SALE UNTIL 50%',
    title: 'ƯU ĐÃI ĐẶC BIỆT',
    subtitle: 'Săn deal giảm giá trực tiếp - Số lượng sản phẩm có hạn',
    cta: 'Săn Sale Ngay',
  },
  { 
    id: 'b8', 
    bg: '/images/banners/home/banner-8.webp', 
    href: '/products',
    badge: 'ET.TEE STUDIO',
    title: 'ĐỊNH HÌNH PHONG CÁCH',
    subtitle: 'Phối đồ cá nhân hóa nâng tầm gu thời trang của riêng bạn',
    cta: 'Khám Phá Ngay',
  },
];

const AUTO_PLAY_INTERVAL = 6000;

export default function HeroBanner() {
  const [slides, setSlides] = useState<Slide[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;

  // Admin/marketing manages real banners at /admin/marketing (position
  // HOME_HERO), but this carousel always rendered 8 hardcoded slides and
  // never fetched them, so nothing configured there ever reached the
  // homepage. Fetch real banners and use them when any are active; keep the
  // static slides as a fallback so the hero section is never empty.
  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiBaseUrl()}/api/marketing/banners/HOME_HERO`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (cancelled) return;
        const banners = Array.isArray(res?.data) ? res.data : [];
        const active = banners.filter((b: any) => (b.status || 'ACTIVE') === 'ACTIVE' && b.imageUrl);
        if (active.length === 0) return;
        setSlides(active.map((b: any, idx: number) => ({
          id: `banner-${b.id ?? idx}`,
          bg: b.imageUrl,
          href: b.linkUrl || '/products',
          badge: 'NEW',
          title: b.title || '',
          subtitle: b.subtitle || '',
          cta: 'Khám Phá Ngay',
        })));
        setCurrent(0);
      })
      .catch(() => { /* keep fallback slides */ });
    return () => { cancelled = true; };
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(goNext, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, goNext]);

  return (
    <section
      className="relative w-full overflow-hidden bg-slate-900 group aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, index) => {
        const isActive = index === current;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <Link href={slide.href} className="block w-full h-full relative cursor-pointer group">
              {/* Background Image */}
              <Image
                src={slide.bg}
                alt={slide.title}
                fill
                priority={index === 0}
                sizes="100vw"
                className={`w-full h-full object-cover object-center transition-transform duration-[7000ms] ease-out ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
              />
            </Link>
          </div>
        );
      })}

      {/* Navigation Buttons */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrev(); }}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-black hover:text-white text-black flex items-center justify-center transition-colors duration-300 opacity-0 group-hover:opacity-100"
        aria-label="Banner trước"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNext(); }}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 bg-white hover:bg-black hover:text-white text-black flex items-center justify-center transition-colors duration-300 opacity-0 group-hover:opacity-100"
        aria-label="Banner tiếp theo"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Indicators & Counter */}
      <div className="absolute bottom-6 right-8 z-30 hidden md:flex items-center gap-4 text-white text-sm font-bold uppercase tracking-wider">
        <span>{String(current + 1).padStart(2, '0')}</span>
        <div className="w-16 h-[2px] bg-white/30">
          <div 
            className="h-full bg-white transition-all duration-300" 
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
        <span className="text-white/60">{String(total).padStart(2, '0')}</span>
      </div>

      {/* Indicator dots for mobile/tablet */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 md:hidden">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(index); }}
            aria-label={`Slide ${index + 1}`}
            className={`transition-all duration-300 h-1 ${
              index === current ? 'w-8 bg-white' : 'w-4 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </section>
  );
}

