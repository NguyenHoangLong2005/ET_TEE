'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../ui/ProductCard';

import { Product } from '@/lib/services/productService';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  bgColor?: string;
  products: Product[];
}

export default function ProductCarousel({ title, subtitle, viewAllLink, bgColor = 'bg-white', products }: ProductCarouselProps) {
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
    <section className={`py-12 md:py-16 ${bgColor}`}>
      <div className="container mx-auto px-4 xl:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 border-b border-gray-200 pb-3">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase relative inline-block pb-2">
              {title}
              <span className="absolute bottom-0 left-0 w-1/2 h-1 bg-[#e50027]"></span>
            </h2>
            {subtitle && <p className="text-sm text-slate-500 font-medium">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-4">
            {viewAllLink && (
              <a href={viewAllLink} className="text-sm font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">
                Xem tất cả
              </a>
            )}
            {/* Navigation Arrows */}
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
                  canScrollLeft ? 'border-slate-300 text-slate-700 hover:bg-slate-50' : 'border-gray-100 text-gray-300'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
                  canScrollRight ? 'border-slate-300 text-slate-700 hover:bg-slate-50' : 'border-gray-100 text-gray-300'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => (
            <div key={product.id} className="w-[calc(50%-8px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] flex-shrink-0 snap-start">
              <ProductCard 
                id={product.slug}
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
