'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import { marketingService } from '@/lib/services/marketingService';
import { isPlaceholderImage, isRemoteImage, sanitizeImageUrl } from '@/lib/utils/imageUtils';

type Slide = {
  id: string;
  bg: string;
  href: string;
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  /** Id banner thật trong DB; slide dự phòng tĩnh không có nên không được tính số liệu. */
  bannerId?: number;
};

// Lượt hiển thị/click cho trang Hiệu quả marketing. Banner không bao giờ gửi sự kiện nên
// banner đang chạy luôn 0 lượt; lỗi tracking không được làm hỏng trang chủ.
function trackBanner(eventType: 'IMPRESSION' | 'CLICK', bannerId?: number) {
  if (bannerId == null) return;
  marketingService.trackEvent({ eventType, bannerId }).catch(() => {});
}

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
    href: '/products?status=sale',
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
const FALLBACK_BG = FALLBACK_SLIDES[0].bg;

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
    const controller = new AbortController();
    fetch(`${getApiBaseUrl()}/api/marketing/banners/HOME_HERO`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const banners: any[] = Array.isArray(res?.data) ? res.data : [];
        const next: Slide[] = banners
          .filter((b) => (b?.status || 'ACTIVE') === 'ACTIVE' && b?.isActive !== false)
          .map((b, idx) => ({ b, idx, bg: sanitizeImageUrl(b.imageUrl) }))
          .filter((x): x is { b: any; idx: number; bg: string } => x.bg !== null && !isPlaceholderImage(x.bg))
          .sort(
            (a, c) =>
              (a.b.displayOrder ?? 0) - (c.b.displayOrder ?? 0) ||
              (c.b.priority ?? 0) - (a.b.priority ?? 0),
          )
          .map(({ b, idx, bg }) => ({
            id: `banner-${b.id ?? idx}`,
            bannerId: typeof b.id === 'number' ? b.id : undefined,
            bg,
            href: typeof b.linkUrl === 'string' && b.linkUrl.trim() ? b.linkUrl.trim() : '/products',
            badge: 'NEW',
            title: b.title || '',
            subtitle: b.subtitle || '',
            cta: 'Khám Phá Ngay',
          }));
        if (next.length === 0) return;
        setSlides(next);
        setCurrent(0);
      })
      .catch(() => { /* keep fallback slides */ });
    return () => controller.abort();
  }, []);

  // A banner image that fails to load (dead link, 404, blocked host) is
  // swapped for a local image instead of leaving a blank slide.
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const markFailed = useCallback((id: string) => {
    setFailed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Mỗi banner tính 1 lượt hiển thị cho mỗi lần tải trang, khi nó thực sự được hiện.
  const seen = useRef<Set<number>>(new Set());
  const activeBannerId = slides[current]?.bannerId;
  useEffect(() => {
    if (activeBannerId == null || seen.current.has(activeBannerId)) return;
    seen.current.add(activeBannerId);
    trackBanner('IMPRESSION', activeBannerId);
  }, [activeBannerId]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(goNext, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, goNext]);

  return (
    <section
      // The banners are 2880x900 (16:5) with their headline baked into the image; any other
      // aspect ratio cropped the text off the sides, worst on phones (4:3).
      className="relative w-full overflow-hidden bg-slate-100 group aspect-[16/5]"
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
            <Link href={slide.href} onClick={() => trackBanner('CLICK', slide.bannerId)} className="block w-full h-full relative cursor-pointer group">
              {/* Background Image */}
              <Image
                src={failed.has(slide.id) ? FALLBACK_BG : slide.bg}
                alt={slide.title}
                fill
                priority={index === 0}
                sizes="100vw"
                // Remote hosts are not allowlisted in next.config; skip the optimizer.
                unoptimized={isRemoteImage(slide.bg) && !failed.has(slide.id)}
                onError={() => markFailed(slide.id)}
                className="w-full h-full object-cover object-center"
              />
            </Link>
          </div>
        );
      })}

      {/* Navigation Buttons */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); goPrev(); }}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/90 shadow-md hover:bg-slate-900 hover:text-white text-slate-900 hidden sm:flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
        aria-label="Banner trước"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); goNext(); }}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/90 shadow-md hover:bg-slate-900 hover:text-white text-slate-900 hidden sm:flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
        aria-label="Banner tiếp theo"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Indicators & Counter */}
      <div className="absolute bottom-4 right-6 z-30 hidden md:flex items-center gap-3 rounded-full bg-black/40 backdrop-blur-sm px-4 py-1.5 text-white text-xs font-bold tracking-wider tabular-nums">
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
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-black/30 px-2 py-1 md:hidden">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(index); }}
            aria-label={`Slide ${index + 1}`}
            className={`transition-all duration-300 h-1 rounded-full ${
              index === current ? 'w-5 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </section>
  );
}

