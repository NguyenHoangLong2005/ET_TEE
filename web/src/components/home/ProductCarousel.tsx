'use client';

import { useRef, useState, useEffect } from 'react';
import SectionHeader, { CarouselArrow } from './SectionHeader';
import ProductCard from '../ui/ProductCard';
import { markNextViewSource, ViewSource } from '@/lib/services/behaviorTracking';

import { Product } from '@/lib/services/productService';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  bgColor?: string;
  products: Product[];
  /** Render inside a page that already provides the container/vertical spacing (e.g. PDP). */
  embedded?: boolean;
  /** Record the product page opened from this carousel with this source (click-through). */
  trackSource?: ViewSource;
}

export default function ProductCarousel({ title, subtitle, viewAllLink, bgColor = 'bg-white', products, embedded = false, trackSource }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5); // 5px tolerance
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 350); // check after scroll animation
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section className={embedded ? 'mb-16' : `py-12 md:py-16 ${bgColor}`}>
      <div className={embedded ? '' : 'container mx-auto px-4 xl:px-8'}>
        <SectionHeader title={title} subtitle={subtitle} viewAllLink={viewAllLink}>
          <div className="hidden sm:flex items-center gap-1.5">
            <CarouselArrow direction="left" disabled={!canScrollLeft} onClick={() => scroll('left')} />
            <CarouselArrow direction="right" disabled={!canScrollRight} onClick={() => scroll('right')} />
          </div>
        </SectionHeader>

        <div 
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[calc(50%-8px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] flex-shrink-0 snap-start"
              onClickCapture={trackSource ? () => markNextViewSource(product.id, trackSource) : undefined}
            >
              <ProductCard 
                id={product.slug}
                productId={product.id}
                name={product.name}
                price={product.salePrice || product.price}
                originalPrice={product.salePrice ? product.price : undefined}
                image={product.images && product.images.length > 0 ? product.images[0].imageUrl : '/images/products/placeholder.webp'}
                hoverImage={product.images && product.images.length > 1 ? product.images[1].imageUrl : undefined}
                category={product.category?.name || 'Sản phẩm'}
                isNew={product.isNew}
                colors={Array.from(new Set(product.variants?.map(v => v.colorHex).filter(Boolean))) as string[]}
                sizes={Array.from(new Set(product.variants?.map(v => v.size).filter(Boolean))) as string[]}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

