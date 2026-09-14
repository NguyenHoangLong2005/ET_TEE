import { RecommendationService } from '@/lib/services/recommendationService';
import ProductCard from '@/components/ui/ProductCard';

export default async function ProductRecommendations({ slug }: { slug: string }) {
  const similarProducts = await RecommendationService.getSimilarProducts(slug, 4);
  const outfitProducts = await RecommendationService.getOutfitRecommendations(slug, 4);

  return (
    <div className="mt-20">
      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-bold uppercase text-gray-900 mb-8 text-center">
            Sản phẩm tương tự
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similarProducts.map(({ product }) => (
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
        </section>
      )}

      {/* Outfit Recommendations */}
      {outfitProducts.length > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-bold uppercase text-gray-900 mb-8 text-center">
            Gợi ý phối đồ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {outfitProducts.map(({ product, reason }) => (
              <div key={product.id}>
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
                <p className="text-center text-xs text-gray-500 font-bold mt-2 uppercase tracking-wide">
                  {reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
