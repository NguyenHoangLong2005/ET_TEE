'use client';

import { useWishlist } from '@/contexts/WishlistContext';
import ProductCard from '@/components/ui/ProductCard';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import PageBreadcrumb from '@/components/ui/PageBreadcrumb';

export default function WishlistPage() {
  const { wishlistItems } = useWishlist();

  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-6xl">
        <PageBreadcrumb items={[{ label: 'Mục yêu thích' }]} />

        {wishlistItems.length === 0 ? (
          <div className="bg-slate-50/60 border border-dashed border-slate-200/80 rounded-3xl p-12 md:p-16 text-center max-w-2xl mx-auto">
            <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Chưa có sản phẩm nào</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-md mx-auto">
              Bạn chưa lưu sản phẩm nào vào mục yêu thích. Hãy tiếp tục khám phá và lưu lại những món đồ bạn thích nhé.
            </p>
            <Link 
              href="/products" 
              className="inline-block px-8 py-3.5 bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {wishlistItems.map((product) => {
              const primaryImage = product.images?.find((img: any) => img.isPrimary)?.imageUrl || product.images?.[0]?.imageUrl || '/images/products/placeholder.webp';
              const hoverImage = product.images?.length > 1 ? product.images[1].imageUrl : undefined;
              
              const allColors = product.variants?.map((v: any) => v.colorHex).filter(Boolean) || [];
              const uniqueColors = Array.from(new Set(allColors)) as string[];

              const allSizes = product.variants?.map((v: any) => v.size).filter(Boolean) || [];
              const uniqueSizes = Array.from(new Set(allSizes)) as string[];

              return (
                <ProductCard
                  key={product.id}
                  id={product.slug || product.id.toString()}
                  productId={product.id}
                  name={product.name}
                  price={product.salePrice || product.price}
                  originalPrice={product.salePrice ? product.price : undefined}
                  image={primaryImage}
                  hoverImage={hoverImage}
                  category={product.category?.name || 'Sản phẩm'}
                  isNew={product.isNew}
                  colors={uniqueColors}
                  sizes={uniqueSizes}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

