import Link from 'next/link';
import { RecommendationService, SLOT_LABEL } from '@/lib/services/recommendationService';
import { formatVnd } from '@/lib/utils/price';
import ProductCard from '@/components/ui/ProductCard';
import ProductCarousel from '@/components/home/ProductCarousel';

export default async function ProductRecommendations({ slug }: { slug: string }) {
  const similarProducts = await RecommendationService.getSimilarProducts(slug, 10);
  const outfit = await RecommendationService.getOutfitSet(slug);
  const pieces = outfit?.pieces ?? [];
  const isModel = outfit?.strategy === 'MODEL';
  const setTotal = pieces.reduce((sum, p) => sum + (p.product.salePrice || p.product.price || 0), 0);

  return (
    <div className="mt-20">
      {/* Similar Products - content-based (CLIP image + text embeddings) */}
      <ProductCarousel
        title="Sản phẩm tương tự"
        products={similarProducts.map(({ product }) => product)}
        embedded
      />

      {/* Outfit: completed by the compatibility model (Sprint 4); rule-based list as fallback */}
      {pieces.length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-bold uppercase text-slate-900 mb-2 text-center">
            {isModel ? 'Phối trọn bộ' : 'Gợi ý phối đồ'}
          </h2>
          {isModel && (
            <p className="text-center text-sm text-slate-500 mb-8">
              Các món hợp với sản phẩm này và hợp với nhau · Tổng các món phối:{' '}
              <span className="font-bold text-slate-900">{formatVnd(setTotal)}₫</span>
            </p>
          )}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isModel ? '' : 'mt-6'}`}>
            {pieces.map(({ product, slot, alternatives }) => (
              <div key={product.id}>
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
                {slot && (
                  <p className="text-center text-xs text-slate-500 font-bold mt-2 uppercase tracking-wide">
                    {SLOT_LABEL[slot] ?? slot}
                  </p>
                )}
                {alternatives.length > 0 && (
                  <p className="text-center text-xs text-slate-500 mt-1">
                    Hoặc:{' '}
                    {alternatives.map((alt, i) => (
                      <span key={alt.id}>
                        {i > 0 && ' · '}
                        <Link href={`/products/${alt.slug}`} className="underline hover:text-slate-900">
                          {alt.name.length > 28 ? `${alt.name.slice(0, 28)}…` : alt.name}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

