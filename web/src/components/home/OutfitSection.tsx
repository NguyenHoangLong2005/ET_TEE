import Link from 'next/link';
import ProductCard from '../ui/ProductCard';
import { Product } from '@/lib/services/productService';

type OutfitSectionProps = {
  products: Product[];
};

export default function OutfitSection({ products }: OutfitSectionProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-4">Gợi ý Mix & Match</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Hết đau đầu với câu hỏi "Hôm nay mặc gì?". Hãy để ET.TEE gợi ý những set đồ gia đình tone-sur-tone cực chất.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Banner Outfit */}
          <div className="lg:col-span-1 relative rounded-2xl overflow-hidden aspect-[3/4] lg:aspect-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://images.unsplash.com/photo-1543269664-76bc3997d9ea?q=80&w=1000&auto=format&fit=crop" 
              alt="Family matching outfits" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex flex-col justify-end p-8">
              <h3 className="text-2xl font-bold text-white mb-2">Weekend Vibes</h3>
              <p className="text-white/80 mb-6">Trang phục thoải mái cho những chuyến đi chơi cuối tuần của cả nhà.</p>
              <Link href="/collections/weekend" className="inline-block bg-white text-slate-900 font-bold px-6 py-3 rounded-full text-center hover:bg-primary hover:text-white transition w-max">
                Xem toàn bộ Lookbook
              </Link>
            </div>
          </div>

          {/* Product Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
            {products.slice(0, 4).map(product => (
              <ProductCard 
                key={product.id}
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
