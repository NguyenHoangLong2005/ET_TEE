'use client';

import { useEffect, useState, useRef } from 'react';
import SectionHeader, { CarouselArrow } from './SectionHeader';
import ProductCard from '@/components/ui/ProductCard';
import { marketingService, type ProductPlacement } from '@/lib/services/marketingService';
import { getValidProductImage } from '@/lib/utils/imageUtils';
import { getApiBaseUrl } from '@/lib/api-config';


interface ProductItem {
  id: number | string;
  slug?: string;
  name: string;
  image?: string;
  price?: number;
  salePrice?: number;
  isNew?: boolean;
  isSale?: boolean;
  category?: string;
  variants?: any[];
  images?: any[];
}

interface MarketingCarouselProps {
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  bgColor?: string;
  placementKey: string;
  fallback: ProductItem[];
}

export default function MarketingCarousel({
  title,
  subtitle,
  viewAllLink,
  bgColor = 'bg-white',
  placementKey,
  fallback,
}: MarketingCarouselProps) {
  const [products, setProducts] = useState<ProductItem[]>(fallback || []);
  const [source, setSource] = useState<'placement' | 'fallback'>('fallback');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Sync fallback if fallback prop updates
  useEffect(() => {
    if (source === 'fallback' && fallback && fallback.length > 0) {
      setProducts(fallback);
    }
  }, [fallback, source]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await marketingService.getPublicPlacements(placementKey);
        const placements: ProductPlacement[] = res.data || [];
        const active = placements.filter((p) => (p.status || 'ACTIVE') === 'ACTIVE');
        if (active.length === 0) return;
        const ids = active.map((p) => p.productId).filter(Boolean);
        if (ids.length === 0) return;
        const API = getApiBaseUrl();
        // /api/products/{slug} takes a slug, not a numeric id - every request
        // here 404'd (placement.productId is a numeric Product.id), so this
        // carousel always silently fell back to the hardcoded `fallback`
        // prop and never actually reflected what marketing configured.
        // /api/customer/products/{id} is the real by-id lookup.
        const fetches = await Promise.allSettled(
          ids.map((id) =>
            fetch(`${API}/api/customer/products/${id}`).then((r) => (r.ok ? r.json() : null))
          )
        );
        if (!mounted) return;
        const loaded: ProductItem[] = fetches
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value?.data)
          .map((r) => {
            const d = r.value.data;
            return {
              id: d.id,
              slug: d.slug,
              name: d.name,
              price: d.price,
              salePrice: d.salePrice,
              isNew: d.isNew,
              isSale: d.isSale,
              category: d.category?.name || d.targetGroup,
              variants: d.variants,
              images: d.images,
              image: getValidProductImage(d, 0),
            } as ProductItem;
          });
        if (loaded.length > 0) {
          setProducts(loaded);
          setSource('placement');
        }
      } catch {
        // keep fallback
      }
    })();
    return () => { mounted = false; };
  }, [placementKey]);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section className={`py-12 md:py-16 ${bgColor}`}>
      <div className="container mx-auto px-4 xl:px-8">
        <SectionHeader title={title} subtitle={subtitle} viewAllLink={viewAllLink}>
          <div className="hidden sm:flex items-center gap-1.5">
            <CarouselArrow direction="left" disabled={!canScrollLeft} onClick={() => scroll('left')} />
            <CarouselArrow direction="right" disabled={!canScrollRight} onClick={() => scroll('right')} />
          </div>
        </SectionHeader>

        {/* Product Cards Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.filter((p) => (p.salePrice || p.price || 0) > 0).map((p, idx) => {
            const rawId = p.slug || String(p.id);
            const numId = typeof p.id === 'number' ? p.id : Number(p.id) || undefined;
            const validImg = getValidProductImage(p, idx);
            const displayPrice = p.salePrice || p.price || 0;
            const origPrice = p.salePrice && p.price && p.price > p.salePrice ? p.price : undefined;
            const isSaleItem = !!origPrice || p.isSale;

            const colorHexes = Array.from(
              new Set((p.variants || []).map((v: any) => v.colorHex || v.color).filter(Boolean))
            ) as string[];

            const sizes = Array.from(
              new Set((p.variants || []).map((v: any) => v.size).filter(Boolean))
            ) as string[];

            return (
              <div
                key={p.id || idx}
                className="w-[calc(50%-8px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] flex-shrink-0 snap-start"
              >
                <ProductCard
                  id={rawId}
                  productId={numId}
                  name={p.name}
                  price={displayPrice}
                  originalPrice={origPrice}
                  image={validImg}
                  category={typeof p.category === 'string' ? p.category : (p.category as any)?.name || 'Thời trang'}
                  isNew={p.isNew}
                  colors={colorHexes}
                  sizes={sizes}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
