'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Product } from '@/lib/services/productService';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
export default function ProductInfo({ product }: { product: Product }) {
  // Derive available colors/sizes based on variants
  const availableColors = Array.from(new Map((product.variants || []).filter(v => v.colorHex).map(v => [v.colorHex, { name: v.color, hex: v.colorHex }])).values());
  const availableSizes = Array.from(new Set((product.variants || []).filter(v => v.size).map(v => v.size)));

  // Build a map: per (colorHex, size) -> stock. A color is only selectable
  // if at least one of its sizes has stock. A size is only selectable for
  // the currently-selected color if that exact combination has stock.
  const stockMap = new Map<string, number>();
  (product.variants || []).forEach(v => {
    if (!v.colorHex || !v.size) return;
    const key = `${v.colorHex}__${v.size}`;
    // Use max(stock, availableQuantity) — availableQuantity is the
    // warehouse-availability (post-reservation) view that staff sees.
    const s = Math.max(v.stock ?? 0, v.availableQuantity ?? 0);
    const prev = stockMap.get(key) ?? 0;
    if (s > prev) stockMap.set(key, s);
  });

  const [selectedColor, setSelectedColor] = useState<string>(availableColors.length > 0 ? availableColors[0].hex || '' : '');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();
  const { addToCart } = useCart();
  const pathname = usePathname();
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Find stock for selected variant (color + size)
  const selectedVariant = product.variants?.find(
    v => (v.colorHex === selectedColor || !v.colorHex) && (v.size === selectedSize || !v.size)
  );
  const variantStock = selectedVariant ? Math.max(selectedVariant.stock ?? 0, selectedVariant.availableQuantity ?? 0) : 0;
  const stock = variantStock;
  const isOutOfStock = selectedColor && selectedSize && stock === 0;

  // A color is selectable if at least one of its (color, size) combos has stock > 0
  const colorHasStock = (hex: string): boolean => {
    for (const size of availableSizes) {
      if ((stockMap.get(`${hex}__${size}`) ?? 0) > 0) return true;
    }
    return false;
  };
  // A size is selectable for the selected color if that combo has stock > 0
  const sizeHasStockForColor = (colorHex: string, size: string): boolean => {
    return (stockMap.get(`${colorHex}__${size}`) ?? 0) > 0;
  };

  const handleAddToCart = async () => {
    if (!selectedColor) {
      toast.error('Vui lòng chọn màu sắc.');
      return;
    }
    if (!selectedSize) {
      toast.error('Vui lòng chọn kích cỡ.');
      return;
    }
    if (isOutOfStock) {
      toast.error('Sản phẩm tạm hết hàng cho phân loại này.');
      return;
    }
    if (!selectedVariant) {
      toast.error('Phân loại không hợp lệ.');
      return;
    }

    try {
      await addToCart(selectedVariant.id as number, quantity);
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng');
    }
  };

  const getBadge = () => {
    if (product.isNew) return 'MỚI';
    if (product.isSale) return 'GIẢM GIÁ';
    if (product.isBestSeller) return 'BÁN CHẠY';
    return null;
  };
  const badge = getBadge();

  return (
    <>
      <div className="flex flex-col">
      {/* Badges */}
      {badge && (
        <span className="bg-[#e50027] text-white text-xs font-bold px-2 py-1 uppercase w-max mb-3">
          {badge}
        </span>
      )}
      
      <h1 className="text-2xl font-bold text-gray-900 mb-2 uppercase leading-tight">
        {product.name}
      </h1>
      
      {/* Price */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xl font-bold text-[#e50027]">
          {(product.salePrice || product.price).toLocaleString('vi-VN')} ₫
        </span>
        {product.salePrice && product.salePrice < product.price && (
          <span className="text-gray-500 line-through text-sm">
            {product.price.toLocaleString('vi-VN')} ₫
          </span>
        )}
      </div>

      {/* Colors */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase">
          Màu sắc {selectedColor && `: ${availableColors.find(c => c.hex === selectedColor)?.name}`}
        </h3>
        <div className="flex gap-2 flex-wrap">
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
                }}
                className={`w-10 h-10 rounded-full border-2 p-0.5 transition-all relative ${
                  selectedColor === color.hex
                    ? 'border-black'
                    : hasStock
                      ? 'border-gray-200 hover:border-gray-400'
                      : 'border-gray-200 opacity-40 cursor-not-allowed'
                }`}
              >
                <span
                  className="w-full h-full block rounded-full border border-gray-100"
                  style={{ backgroundColor: color.hex }}
                />
                {!hasStock && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="block w-[140%] h-px bg-gray-500 rotate-45" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sizes */}
      <div className="mb-6">
        <div className="flex justify-between items-end mb-3">
          <h3 className="text-sm font-bold text-gray-900 uppercase">Kích cỡ</h3>
          <button 
            className="text-xs text-gray-500 hover:text-black underline"
            onClick={() => setShowSizeGuide(true)}
          >
            Hướng dẫn chọn size
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map(size => {
            // Thêm logic check xem size này với màu hiện tại có hàng không
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
                className={`min-w-[3rem] h-10 px-3 border flex items-center justify-center font-bold text-sm transition-all ${
                  selectedSize === size
                    ? 'border-black bg-black text-white'
                    : !hasStock 
                      ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed opacity-50 relative after:content-[""] after:absolute after:top-1/2 after:left-0 after:w-full after:h-px after:bg-gray-300 after:-rotate-45' 
                      : 'border-gray-200 text-gray-800 hover:border-gray-400 bg-white'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock Info */}
      <div className="mb-6 text-sm">
        {selectedColor && selectedSize && (
          isOutOfStock ? (
            <span className="text-red-500 font-bold">Hết hàng</span>
          ) : (
            <span className="text-green-600">Còn {stock} sản phẩm</span>
          )
        )}
      </div>

      {/* Error Message */}
      {error && <div className="text-red-500 text-sm mb-4 font-medium">{error}</div>}

      {/* Actions */}
      <div className="flex gap-4 mb-8">
        <div className="flex items-center border border-gray-300 h-12">
          <button 
            className="w-10 h-full flex items-center justify-center text-lg hover:bg-gray-50"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >-</button>
          <span className="w-12 h-full flex items-center justify-center text-sm font-bold">{quantity}</span>
          <button 
            className="w-10 h-full flex items-center justify-center text-lg hover:bg-gray-50"
            onClick={() => setQuantity(Math.min(stock || 10, quantity + 1))}
          >+</button>
        </div>
        
        <button 
          onClick={handleAddToCart}
          className="flex-1 bg-black text-white font-bold uppercase text-sm tracking-wide hover:bg-gray-800 transition-colors h-12"
        >
          Thêm vào giỏ
        </button>

        <button className="w-12 h-12 border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <Heart className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      <button 
        onClick={handleAddToCart}
        className="w-full bg-[#e50027] text-white font-bold uppercase text-sm tracking-wide hover:bg-red-700 transition-colors h-12 mb-8"
      >
        Mua ngay
      </button>

    </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSizeGuide(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-black uppercase tracking-wide text-slate-900">Hướng Dẫn Chọn Kích Cỡ</h2>
              <button 
                onClick={() => setShowSizeGuide(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-500"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="prose prose-sm w-full max-w-none text-slate-700">
                <p className="mb-6 text-sm leading-relaxed">
                  Để chọn được kích cỡ phù hợp nhất, bạn vui lòng đối chiếu số đo chiều cao và cân nặng của mình với bảng tham khảo dưới đây. Nếu số đo của bạn nằm giữa 2 size, ET.TEE khuyên bạn nên chọn size lớn hơn để có trải nghiệm thoải mái nhất.
                </p>
                
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                  <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-slate-900 text-white font-bold">
                      <tr>
                        <th className="py-3 border-r border-slate-700 w-1/3">Kích cỡ (Size)</th>
                        <th className="py-3 border-r border-slate-700 w-1/3">Chiều cao (cm)</th>
                        <th className="py-3 w-1/3">Cân nặng (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 border-r border-gray-200 font-bold text-slate-900">XS</td>
                        <td className="py-3 border-r border-gray-200">150 - 155</td>
                        <td className="py-3">40 - 45</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 border-r border-gray-200 font-bold text-slate-900">S</td>
                        <td className="py-3 border-r border-gray-200">155 - 160</td>
                        <td className="py-3">45 - 50</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 border-r border-gray-200 font-bold text-slate-900">M</td>
                        <td className="py-3 border-r border-gray-200">160 - 165</td>
                        <td className="py-3">50 - 55</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 border-r border-gray-200 font-bold text-slate-900">L</td>
                        <td className="py-3 border-r border-gray-200">165 - 170</td>
                        <td className="py-3">55 - 65</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 border-r border-gray-200 font-bold text-slate-900">XL</td>
                        <td className="py-3 border-r border-gray-200">170 - 175</td>
                        <td className="py-3">65 - 75</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 border-r border-gray-200 font-bold text-slate-900">XXL</td>
                        <td className="py-3 border-r border-gray-200">175 - 180+</td>
                        <td className="py-3">75 - 85+</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 bg-gray-50">
              <button 
                onClick={() => setShowSizeGuide(false)}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-lg transition-colors uppercase tracking-widest text-sm"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
