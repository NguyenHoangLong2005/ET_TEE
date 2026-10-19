'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import SectionHeader from './SectionHeader';
import { getApiBaseUrl } from '@/lib/api-config';

type CategoryFromApi = {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
  parentId?: number | null;
  displayOrder: number;
  active: boolean;
};

export default function CategoryHighlights() {
  const [categories, setCategories] = useState<CategoryFromApi[]>([]);
  const [loading, setLoading] = useState(true);

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
        // Filter only root categories that are active. The backend omits null
        // fields (Jackson non_null), so a root's parentId is absent, not null.
        const rootCategories = (data.data || []).filter(
          (cat: CategoryFromApi) => cat.active && cat.parentId == null
        );
        setCategories(rootCategories);
      } catch (err) {
        // Not console.error: the UI falls back to static categories, and
        // console.error triggers the Next dev error overlay.
        console.warn('Error fetching categories:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCategories();
    return () => { cancelled = true; };
  }, []);

  // The home banners carry their own headline text, so as tile backgrounds they printed a
  // second headline under the category name. These are plain model shots on the same grey
  // backdrop, one per root category.
  const TILE_IMAGES: Record<string, string> = {
    women: '/images/women/outerwear/ao-khoac-active-nu-interlock-scuba-se285.webp',
    men: '/images/men/shirt/ao-so-mi-flannel-dai-tay-nam-hoa-tiet-ke-cg100.webp',
    kids: '/images/kids/outerwear/ao-khoac-gio-active-be-trai-co-hinh-in-sb001.webp',
    family: '/images/family/tshirt/ao-phong-active-unisex-tre-em-co-hinh-in-wicking-sm042.webp',
    accessories: '/images/accessories/accessories/khan-badana-vietnam-youngster-fr081.webp',
  };
  // Root categories were seeded with their slug as name ("men"); show the storefront label.
  const LABELS: Record<string, string> = {
    women: 'Thời trang nữ', men: 'Thời trang nam', kids: 'Trẻ em', family: 'Gia đình', accessories: 'Phụ kiện',
  };
  const ORDER = ['women', 'men', 'kids', 'family', 'accessories'];

  const source: CategoryFromApi[] = categories.length > 0
    ? categories
    : ORDER.map((slug, i) => ({ id: -i - 1, name: LABELS[slug], slug, description: '', displayOrder: i, active: true }));

  const visibleCategories = [...source]
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.slug), ib = ORDER.indexOf(b.slug);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.displayOrder - b.displayOrder;
    })
    .slice(0, 5);
  // The first card spans 2x2 and the rest fill the remaining 2 columns. When
  // an odd number of small cards remain, stretch the last one across both
  // columns so the grid has no empty cell.
  const smallCardCount = visibleCategories.length - 1;
  const stretchLast = smallCardCount > 0 && smallCardCount % 2 === 1;

  const displayCategories = visibleCategories.map((cat, index) => ({
    id: cat.id,
    name: LABELS[cat.slug] ?? cat.name,
    slug: cat.slug,
    sub: cat.description || 'Thời trang ET.TEE',
    href: `/products?category=${cat.slug}`,
    img: cat.imageUrl || TILE_IMAGES[cat.slug] || TILE_IMAGES.women,
    span:
      index === 0
        ? 'lg:col-span-2 lg:row-span-2'
        : stretchLast && index === visibleCategories.length - 1
          ? 'lg:col-span-2'
          : 'lg:col-span-1',
    tall: index === 0,
  }));

  if (loading) {
    return (
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 xl:px-8">
          <div className="h-7 w-64 mb-8 bg-slate-100 animate-pulse rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[220px] md:auto-rows-[260px]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`bg-slate-100 animate-pulse rounded-2xl ${i === 0 ? 'lg:col-span-2 lg:row-span-2 row-span-2' : ''}`} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4 xl:px-8">
        <SectionHeader title="Khám phá theo danh mục" viewAllLink="/products" />

        {/* Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[220px] md:auto-rows-[260px]">
          {displayCategories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className={`group relative overflow-hidden rounded-2xl bg-slate-100 transition-all duration-500 ${cat.span} ${cat.tall ? 'row-span-2' : ''}`}
            >
              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.img}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover object-[center_20%] transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Dark overlay for text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {/* Card Label & Details */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-10">
                {/* Only the large tile has room for the description; on the small ones it ran
                    over the model's face and pushed the name onto three lines. */}
                {cat.tall && <p className="hidden md:block text-white/85 text-sm mb-1 max-w-sm">{cat.sub}</p>}
                <h3 className={`text-white font-bold uppercase tracking-wide leading-tight ${cat.tall ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'}`}>
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

