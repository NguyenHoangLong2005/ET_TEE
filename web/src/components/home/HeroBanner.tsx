'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { marketingService, type Banner } from '@/lib/services/marketingService';

const FALLBACK_SLIDES: { bg: string; href: string }[] = [
  { bg: '/images/banners/home/banner-1.webp', href: '/products' },
  { bg: '/images/banners/home/banner-2.webp', href: '/products' },
  { bg: '/images/banners/home/banner-3.webp', href: '/products?category=family' },
];

const AUTO_PLAY_INTERVAL = 5000;

type Slide = { id: string | number; bg: string; href: string; title?: string };

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [apiSlides, setApiSlides] = useState<Banner[] | null>(null);
  const [impressionSent, setImpressionSent] = useState<Set<string>>(new Set());

  // Fetch public banners; if API returns empty / fails, fall back to local images.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await marketingService.getPublicBanners('HOME_HERO');
        if (mounted && Array.isArray(res.data) && res.data.length > 0) {
          setApiSlides(res.data);
        }
      } catch {
        // silent: keep fallback
      }
    })();
    return () => { mounted = false; };
  }, []);

  const slides: Slide[] = useMemo(() => {
    if (apiSlides && apiSlides.length > 0) {
      return apiSlides
        .filter((b) => !!b.imageUrl)
        .map((b) => ({
          id: b.id ?? Math.random(),
          bg: b.imageUrl!,
          href: b.linkUrl || '/products',
          title: b.title,
        }));
    }
    return FALLBACK_SLIDES.map((s, i) => ({ id: `fallback-${i}`, ...s }));
  }, [apiSlides]);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(goNext, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, goNext]);

  // Fire IMPRESSION once per slide (best-effort, only for API banners)
  useEffect(() => {
    const s = slides[current];
    if (!s || !apiSlides) return;
    const id = String(s.id);
    if (impressionSent.has(id)) return;
    setImpressionSent((prev) => new Set(prev).add(id));
    const banner = apiSlides.find((b) => String(b.id ?? '') === id);
    if (!banner?.id) return;
    const sessionId = (() => {
      try {
        let sid = sessionStorage.getItem('mkt_session');
        if (!sid) {
          sid = Math.random().toString(36).slice(2);
          sessionStorage.setItem('mkt_session', sid);
        }
        return sid;
      } catch { return undefined; }
    })();
    marketingService
      .trackEvent({ eventType: 'IMPRESSION', bannerId: banner.id, sessionId })
      .catch(() => {});
  }, [current, slides, apiSlides, impressionSent]);

  const handleClick = (s: Slide) => {
    const banner = apiSlides?.find((b) => String(b.id ?? '') === String(s.id));
    if (banner?.id) {
      marketingService
        .trackEvent({ eventType: 'CLICK', bannerId: banner.id })
        .catch(() => {});
    }
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-gray-100"
      style={{ aspectRatio: '3 / 1', maxHeight: '560px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          <Link
            href={slide.href}
            onClick={() => handleClick(slide)}
            className="block w-full h-full cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.bg}
              alt={slide.title || `Banner ${index + 1}`}
              className="w-full h-full object-cover object-center"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </Link>
        </div>
      ))}

      {slides.length > 1 ? (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-800 hover:bg-white shadow-md transition"
            aria-label="Banner trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-800 hover:bg-white shadow-md transition"
            aria-label="Banner tiếp theo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                aria-label={`Slide ${index + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  index === current ? 'w-6 h-2 bg-slate-900' : 'w-2 h-2 bg-white/70 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
