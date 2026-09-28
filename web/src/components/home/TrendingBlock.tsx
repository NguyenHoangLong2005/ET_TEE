'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/api-config';

type TrendingProduct = {
  productId: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  productUrl: string;
};

export default function TrendingBlock() {
  const [product, setProduct] = useState<TrendingProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/marketing/trending`);
        if (!res.ok) throw new Error('Failed to fetch trending');
        const data = await res.json();
        if (data.success && data.data) {
          setProduct(data.data);
        }
      } catch (err) {
        console.error('Error fetching trending:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' VND';
  };

  // Background image - try product image first, fallback to local
  const backgroundImage = product?.imageUrl || '/images/banners/home/banner-1.webp';

  if (loading) {
    return (
      <section className="relative w-full h-[600px] md:h-[700px] bg-slate-200 animate-pulse overflow-hidden">
        <div className="absolute inset-0 bg-slate-300" />
      </section>
    );
  }

  if (error || !product) {
    // Static fallback - keep for demo if API fails
    return (
      <section className="relative w-full h-[600px] md:h-[700px] bg-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/banners/home/banner-1.webp"
          alt="Trending"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
        <div className="relative h-full container mx-auto px-4 xl:px-8 flex flex-col justify-end pb-20 md:pb-32">
          <div className="max-w-2xl text-white">
            <span className="inline-block bg-black text-white text-[10px] md:text-xs font-bold tracking-widest uppercase px-3 py-1 mb-4">
              Trending
            </span>
            <h2 className="text-3xl md:text-5xl font-normal tracking-tight mb-3">
              Bộ Sưu Tập Mới
            </h2>
            <p className="text-sm md:text-base text-slate-200 mb-6 max-w-xl">
              Khám phá những sản phẩm hot nhất mùa thu đông 2026
            </p>
            <Link 
              href="/products" 
              className="bg-white text-black text-sm md:text-base font-bold px-6 py-3 hover:bg-slate-100 transition-colors hidden sm:inline-block"
            >
              MUA NGAY
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full h-[600px] md:h-[700px] bg-slate-100 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={backgroundImage}
        alt={product.name}
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Dark overlay for text readability on the left */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 xl:px-8 flex flex-col justify-end pb-20 md:pb-32">
        <div className="max-w-2xl text-white">
          <span className="inline-block bg-black text-white text-[10px] md:text-xs font-bold tracking-widest uppercase px-3 py-1 mb-4">
            Trending
          </span>
          
          <h2 className="text-3xl md:text-5xl font-normal tracking-tight mb-3">
            {product.name}
          </h2>
          
          <p className="text-sm md:text-base text-slate-200 mb-6 max-w-xl">
            Sản phẩm hot nhất mùa thu đông 2026 tại ET.TEE
          </p>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {product.salePrice ? (
                <>
                  <span className="text-3xl md:text-4xl font-bold tracking-tighter text-rose-400">
                    {formatPrice(product.salePrice)}
                  </span>
                  <span className="text-lg md:text-xl font-medium line-through text-slate-400">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-3xl md:text-4xl font-bold tracking-tighter">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
            <Link 
              href={product.productUrl} 
              className="bg-white text-black text-sm md:text-base font-bold px-6 py-3 hover:bg-slate-100 transition-colors hidden sm:block"
            >
              MUA NGAY
            </Link>
          </div>
          <Link 
            href={product.productUrl} 
            className="bg-white text-black text-sm font-bold px-6 py-3 hover:bg-slate-100 transition-colors mt-6 inline-block sm:hidden w-max"
          >
            MUA NGAY
          </Link>
        </div>
      </div>
    </section>
  );
}

