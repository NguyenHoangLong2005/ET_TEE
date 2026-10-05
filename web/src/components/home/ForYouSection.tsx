'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { RecommendationService, ForYouFeed } from '@/lib/services/recommendationService';

/**
 * "Dành riêng cho bạn": ranked from this shopper's recent views / cart / orders (SASRec on the
 * backend). Hidden until there is behavior to rank from - a new visitor sees the regular sections
 * instead of a best-seller list relabelled as personal.
 */
export default function ForYouSection() {
  const [feed, setFeed] = useState<ForYouFeed | null>(null);

  useEffect(() => {
    let cancelled = false;
    RecommendationService.getForYou(12).then(f => {
      if (!cancelled) setFeed(f);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!feed || feed.strategy === 'NONE' || feed.products.length === 0) return null;

  return (
    <ProductCarousel
      title="Dành Riêng Cho Bạn"
      subtitle="Gợi ý dựa trên những sản phẩm bạn vừa xem và chọn mua"
      bgColor="bg-white"
      products={feed.products}
    />
  );
}
