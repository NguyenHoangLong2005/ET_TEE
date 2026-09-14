'use client';

import { useEffect, useState } from 'react';
import { RecommendationService, RecommendationItem } from '@/lib/services/recommendationService';
import ProductCard from '@/components/ui/ProductCard';

export default function CartRecommendations({ cartItems }: { cartItems: any[] }) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        if (cartItems && cartItems.length > 0) {
          // Lấy slug của sản phẩm đầu tiên trong giỏ hàng để gợi ý
          const firstSlug = cartItems[0].productSlug;
          const outfit = await RecommendationService.getOutfitRecommendations(firstSlug, 4);
          setRecommendations(outfit);
        } else {
          // Nếu giỏ trống, lấy gợi ý chung
          const general = await RecommendationService.getPersonalizedRecommendations(4);
          setRecommendations(general);
        }
      } catch (err) {
        console.error('Failed to fetch recommendations', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [cartItems]);

  if (isLoading || recommendations.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {recommendations.map(({ product, reason }) => (
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
          {reason && (
            <p className="text-center text-xs text-gray-500 font-bold mt-2 uppercase tracking-wide">
              {reason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
