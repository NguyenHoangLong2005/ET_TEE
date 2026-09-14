'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import CartRecommendations from '@/components/cart/CartRecommendations';
import { toast } from 'sonner';

export default function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const [voucherCode, setVoucherCode] = useState('');
  
  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    toast.info('Tính năng mã giảm giá sẽ được hoàn thiện sau.');
  };

    // No login requirement for guest carts anymore
    // (We rely on Guest Token and JWT handled transparently in Context and CartService)

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  const isEmpty = !cart || !cart.items || cart.items.length === 0;

  return (
    <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:text-black transition-colors">Trang chủ</Link>
          </li>
          <li><span>/</span></li>
          <li className="text-gray-900 font-medium">Giỏ hàng</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900 mb-8 lg:mb-12">
        Giỏ hàng của bạn {cart && !isEmpty && <span className="text-gray-400 font-medium ml-2">({cart.totalQuantity})</span>}
      </h1>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mb-16">
          <div className="w-24 h-24 bg-white shadow-sm rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng của bạn đang trống</h2>
          <p className="text-gray-500 mb-8">Khám phá các sản phẩm mới nhất của ET.TEE</p>
          <Link 
            href="/products"
            className="bg-black text-white px-8 py-3.5 rounded-md font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            Tiếp tục mua sắm
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mb-16">
          {/* Item List (Left) */}
          <div className="flex-1">
            <div className="hidden lg:grid grid-cols-12 gap-4 pb-4 border-b border-gray-200 text-sm font-bold text-gray-500 uppercase tracking-wide">
              <div className="col-span-6">Sản phẩm</div>
              <div className="col-span-3 text-center">Số lượng</div>
              <div className="col-span-3 text-right">Tổng cộng</div>
            </div>

            <div className="divide-y divide-gray-100">
              {cart.items.map((item) => (
                <div key={item.id} className="py-6 flex flex-col sm:flex-row gap-4 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center group">
                  {/* Product Info */}
                  <div className="col-span-6 flex gap-4">
                    <Link href={`/products/${item.productSlug}`} className="w-24 h-[128px] sm:w-[120px] sm:h-[160px] relative bg-gray-50 rounded-md overflow-hidden flex-shrink-0">
                      <Image 
                        src={item.productImage || '/images/placeholder.webp'}
                        alt={item.productName}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                    <div className="flex flex-col justify-center">
                      <Link href={`/products/${item.productSlug}`}>
                        <h3 className="font-bold text-gray-900 hover:text-[#e50027] text-base mb-1 line-clamp-2 pr-4 transition-colors">
                          {item.productName}
                        </h3>
                      </Link>
                      <div className="text-sm text-gray-500 space-y-1 mb-2">
                        <p>Màu: <span className="font-medium text-gray-900">{item.color}</span></p>
                        <p>Size: <span className="font-medium text-gray-900">{item.size}</span></p>
                      </div>
                      <div className="lg:hidden text-sm mt-1">
                        {item.salePrice && item.salePrice < item.price ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#e50027]">{item.salePrice.toLocaleString('vi-VN')}đ</span>
                            <span className="text-gray-400 line-through text-xs">{item.price.toLocaleString('vi-VN')}đ</span>
                          </div>
                        ) : (
                          <span className="font-bold text-gray-900">{item.price.toLocaleString('vi-VN')}đ</span>
                        )}
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1 mt-3 w-max transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Mobile price row & quantity */}
                  <div className="flex items-center justify-between sm:hidden mt-2">
                    <div className="flex items-center border border-gray-200 rounded-md bg-white">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        disabled={item.quantity >= item.availableQuantity}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-black text-lg text-gray-900">{item.itemTotal.toLocaleString('vi-VN')}đ</span>
                  </div>

                  {/* Desktop Quantity */}
                  <div className="hidden sm:flex lg:col-span-3 items-center lg:justify-center">
                    <div className="flex items-center border border-gray-200 rounded-md bg-white">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        disabled={item.quantity >= item.availableQuantity}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Desktop Total */}
                  <div className="hidden lg:block lg:col-span-3 text-right">
                    <span className="font-black text-lg text-gray-900">{item.itemTotal.toLocaleString('vi-VN')}đ</span>
                    {item.salePrice && item.salePrice < item.price && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        Tiết kiệm {(item.price - item.salePrice).toLocaleString('vi-VN')}đ
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary (Right) */}
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <div className="bg-gray-50 rounded-xl p-6 lg:p-8 sticky top-24 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide mb-6">Tóm tắt đơn hàng</h2>
              
              <div className="space-y-4 text-sm mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Tạm tính ({cart.totalQuantity} sản phẩm)</span>
                  <span className="font-medium text-gray-900">{cart.subtotal.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Khuyến mãi</span>
                  <span className="font-medium text-gray-900">0đ</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Phí giao hàng</span>
                  <span className="font-medium text-gray-900 italic text-xs">Tính khi thanh toán</span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8">
                <span className="font-bold text-gray-900 uppercase">Tổng cộng</span>
                <div className="text-right">
                  <span className="font-black text-2xl text-[#e50027]">{cart.subtotal.toLocaleString('vi-VN')}đ</span>
                  <p className="text-xs text-gray-500 mt-1">(Đã bao gồm VAT)</p>
                </div>
              </div>

              {/* Voucher */}
              <form onSubmit={handleApplyVoucher} className="mb-8">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2 tracking-wide">Mã giảm giá</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nhập mã..." 
                    className="flex-1 h-12 px-4 border border-gray-300 rounded-md focus:border-black focus:ring-1 focus:ring-black outline-none transition-all uppercase placeholder:normal-case text-sm font-medium"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  />
                  <button 
                    type="submit"
                    className="h-12 px-6 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-md transition-colors text-sm uppercase tracking-wide disabled:opacity-50"
                    disabled={!voucherCode.trim()}
                  >
                    Áp dụng
                  </button>
                </div>
              </form>

              <Link 
                href="/checkout"
                className="w-full flex items-center justify-center h-14 bg-black text-white rounded-md font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
              >
                Tiến hành thanh toán
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="border-t border-gray-100 pt-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">Có thể bạn sẽ thích</h2>
          <p className="text-gray-500 mt-2">Những sản phẩm được gợi ý riêng cho bạn</p>
        </div>
        <CartRecommendations cartItems={cart?.items || []} />
      </div>
    </div>
  );
}
