'use client';

import { useState } from 'react';
import { Heart, Truck, RefreshCcw, ShieldCheck, Sparkles, ShoppingBag, Zap, MapPin } from 'lucide-react';
import { Product } from '@/lib/services/productService';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SizeGuideModal from '@/components/products/SizeGuideModal';
import StoreStockModal from '@/components/products/StoreStockModal';

export default function ProductInfo({ product }: { product: Product }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlColor = searchParams.get('color');

  const availableColors = Array.from(new Map((product.variants || []).filter(v => v.colorHex).map(v => [v.colorHex, { name: v.color, hex: v.colorHex, code: v.colorCode }])).values());
  const availableSizes = Array.from(new Set((product.variants || []).filter(v => v.size).map(v => v.size)));

  const stockMap = new Map<string, number>();
  (product.variants || []).forEach(v => {
    if (!v.colorHex || !v.size) return;
    const key = `${v.colorHex}__${v.size}`;
    const s = Math.max(v.stock ?? 0, v.availableQuantity ?? 0);
    const prev = stockMap.get(key) ?? 0;
    if (s > prev) stockMap.set(key, s);
  });

  const initialColor = urlColor 
    ? availableColors.find(c => c.code === urlColor || c.hex?.replace('#', '').toLowerCase() === urlColor.toLowerCase())?.hex 
      || (availableColors.length > 0 ? availableColors[0].hex || '' : '')
    : (availableColors.length > 0 ? availableColors[0].hex || '' : '');

  const [selectedColor, setSelectedColor] = useState<string>(initialColor);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();
  const { addToCart } = useCart();
  const pathname = usePathname();
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);


  const selectedVariant = product.variants?.find(
    v => (v.colorHex === selectedColor || !v.colorHex) && (v.size === selectedSize || !v.size)
  );
  const variantStock = selectedVariant ? Math.max(selectedVariant.stock ?? 0, selectedVariant.availableQuantity ?? 0) : 0;
  const stock = variantStock;
  const isOutOfStock = selectedColor && selectedSize && stock === 0;

  const colorHasStock = (hex: string): boolean => {
    for (const size of availableSizes) {
      if ((stockMap.get(`${hex}__${size}`) ?? 0) > 0) return true;
    }
    return false;
  };
  const sizeHasStockForColor = (colorHex: string, size: string): boolean => {
    return (stockMap.get(`${colorHex}__${size}`) ?? 0) > 0;
  };

  const handleAddToCart = async () => {
    if (!selectedColor && availableColors.length > 0) {
      toast.error('Vui lòng chọn màu sắc.');
      return;
    }
    if (!selectedSize && availableSizes.length > 0) {
      toast.error('Vui lòng chọn kích cỡ.');
      return;
    }
    if (isOutOfStock) {
      toast.error('Sản phẩm tạm hết hàng cho phân loại này.');
      return;
    }
    if (!selectedVariant && product.variants && product.variants.length > 0) {
      toast.error('Phân loại không hợp lệ.');
      return;
    }

    const targetVariantId = selectedVariant ? selectedVariant.id : product.variants?.[0]?.id;
    if (!targetVariantId) {
      toast.error('Không tìm thấy biến thể phù hợp');
      return;
    }

    try {
      await addToCart(targetVariantId as number, quantity);
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng');
    }
  };

  const currentPrice = product.salePrice || product.price;
  const originalPrice = product.salePrice && product.salePrice < product.price ? product.price : undefined;
  const discountPercent = originalPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

  return (
    <>
      <div className="flex flex-col text-slate-900">
        
        {/* Category & Badges */}
        <div className="flex items-center gap-2 mb-2">
          {product.isNew && (
            <span className="bg-black text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
              MỚI
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider flex items-center gap-1">
              -{discountPercent}%
            </span>
          )}
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-auto">
            {product.category?.name || 'THỜI TRANG'}
          </span>
        </div>

        {/* Product Title */}
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase leading-tight mb-3 tracking-tight">
          {product.name}
        </h1>

        {/* Rating & Social Proof summary */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200 text-xs">
          <div className="flex items-center text-black">
            {'★'.repeat(Math.round(product.averageRating || 0))}
            {'☆'.repeat(5 - Math.round(product.averageRating || 0))}
          </div>
          <span className="font-bold text-black">{product.averageRating?.toFixed(1) || '0.0'}/5</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500">{product.totalReviews || 0} đánh giá</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500">Đã bán {product.soldCount || 0}</span>
        </div>

        {/* Price display */}
        <div className="mb-6 flex items-baseline gap-3">
          <span className={`text-2xl md:text-3xl font-bold tracking-tight ${discountPercent > 0 ? 'text-red-600' : 'text-black'}`}>
            {(Math.round(currentPrice / 1000) * 1000).toLocaleString('vi-VN')}₫
          </span>
          {originalPrice && (
            <span className="text-base text-gray-400 line-through">
              {(Math.round(originalPrice / 1000) * 1000).toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>

        {/* Free Shipping Alert Banner */}
        <div className="border border-gray-200 bg-gray-50 p-3 mb-6 flex items-center gap-2.5 text-xs text-black">
          <Truck className="w-4 h-4 shrink-0" />
          <span>Freeship toàn quốc cho đơn hàng từ <strong>499.000đ</strong></span>
        </div>

        {/* Color Picker */}
        {availableColors.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Màu sắc: <span className="text-slate-500 font-semibold">{availableColors.find(c => c.hex === selectedColor)?.name}</span>
              </span>
            </div>
            <div className="flex gap-2.5 flex-wrap">
              {availableColors.map((color, idx) => {
                const hasStock = colorHasStock(color.hex || '');
                return (
                  <button
                    key={idx}
                    disabled={!hasStock}
                    title={hasStock ? color.name : `${color.name} - Hết hàng`}
                    onClick={() => {
                      if (!hasStock) return;
                      setSelectedColor(color.hex || '');
                      setSelectedSize('');
                      setError('');
                      const code = color.code || color.hex?.replace('#', '');
                      if (code) {
                        const newParams = new URLSearchParams(searchParams.toString());
                        newParams.set('color', code);
                        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
                      }
                    }}
                    className={`w-8 h-8 rounded-full border p-0.5 transition-all ${
                      selectedColor === color.hex
                        ? 'border-black'
                        : hasStock
                          ? 'border-transparent hover:border-gray-300'
                          : 'border-transparent opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className="w-full h-full block rounded-full border border-slate-100 shadow-inner"
                      style={{ backgroundColor: color.hex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size Picker */}
        {availableSizes.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Kích cỡ {selectedSize && <span className="text-slate-500 font-semibold">: {selectedSize}</span>}
              </span>
              <button 
                className="text-xs font-bold text-slate-500 hover:text-red-600 underline"
                onClick={() => setShowSizeGuide(true)}
              >
                Hướng dẫn chọn size
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map(size => {
                const hasStock = !selectedColor || sizeHasStockForColor(selectedColor, size);
                return (
                  <button
                    key={size}
                    disabled={!hasStock}
                    onClick={() => {
                      if (!hasStock) return;
                      setSelectedSize(size);
                      setError('');
                    }}
                    className={`min-w-[3.5rem] h-10 px-4 border text-xs uppercase tracking-wider transition-all duration-200 ${
                      selectedSize === size
                        ? 'border-black bg-black text-white font-bold'
                        : !hasStock 
                          ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed opacity-50' 
                          : 'border-gray-300 text-black hover:border-black bg-white'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stock status indicator */}
        {selectedColor && selectedSize && (
          <div className="mb-5 text-xs font-semibold">
            {isOutOfStock ? (
              <span className="text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full">Hết hàng phân loại này</span>
            ) : (
              <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full">Còn {stock} sản phẩm sẵn có</span>
            )}
          </div>
        )}

        {/* Quantity and Actions */}
        <div className="flex flex-col gap-3 mb-8">
          <div className="flex gap-3">
            {/* Quantity Controls */}
            <div className="flex items-center border border-gray-300 h-12">
              <button 
                className="w-10 h-full flex items-center justify-center text-lg text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >-</button>
              <span className="w-12 text-center text-sm font-bold text-black">{quantity}</span>
              <button 
                className="w-10 h-full flex items-center justify-center text-lg text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setQuantity(Math.min(stock || 10, quantity + 1))}
              >+</button>
            </div>

            {/* Add to Cart Button */}
            <button 
              onClick={handleAddToCart}
              className="flex-1 bg-white border border-black hover:bg-gray-50 text-black font-bold uppercase text-xs tracking-widest transition-all duration-300 flex items-center justify-center gap-2 h-12"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Thêm vào giỏ</span>
            </button>
          </div>

          {/* Quick Buy Button */}
          <button 
            onClick={() => {
              handleAddToCart().then(() => {
                window.location.href = '/cart';
              });
            }}
            className="w-full bg-black hover:bg-gray-900 text-white font-bold uppercase text-xs tracking-widest transition-all duration-300 h-12"
          >
            Mua ngay
          </button>
        </div>

        {/* Value Proposition Guarantees */}
        <div className="grid grid-cols-3 gap-2 pt-6 border-t border-gray-200 text-center">
          <div className="flex flex-col items-center p-2">
            <Truck className="w-5 h-5 text-black mb-2 stroke-1" />
            <span className="text-[10px] font-bold text-black uppercase tracking-wider">Freeship từ 499k</span>
          </div>
          <div className="flex flex-col items-center p-2 border-x border-gray-200">
            <RefreshCcw className="w-5 h-5 text-black mb-2 stroke-1" />
            <span className="text-[10px] font-bold text-black uppercase tracking-wider">Đổi trả 30 ngày</span>
          </div>
          <div className="flex flex-col items-center p-2">
            <ShieldCheck className="w-5 h-5 text-black mb-2 stroke-1" />
            <span className="text-[10px] font-bold text-black uppercase tracking-wider">100% Chính hãng</span>
          </div>
        </div>

        {/* Store locator check button */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button 
            type="button"
            onClick={() => setShowStoreModal(true)}
            className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>Xem cửa hàng còn sản phẩm gần bạn</span>
          </button>
        </div>

      </div>

      {/* ET.TEE Size Guide Modal */}
      <SizeGuideModal
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        onSelectSize={(sz) => {
          setSelectedSize(sz);
          setError('');
          toast.success(`Đã tự động chọn Size ${sz}`);
        }}
        defaultCategory={
          product.gender === 'women' || product.targetGroup === 'women'
            ? 'nu'
            : product.gender === 'kids' || product.targetGroup === 'kids'
              ? 'tre-em'
              : 'nam'
        }
      />

      {/* ET.TEE Store Stock Modal */}
      <StoreStockModal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        productName={product.name}
        selectedColor={availableColors.find(c => c.hex === selectedColor)?.name}
        selectedSize={selectedSize}
      />
    </>
  );
}


