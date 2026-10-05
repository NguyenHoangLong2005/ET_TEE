'use client';

import { useEffect, useState } from 'react';
import { RecommendationService, CartComplement, segmentLabel } from '@/lib/services/recommendationService';
import ProductCard from '@/components/ui/ProductCard';

/**
 * Cart page "Thường được mua kèm": add-ons for what is in the cart (FP-Growth rules on past orders,
 * backend CartComplementService). Refetches whenever the cart's contents change; hidden when the
 * cart is empty.
 */
export default function CartRecommendations({ cartItems }: { cartItems: { variantId: number }[] }) {
  const [items, setItems] = useState<CartComplement[]>([]);
  const cartKey = cartItems.map(i => i.variantId).sort((a, b) => a - b).join(',');

  useEffect(() => {
    if (!cartKey) {
      setItems([]);
      return;
    }
    let cancelled = false;
    RecommendationService.getCartComplements(4).then(result => {
      if (!cancelled) setItems(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cartKey]);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ product, segment, source }) => (
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
          <p className="text-center text-xs text-slate-500 font-bold mt-2 uppercase tracking-wide">
            {source === 'RULE' ? `Hay mua kèm · ${segmentLabel(segment)}` : `Bán chạy · ${segmentLabel(segment)}`}
          </p>
        </div>
      ))}
    </div>
  );
}
