'use client';

import { useEffect, useState } from 'react';
import { marketingService, type ProductPlacement } from '@/lib/services/marketingService';

interface ProductLite {
  id: number | string;
  slug?: string;
  name: string;
  image?: string;
  price?: number;
  salePrice?: number;
}

interface MarketingCarouselProps {
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  bgColor?: string;
  /** placementKey to read public placements from. If placements exist, use them; else fall back to products. */
  placementKey: string;
  fallback: ProductLite[];
}

/**
 * Client-side carousel that prefers marketing-managed placements over default product lists.
 * Public API /api/marketing/public/placements returns ordered placements; for each, the storefront
 * loads product detail by ID and renders it.
 */
export default function MarketingCarousel({
  title,
  subtitle,
  viewAllLink,
  bgColor = 'bg-white',
  placementKey,
  fallback,
}: MarketingCarouselProps) {
  const [products, setProducts] = useState<ProductLite[]>(fallback);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'placement' | 'fallback'>('fallback');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await marketingService.getPublicPlacements(placementKey);
        const placements: ProductPlacement[] = res.data || [];
        const active = placements.filter((p) => (p.status || 'ACTIVE') === 'ACTIVE');
        if (active.length === 0) return;
        const ids = active.map((p) => p.productId).filter(Boolean);
        if (ids.length === 0) return;
        const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';
        const fetches = await Promise.allSettled(
          ids.map((id) =>
            fetch(`${API}/api/products/${id}`).then((r) => (r.ok ? r.json() : null))
          )
        );
        if (!mounted) return;
        const products: ProductLite[] = fetches
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value?.data)
          .map((r) => {
            const d = r.value.data;
            return {
              id: d.id,
              slug: d.slug,
              name: d.name,
              price: d.price,
              salePrice: d.salePrice,
              image: d.images?.[0]?.imageUrl || d.imageUrl,
            } as ProductLite;
          });
        if (products.length > 0) {
          setProducts(products);
          setSource('placement');
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [placementKey]);

  if (products.length === 0 && !loading) return null;

  return (
    <section className={`${bgColor} py-8`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-4 gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p> : null}
          </div>
          {viewAllLink ? (
            <a href={viewAllLink} className="text-[12.5px] font-semibold text-slate-700 hover:text-slate-900 whitespace-nowrap">
              Xem tất cả →
            </a>
          ) : null}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {products.map((p) => (
            <a
              key={p.id}
              href={p.slug ? `/products/${p.slug}` : `/products/${p.id}`}
              className="group min-w-[180px] max-w-[220px] flex-shrink-0 snap-start"
            >
              <div className="aspect-[3/4] bg-slate-100 rounded-md overflow-hidden border border-slate-200">
                {p.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : null}
              </div>
              <div className="mt-2">
                <div className="text-[13px] font-medium text-slate-900 line-clamp-2">{p.name}</div>
                <div className="mt-1 text-[12.5px]">
                  {p.salePrice ? (
                    <>
                      <span className="text-red-600 font-semibold">{Number(p.salePrice).toLocaleString('vi-VN')}đ</span>
                      <span className="ml-2 text-slate-400 line-through text-[11px]">{Number(p.price || 0).toLocaleString('vi-VN')}đ</span>
                    </>
                  ) : (
                    <span className="text-slate-700 font-semibold">{Number(p.price || 0).toLocaleString('vi-VN')}đ</span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
        {source === 'placement' ? (
          <div className="mt-3 text-[11px] text-slate-400 uppercase tracking-wider">Đang hiển thị theo sắp xếp của Marketing</div>
        ) : null}
      </div>
    </section>
  );
}
