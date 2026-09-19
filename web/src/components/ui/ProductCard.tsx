'use client';

import Link from 'next/link';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { toast } from 'sonner';
import { useState } from 'react';
import { getValidProductImage } from '@/lib/utils/imageUtils';

interface ProductCardProps {
  id: string;        // slug – used for URL links only
  productId?: number; // numeric DB id – used for wishlist
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  hoverImage?: string;
  category?: string | { id?: number | string; name?: string };
  isNew?: boolean;
  colors?: ({ hex: string; code?: string; name: string } | string)[];
  images?: { imageUrl: string; colorCode?: string; isPrimary?: boolean }[];
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
  category,
  isNew,
  colors,
  images,
  sizes = [],
}: ProductCardProps) {
  const [hoverColorCode, setHoverColorCode] = useState<string | null>(null);
  const displayCategory = typeof category === 'string' 
    ? category 
    : (category?.name || 'Thời trang');

  const isSale = originalPrice && originalPrice > price;
  const discountPercent = isSale ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isLoading, setIsLoading] = useState(false);
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
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayImage = () => {
    if (hoverColorCode && images) {
      const match = images.find(img => img.colorCode === hoverColorCode);
      if (match) return match.imageUrl;
    }
    return getValidProductImage({ image, name, category: displayCategory, productId }, 0);
  };

  const validImage = getDisplayImage();
  const validHoverImage = hoverImage && hoverImage !== validImage && !hoverColorCode ? hoverImage : undefined;

  return (
    <div className="group flex flex-col w-full h-full bg-white transition-all duration-300">
      {/* Image container */}
      <Link href={`/products/${id}`} className="relative aspect-[3/4] bg-slate-50 block">
        {/* Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
          {isNew && (
            <span className="bg-black text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1">
              MỚI
            </span>
          )}
          {isSale && (
            <span className="bg-red-600 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button 
          onClick={handleWishlistToggle}
          disabled={isLoading}
          className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-opacity duration-300 ${
            inWishlist 
              ? 'bg-white text-black opacity-100' 
              : 'bg-white text-gray-400 hover:text-black opacity-0 group-hover:opacity-100'
          }`}
          aria-label="Yêu thích"
        >
          <Heart className={`w-4 h-4 transition-transform duration-200 ${inWishlist ? 'fill-black stroke-none' : ''}`} />
        </button>

        {/* Primary Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={validImage}
          alt={name}
          className={`w-full h-full object-cover object-center transition-opacity duration-500 ease-out ${
            validHoverImage ? 'group-hover:opacity-0' : ''
          }`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/men/tshirt/ao-phong-nam-cotton-usa-basic-co-tron-sw001.webp';
          }}
        />

        {/* Hover Image */}
        {validHoverImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={validHoverImage}
            alt={`${name} - alternate view`}
            className="w-full h-full object-cover object-center absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </Link>

      {/* Info container */}
      <div className="flex flex-col flex-1 py-3 bg-white">
        {/* Colors swatches */}
        {colors && colors.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            {colors.slice(0, 5).map((c, i) => {
              const hex = typeof c === 'string' ? c : c.hex;
              const title = typeof c === 'string' ? undefined : c.name;
              const code = typeof c === 'string' ? undefined : c.code;
              return (
                <div
                  key={i}
                  title={title}
                  onMouseEnter={() => code && setHoverColorCode(code)}
                  onMouseLeave={() => setHoverColorCode(null)}
                  className={`w-3 h-3 rounded-full border transition-all cursor-pointer ${
                    hoverColorCode === code ? 'border-black ring-1 ring-black ring-offset-1' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
            {colors.length > 5 && (
              <span className="text-[10px] font-medium text-slate-400 ml-0.5">
                +{colors.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Category tag */}
        <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1">
          {displayCategory}
        </div>

        {/* Name */}
        <Link 
          href={`/products/${id}`} 
          className="text-xs md:text-sm font-semibold text-slate-900 leading-snug hover:text-red-600 transition-colors line-clamp-2 mb-3"
        >
          {name}
        </Link>


        {/* Price */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-sm md:text-base font-bold ${discountPercent > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {(Math.round(price / 1000) * 1000).toLocaleString('vi-VN')}₫
          </span>
          {originalPrice && (
            <span className="text-xs text-slate-400 line-through">
              {(Math.round(originalPrice / 1000) * 1000).toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

