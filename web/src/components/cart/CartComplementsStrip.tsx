'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/ui/SafeImage';
import { RecommendationService, CartComplement, segmentLabel } from '@/lib/services/recommendationService';
import { formatVnd } from '@/lib/utils/price';

/**
 * Compact "Thường được mua kèm" row inside the cart drawer that opens after "Thêm vào giỏ".
 * Links to the product page (a size / colour has to be picked there before it can be added).
 */
export default function CartComplementsStrip({ cartKey, onNavigate }: { cartKey: string; onNavigate: () => void }) {
  const [items, setItems] = useState<CartComplement[]>([]);

  useEffect(() => {
    if (!cartKey) {
      setItems([]);
      return;
    }
    let cancelled = false;
    RecommendationService.getCartComplements(3).then(result => {
      if (!cancelled) setItems(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cartKey]);

  if (items.length === 0) return null;

  return (
    <div className="mt-6 pt-5 border-t border-slate-100">
      <p className="font-black text-slate-900 text-xs uppercase tracking-widest mb-3">Thường được mua kèm</p>
      <div className="space-y-3">
        {items.map(({ product, segment, source }) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            onClick={onNavigate}
            className="flex gap-3 items-center group"
          >
            <div className="w-14 h-[72px] relative flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <SafeImage
                src={product.images?.[0]?.imageUrl || '/images/products/placeholder.webp'}
                alt={product.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:underline">{product.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {source === 'RULE' ? 'Hay mua kèm' : 'Bán chạy'} · {segmentLabel(segment)}
              </p>
            </div>
            <p className="text-sm font-black text-slate-900 flex-shrink-0">
              {formatVnd(product.salePrice || product.price)}₫
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
