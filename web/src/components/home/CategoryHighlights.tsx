'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';

type CategoryFromApi = {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  parentId: number | null;
  displayOrder: number;
  active: boolean;
};

export default function CategoryHighlights() {
  const [categories, setCategories] = useState<CategoryFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchWithRetry = async (attempts = 3) => {
      for (let i = 0; i < attempts; i++) {
        try {
          const res = await fetch(`${getApiBaseUrl()}/api/categories`);
          if (res.ok) return res;
        } catch {
          /* network error: retry */
        }
        // The backend may be restarting; wait briefly before retrying.
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
      throw new Error('Failed to fetch categories');
    };

    const fetchCategories = async () => {
      try {
        const res = await fetchWithRetry();
        if (cancelled) return;

        const data = await res.json();
        // Filter only root categories (parentId is null) that are active
        const rootCategories = (data.data || []).filter(
          (cat: CategoryFromApi) => cat.active && cat.parentId === null
        );
        setCategories(rootCategories);
      } catch (err) {
        // Not console.error: the UI falls back to static categories, and
        // console.error triggers the Next dev error overlay.
        console.warn('Error fetching categories:', err);
        if (!cancelled) setError('Không thể tải danh mục');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCategories();
    return () => { cancelled = true; };
  }, []);

  // Map categories to display format with fallback images
  const visibleCategories = categories.slice(0, 5);
  // The first card spans 2x2 and the rest fill the remaining 2 columns. When
  // an odd number of small cards remain, stretch the last one across both
  // columns so the grid has no empty cell.
  const smallCardCount = visibleCategories.length - 1;
  const stretchLast = smallCardCount > 0 && smallCardCount % 2 === 1;

  const displayCategories = visibleCategories.map((cat, index) => {
    // Use imageUrl if available, otherwise use local fallback
    let imgUrl = cat.imageUrl;
    if (!imgUrl) {
      // Fallback to local images based on category slug
      const fallbackImages: Record<string, string> = {
        'women': '/images/categories/women.webp',
        'men': '/images/categories/men.webp',
        'kids': '/images/categories/kids.webp',
        'family': '/images/categories/family.webp',
        'accessories': '/images/categories/accessories.webp',
      };
      imgUrl = fallbackImages[cat.slug] || '/images/categories/default.webp';
    }

    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      sub: cat.description || 'Thời trang ET.TEE',
      badge: index === 0 ? 'XU HƯỚNG' : index === 1 ? 'MUST-HAVE' : index === 2 ? 'ORGANIC' : 'HOT DEAL',
      href: `/products?category=${cat.slug}`,
      img: imgUrl,
      span:
        index === 0
          ? 'lg:col-span-2 lg:row-span-2'
          : stretchLast && index === visibleCategories.length - 1
            ? 'lg:col-span-2'
            : 'lg:col-span-1',
      tall: index === 0,
    };
  });

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div className="h-8 w-64 bg-slate-200 animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[220px] md:auto-rows-[260px]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-slate-200 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || displayCategories.length === 0) {
    // Fallback to static categories if API fails or no data
    return (
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 xl:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <h2 className="text-2xl md:text-4xl font-black text-black tracking-tight uppercase">
              KHÁM PHÁ THEO DANH MỤC
            </h2>
            <Link 
              href="/products" 
              className="inline-flex items-center gap-1.5 text-sm font-bold uppercase text-slate-500 hover:text-black transition-colors group"
            >
              <span>Xem tất cả</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[220px] md:auto-rows-[260px]">
            {/* Static fallback for demo */}
            {[
              { name: 'Thời Trang Nữ', slug: 'women', sub: 'Áo, Váy, Quần & Phụ Kiện', badge: 'XU HƯỚNG', span: 'lg:col-span-2 lg:row-span-2', tall: true, img: '/images/banners/home/banner-1.webp', href: '/products?category=women' },
              { name: 'Thời Trang Nam', slug: 'men', sub: 'Sơ mi, Polo, Áo khoác', badge: 'MUST-HAVE', span: 'lg:col-span-1', tall: false, img: '/images/banners/home/banner-2.webp', href: '/products?category=men' },
              { name: 'Trẻ Em (Kids)', slug: 'kids', sub: 'Size 90 – 160 cm', badge: 'ORGANIC', span: 'lg:col-span-1', tall: false, img: '/images/banners/home/banner-3.webp', href: '/products?category=kids' },
              { name: 'Family Set', slug: 'family', sub: 'Mặc đồng điệu cả nhà', badge: 'HOT DEAL', span: 'lg:col-span-2', tall: false, img: '/images/banners/home/banner-4.webp', href: '/products?category=family' },
            ].map((cat) => (
              <Link
                key={cat.slug}
                href={cat.href}
                className={`group relative overflow-hidden bg-slate-100 transition-all duration-500 ${cat.span} ${cat.tall ? 'row-span-2' : ''}`}
              >
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-widest">
                    {cat.badge}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                  <p className="text-white/80 text-xs md:text-sm mb-1">{cat.sub}</p>
                  <h3 className="text-white font-bold text-xl md:text-3xl uppercase tracking-wide">
                    {cat.name}
                  </h3>
                  <div className="mt-4 flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                    <span className="border-b border-white pb-0.5">Khám phá</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 xl:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-black tracking-tight uppercase">
              KHÁM PHÁ THEO DANH MỤC
            </h2>
          </div>
          
          <Link 
            href="/products" 
            className="inline-flex items-center gap-1.5 text-sm font-bold uppercase text-slate-500 hover:text-black transition-colors group"
          >
            <span>Xem tất cả</span>
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[220px] md:auto-rows-[260px]">
          {displayCategories.map((cat, index) => (
            <Link
              key={cat.id}
              href={cat.href}
              className={`group relative overflow-hidden bg-slate-100 transition-all duration-500 ${cat.span} ${cat.tall ? 'row-span-2' : ''}`}
            >
              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.img}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Dark overlay for text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="px-3 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-widest">
                  {cat.badge}
                </span>
              </div>

              {/* Card Label & Details */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <p className="text-white/80 text-xs md:text-sm mb-1">{cat.sub}</p>
                <h3 className="text-white font-bold text-xl md:text-3xl uppercase tracking-wide">
                  {cat.name}
                </h3>
                
                <div className="mt-4 flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                  <span className="border-b border-white pb-0.5">Khám phá</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

