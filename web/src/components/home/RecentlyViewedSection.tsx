'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { Product } from '@/lib/services/productService';
import { RecommendationService } from '@/lib/services/recommendationService';

/** "Bạn đã xem gần đây": the shopper's own last product pages, newest first. Hidden without history. */
export default function RecentlyViewedSection() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    RecommendationService.getRecentlyViewed(12).then(list => {
      if (!cancelled) setProducts(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProductCarousel
      title="Bạn Đã Xem Gần Đây"
      subtitle="Quay lại những sản phẩm bạn vừa xem"
      bgColor="bg-white"
      products={products}
    />
  );
}
