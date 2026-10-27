'use client';

import SectionHeader from './SectionHeader';
import ProductCard from '../ui/ProductCard';
import { Product } from '@/lib/services/productService';

import { getValidProductImage } from '@/lib/utils/imageUtils';

type OutfitSectionProps = {
  products: Product[];
};

export default function OutfitSection({ products }: OutfitSectionProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4 xl:px-8">
        {/* The products are simply the family category (matching sets for the whole family);
            the old "Gợi ý phối đồ & Lookbook / tone-sur-tone" copy promised styling it never showed. */}
        <SectionHeader
          title="Đồ gia đình"
          subtitle="Trang phục đồng bộ cho bố mẹ và bé, mặc cùng nhau thật ăn ý"
          viewAllLink="/products?category=family"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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

