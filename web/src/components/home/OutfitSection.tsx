'use client';

import Link from 'next/link';
import ProductCard from '../ui/ProductCard';
import { Product } from '@/lib/services/productService';

import { getValidProductImage } from '@/lib/utils/imageUtils';

type OutfitSectionProps = {
  products: Product[];
};

export default function OutfitSection({ products }: OutfitSectionProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-14 md:py-18 bg-slate-50">
      <div className="container mx-auto px-4 xl:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-black mb-1 inline-block">Styling Guide</span>
            <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight mb-2">Gợi Ý Phối Đồ & Lookbook</h2>
            <p className="text-slate-500 text-sm max-w-xl">
              Hết đau đầu với câu hỏi "Hôm nay mặc gì?". Khám phá phong cách thời trang phối đồ tone-sur-tone cực chất.
            </p>
          </div>
          <Link 
            href="/products?category=family" 
            className="inline-flex items-center gap-1.5 text-sm font-bold uppercase text-slate-500 hover:text-black transition-colors group"
          >
            <span>Xem tất cả</span>
            <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {products.slice(0, 4).map((product, idx) => (
            <ProductCard 
              key={product.id || idx}
              id={product.slug || String(product.id)}
              productId={typeof product.id === 'number' ? product.id : undefined}
              name={product.name}
              price={product.salePrice || product.price}
              originalPrice={product.salePrice ? product.price : undefined}
              image={getValidProductImage(product, idx)}
              category={product.category?.name || 'Sản phẩm'}
              isNew={product.isNew}
              colors={Array.from(new Set(product.variants?.map(v => v.colorHex).filter(Boolean))) as string[]}
              sizes={Array.from(new Set(product.variants?.map(v => v.size).filter(Boolean))) as string[]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

