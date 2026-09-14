'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { toast } from 'sonner';
import { useState } from 'react';

interface ProductCardProps {
  id: string;        // slug – used for URL links only
  productId?: number; // numeric DB id – used for wishlist
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  hoverImage?: string;
  category: string;
  isNew?: boolean;
  colors?: ({ hex: string; name: string } | string)[];
  sizes?: string[];
}

export default function ProductCard({
  id,
  productId,
  name,
  price,
  originalPrice,
  image,
  hoverImage,
  isNew,
  colors,
  sizes = [],
}: ProductCardProps) {
  const isSale = originalPrice && originalPrice > price;
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isLoading, setIsLoading] = useState(false);
  // Use numeric productId for wishlist; Number(slug) would produce NaN
  const numericId = productId ?? NaN;
  const inWishlist = !isNaN(numericId) && isInWishlist(numericId);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (isNaN(numericId)) {
      toast.error('Không thể cập nhật yêu thích: thiếu ID sản phẩm');
      return;
    }
    setIsLoading(true);
    try {
      if (inWishlist) {
        const result = await removeFromWishlist(numericId);
        if (result.success) {
          toast.success('Đã xóa khỏi mục yêu thích');
        } else {
          toast.error(result.message || 'Không thể xóa yêu thích lúc này');
        }
      } else {
        const result = await addToWishlist(numericId);
        if (result.success) {
          toast.success('Đã thêm vào mục yêu thích');
        } else {
          toast.error(result.message || 'Không thể thêm yêu thích lúc này');
        }
      }
    } catch {
      // Fallback guard – addToWishlist/removeFromWishlist should never throw,
      // but this ensures we never get an unhandled rejection.
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group flex flex-col w-full h-full text-slate-900">
      {/* Image container */}
      <Link href={`/products/${id}`} className="relative aspect-[3/4] bg-gray-50 overflow-hidden mb-3">
        {/* Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {isNew && (
            <span className="bg-white text-slate-900 text-[10px] font-bold tracking-widest uppercase px-2 py-1 shadow-sm">
              MỚI
            </span>
          )}
          {isSale && (
            <span className="bg-[#e50027] text-white text-[10px] font-bold tracking-widest uppercase px-2 py-1 shadow-sm">
              SALE
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button 
          onClick={handleWishlistToggle}
          disabled={isLoading}
          className={`absolute top-2 right-2 z-10 p-2 bg-white rounded-full transition-all shadow-sm ${inWishlist ? 'text-[#e50027] opacity-100 translate-y-0' : 'text-slate-400 hover:text-[#e50027] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'}`}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-[#e50027]' : ''}`} />
        </button>

        {/* Primary Image */}
        <Image
          src={image}
          alt={name}
          fill
          className={`object-cover object-center transition-opacity duration-500 ${hoverImage ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Hover Image */}
        {hoverImage && (
          <Image
            src={hoverImage}
            alt={`${name} - alternate view`}
            fill
            className="object-cover object-center absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-100 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}

        {/* Quick Add overlay */}
        {sizes.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
            <div className="bg-white/90 backdrop-blur-sm p-2 shadow-sm flex flex-wrap justify-center gap-1.5">
              {sizes.slice(0, 5).map((size, idx) => (
                <button key={idx} className="w-8 h-8 flex items-center justify-center text-[11px] font-bold border border-gray-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-colors">
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </Link>

      {/* Info container */}
      <div className="flex flex-col flex-1 px-1">
        {/* Colors */}
        {colors && colors.length > 1 && (
          <div className="flex items-center gap-1 mb-2">
            {colors.slice(0, 4).map((c, i) => {
              // Support both old (string hex) and new ({hex,name}) shape.
              const hex = typeof c === 'string' ? c : c.hex;
              const title = typeof c === 'string' ? undefined : c.name;
              return (
                <div
                  key={i}
                  title={title}
                  className="w-3 h-3 rounded-[2px] border border-gray-300"
                  style={{ backgroundColor: hex }}
                />
              );
            })}
            {colors.length > 4 && <span className="text-[10px] text-gray-400 ml-1">+{colors.length - 4}</span>}
          </div>
        )}

        {/* Name */}
        <Link href={`/products/${id}`} className="text-xs md:text-[13px] font-semibold text-slate-800 leading-tight mb-2 hover:underline line-clamp-2">
          {name}
        </Link>

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2">
          <span className={`font-black tracking-tight ${isSale ? 'text-[#e50027] text-sm md:text-base' : 'text-slate-900 text-sm md:text-base'}`}>
            {price.toLocaleString('vi-VN')}₫
          </span>
          {isSale && (
            <span className="text-[11px] md:text-xs text-slate-400 line-through">
              {originalPrice.toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
