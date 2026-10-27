'use client';

import { useEffect, useState } from 'react';
import ProductCarousel from './ProductCarousel';
import { Product } from '@/lib/services/productService';
import {
  RecommendationService, ForYouFeed, BecauseYouViewedFeed, CartComplement,
} from '@/lib/services/recommendationService';

type Feeds = {
  forYou: ForYouFeed;
  because: BecauseYouViewedFeed;
  cart: CartComplement[];
};

/** Drops products already shown in an earlier section, so the same item never repeats down the page. */
function unseen(products: Product[], seen: Set<number>, limit: number): Product[] {
  const out: Product[] = [];
  for (const p of products) {
    if (out.length >= limit) break;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/**
 * The personal part of the home page, right under the categories. Each block is hidden when it has
 * nothing to show (a new visitor sees none of them, then "Đang được quan tâm" further down):
 *
 *   Dành riêng cho bạn       SASRec over the shopper's recent views / cart / orders (ForYouService)
 *   Vì bạn đã xem "X"        CLIP neighbours of the last product viewed (HomeRecommendationService)
 *   Hoàn thiện giỏ hàng      FP-Growth rules on the current cart (CartComplementService)
 *
 * Runs in the browser: the login / guest token that identifies the shopper lives there.
 */
export default function PersonalizedSections() {
  const [feeds, setFeeds] = useState<Feeds | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      RecommendationService.getForYou(12),
      RecommendationService.getBecauseYouViewed(16),
      RecommendationService.getCartComplements(8),
    ]).then(([forYou, because, cart]) => {
      if (!cancelled) setFeeds({ forYou, because, cart });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!feeds) return null;

  const seen = new Set<number>();
  const forYou = feeds.forYou.strategy === 'NONE' ? [] : unseen(feeds.forYou.products, seen, 12);
  const because = feeds.because.anchor ? unseen(feeds.because.products, seen, 12) : [];
  const cart = unseen(feeds.cart.map(c => c.product), seen, 8);
  const cartFromRules = feeds.cart.some(c => c.source === 'RULE');

  return (
    <>
      <ProductCarousel
        title="Dành Riêng Cho Bạn"
        subtitle="Gợi ý dựa trên những sản phẩm bạn vừa xem và chọn mua"
        bgColor="bg-white"
        products={forYou}
        trackSource="recommendation"
      />
      {feeds.because.anchor && (
        <ProductCarousel
          title="Vì Bạn Đã Xem"
          subtitle={`Sản phẩm có kiểu dáng và màu sắc gần với “${feeds.because.anchor.name}”`}
          bgColor="bg-slate-50"
          products={because}
          trackSource="recommendation"
        />
      )}
      <ProductCarousel
        title="Hoàn Thiện Giỏ Hàng"
        subtitle={cartFromRules
          ? 'Những món khách hàng thường mua cùng các sản phẩm trong giỏ của bạn'
          : 'Sản phẩm bán chạy cùng nhóm với các món trong giỏ của bạn'}
        bgColor="bg-white"
        products={cart}
        trackSource="recommendation"
      />
    </>
  );
}
