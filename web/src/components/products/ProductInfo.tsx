'use client';

import { useState } from 'react';
import { formatVnd, roundVnd } from '@/lib/utils/price';
import { Heart, Truck, RefreshCcw, ShieldCheck, Sparkles, ShoppingBag, Zap, MapPin } from 'lucide-react';
import { Product } from '@/lib/services/productService';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { CartService } from '@/lib/services/cartService';
import { toast } from 'sonner';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SizeGuideModal from '@/components/products/SizeGuideModal';
import SizeSuggestionChip from './SizeSuggestionChip';
import StoreStockModal from '@/components/products/StoreStockModal';

// Checkout and the cart check availableQuantity; max(stock, available) showed items as
// in stock that the server then refused.
const sellable = (v: { stock?: number; availableQuantity?: number }) => v.availableQuantity ?? v.stock ?? 0;

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
    const s = sellable(v);
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();
  const { cart, addToCart, closeDrawer, fetchCart } = useCart();
  const pathname = usePathname();
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);


  const selectedVariant = product.variants?.find(
    v => (v.colorHex === selectedColor || !v.colorHex) && (v.size === selectedSize || !v.size)
  );
  const variantStock = selectedVariant ? sellable(selectedVariant) : 0;
  const stock = variantStock;
  const isOutOfStock = Boolean(selectedColor && selectedSize && stock === 0);

  const colorHasStock = (hex: string): boolean => {
    for (const size of availableSizes) {
      if ((stockMap.get(`${hex}__${size}`) ?? 0) > 0) return true;
    }
    return false;
  };
  const sizeHasStockForColor = (colorHex: string, size: string): boolean => {
    return (stockMap.get(`${colorHex}__${size}`) ?? 0) > 0;
  };

  // buyNow: "Mua ngay" must buy exactly the chosen quantity. Adding would stack it on top of
  // a line already in the cart (1 in cart + Mua ngay 1 = 2), so set that line's quantity instead.
  const handleAddToCart = async (buyNow = false): Promise<boolean> => {
    if (isSubmitting) return false;
    if (!selectedColor && availableColors.length > 0) {
      toast.error('Vui lòng chọn màu sắc.');
      return false;
    }
    if (!selectedSize && availableSizes.length > 0) {
      toast.error('Vui lòng chọn kích cỡ.');
      return false;
    }
    if (isOutOfStock) {
      toast.error('Sản phẩm tạm hết hàng cho phân loại này.');
      return false;
    }
    if (!selectedVariant && product.variants && product.variants.length > 0) {
      toast.error('Phân loại không hợp lệ.');
      return false;
    }

    const targetVariantId = selectedVariant ? selectedVariant.id : product.variants?.[0]?.id;
    if (!targetVariantId) {
      toast.error('Không tìm thấy biến thể phù hợp');
      return false;
    }

    const safeQuantity = stock > 0 ? Math.min(quantity, stock) : quantity;
    if (safeQuantity !== quantity) {
      setQuantity(safeQuantity);
    }

    setIsSubmitting(true);
    try {
      const existing = buyNow
        ? cart?.items.find(item => item.variantId === targetVariantId)
        : undefined;
      if (existing) {
        await CartService.updateQuantity(existing.id, safeQuantity);
        await fetchCart();
      } else {
        await addToCart(targetVariantId as number, safeQuantity);
      }
      return true;
    } catch (err: unknown) {
      if (buyNow) toast.error(err instanceof Error ? err.message : 'Không thể cập nhật giỏ hàng');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // The cart charges the chosen variant's price, which may differ from the product's.
  const priceSource = selectedVariant && selectedVariant.price ? selectedVariant : product;
  const currentPrice = priceSource.salePrice || priceSource.price;
  // Compared as displayed (rounded), so a sub-thousand "discount" isn't shown as a sale.
  const originalPrice = priceSource.salePrice && roundVnd(priceSource.salePrice) < roundVnd(priceSource.price) ? priceSource.price : undefined;
  const discountPercent = originalPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

  return (
    <>
      <div className="flex flex-col text-slate-900">
        
        {/* Category & Badges */}
        <div className="flex items-center gap-2 mb-2">
          {product.isNew && (
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              MỚI
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              -{discountPercent}%
            </span>
          )}
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-auto">
            {product.category?.name || 'THỜI TRANG'}
          </span>
        </div>

        {/* Product Title */}
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase leading-tight mb-3 tracking-tight">
          {product.name}
        </h1>

        {/* Rating & Social Proof summary */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 text-xs">
          <div className="flex items-center text-amber-500">
            {'★'.repeat(Math.round(product.averageRating || 0))}
            <span className="text-slate-200">{'★'.repeat(5 - Math.round(product.averageRating || 0))}</span>
          </div>
          <span className="font-bold text-slate-900">{product.averageRating?.toFixed(1) || '0.0'}/5</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">{product.totalReviews || 0} đánh giá</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">Đã bán {product.soldCount || 0}</span>
        </div>

        {/* Price display */}
        <div className="mb-6 flex items-baseline gap-3">
          <span className={`text-2xl md:text-3xl font-black tracking-tight ${discountPercent > 0 ? 'text-primary' : 'text-slate-900'}`}>
            {formatVnd(currentPrice)}₫
          </span>
          {originalPrice && (
            <span className="text-base text-slate-400 line-through font-medium">
              {formatVnd(originalPrice)}₫
            </span>
          )}
        </div>

        {/* Free Shipping Alert Banner */}
        <div className="border border-slate-200 bg-slate-50/70 rounded-2xl p-3.5 mb-6 flex items-center gap-2.5 text-xs text-slate-800">
          <Truck className="w-4 h-4 shrink-0 text-primary" />
          <span>Freeship toàn quốc cho đơn hàng từ <strong className="font-black text-slate-900">499.000₫</strong></span>
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
                    type="button"
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
                    className={`w-9 h-9 rounded-full border-2 p-0.5 transition-all ${
                      selectedColor === color.hex
                        ? 'border-slate-900 scale-105 shadow-sm'
                        : hasStock
                          ? 'border-transparent hover:border-slate-300'
                          : 'border-transparent opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className="w-full h-full block rounded-full border border-slate-200 shadow-inner"
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
                type="button"
                className="text-xs font-bold text-slate-500 hover:text-primary underline transition-colors"
                onClick={() => setShowSizeGuide(true)}
              >
                Hướng dẫn chọn size
              </button>
            </div>
            <SizeSuggestionChip
              slug={product.slug}
              refreshKey={showSizeGuide}
              onSelect={(sz) => {
                // chart labels say 2XL, the catalogue sells XXL
                const match = availableSizes.find(s => s === sz || (sz === '2XL' && s === 'XXL')) ?? sz;
                setSelectedSize(match);
                setError('');
              }}
            />
            <div className="flex flex-wrap gap-2">
              {availableSizes.map(size => {
                const hasStock = !selectedColor || sizeHasStockForColor(selectedColor, size);
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!hasStock}
                    onClick={() => {
                      if (!hasStock) return;
                      setSelectedSize(size);
                      setError('');
                      const nextStock = stockMap.get(`${selectedColor}__${size}`) ?? 0;
                      if (nextStock > 0 && quantity > nextStock) {
                        setQuantity(nextStock);
                      }
                    }}
                    className={`min-w-[3.5rem] h-10 px-4 border rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      selectedSize === size
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : !hasStock 
                          ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed opacity-50' 
                          : 'border-slate-200 text-slate-800 hover:border-slate-900 bg-white'
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
              <span className="text-primary font-bold bg-red-50 px-3 py-1 rounded-full">Hết hàng phân loại này</span>
            ) : (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full">Còn {stock} sản phẩm sẵn có</span>
            )}
          </div>
        )}

        {/* Quantity and Actions */}
        <div className="flex flex-col gap-3 mb-8">
          <div className="flex gap-3">
            {/* Quantity Controls */}
            <div className="flex items-center border border-slate-200 rounded-xl h-12 bg-slate-50/50">
              <button 
                type="button"
                disabled={quantity <= 1}
                aria-label="Giảm số lượng"
                className="w-10 h-full flex items-center justify-center text-lg text-slate-600 hover:bg-slate-200/60 rounded-l-xl transition-colors disabled:opacity-30"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >-</button>
              <span className="w-12 text-center text-sm font-black text-slate-900">{quantity}</span>
              <button 
                type="button"
                disabled={stock > 0 ? quantity >= stock : quantity >= 10}
                aria-label="Tăng số lượng"
                className="w-10 h-full flex items-center justify-center text-lg text-slate-600 hover:bg-slate-200/60 rounded-r-xl transition-colors disabled:opacity-30"
                onClick={() => setQuantity(Math.min(stock || 10, quantity + 1))}
              >+</button>
            </div>

            {/* Add to Cart Button */}
            <button 
              type="button"
              disabled={isSubmitting || isOutOfStock}
              onClick={() => handleAddToCart()}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-full font-black uppercase text-xs tracking-widest transition-all duration-300 flex items-center justify-center gap-2 h-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang thêm...' : 'Thêm vào giỏ'}</span>
            </button>
          </div>

          {/* Quick Buy Button */}
          <button 
            type="button"
            disabled={isSubmitting || isOutOfStock}
            onClick={async () => {
              const success = await handleAddToCart(true);
              if (success) {
                closeDrawer();
                router.push('/checkout');
              }
            }}
            className="w-full bg-primary hover:bg-primary-hover text-white rounded-full font-black uppercase text-xs tracking-widest transition-all duration-300 h-12 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mua ngay
          </button>
        </div>

        {/* Value Proposition Guarantees */}
        <div className="grid grid-cols-3 gap-2 pt-6 border-t border-slate-100 text-center">
          <div className="flex flex-col items-center p-2">
            <Truck className="w-5 h-5 text-slate-800 mb-2 stroke-1" />
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Freeship từ 499k</span>
          </div>
          <div className="flex flex-col items-center p-2 border-x border-slate-100">
            <RefreshCcw className="w-5 h-5 text-slate-800 mb-2 stroke-1" />
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Đổi trả 30 ngày</span>
          </div>
          <div className="flex flex-col items-center p-2">
            <ShieldCheck className="w-5 h-5 text-slate-800 mb-2 stroke-1" />
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">100% Chính hãng</span>
          </div>
        </div>

        {/* Store locator check button */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button 
            type="button"
            onClick={() => setShowStoreModal(true)}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
        productSlug={product.slug}
        onSelectSize={(sz) => {
          setSelectedSize(availableSizes.find(s => s === sz || (sz === '2XL' && s === 'XXL')) ?? sz);
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


