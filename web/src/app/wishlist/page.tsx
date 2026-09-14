'use client';

import { useWishlist } from '@/contexts/WishlistContext';
import ProductCard from '@/components/ui/ProductCard';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function WishlistPage() {
  const { wishlistItems } = useWishlist();

  return (
    <div className="container mx-auto px-4 xl:px-8 py-8 md:py-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-8">
          Mục yêu thích
        </h1>

        {wishlistItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 rounded-lg">
            <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 mb-2">Chưa có sản phẩm nào</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              Bạn chưa lưu sản phẩm nào vào mục yêu thích. Hãy tiếp tục khám phá và lưu lại những món đồ bạn thích nhé.
            </p>
            <Link 
              href="/products" 
              className="px-8 py-3 bg-slate-900 text-white text-sm font-bold tracking-widest uppercase hover:bg-[#e50027] transition-colors"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {wishlistItems.map((product) => {
              const primaryImage = product.images?.find((img: any) => img.isPrimary)?.imageUrl || product.images?.[0]?.imageUrl || '/images/placeholder.jpg';
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
    </div>
  );
}
