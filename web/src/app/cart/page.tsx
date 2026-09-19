'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Sparkles, ShieldCheck } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import CartRecommendations from '@/components/cart/CartRecommendations';
import { toast } from 'sonner';

const FREE_SHIPPING_THRESHOLD = 499000;

export default function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const [voucherCode, setVoucherCode] = useState('');
  
  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    toast.info('Tính năng mã giảm giá sẽ được hoàn thiện sau.');
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  const subtotal = cart?.subtotal || 0;
  const shippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountNeeded = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 text-slate-900">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 mb-6">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:text-slate-900 transition-colors">Trang chủ</Link>
          </li>
          <li><span>/</span></li>
          <li className="text-slate-900 font-bold">Giỏ hàng của tôi</li>
        </ol>
      </nav>

      <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-8 flex items-center gap-3">
        <span>Giỏ hàng</span>
        {cart && !isEmpty && (
          <span className="text-xs md:text-sm font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            {cart.totalQuantity} sản phẩm
          </span>
        )}
      </h1>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200 mb-16 text-center">
          <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mb-6">
            <ShoppingBag className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Giỏ hàng của bạn đang trống</h2>
          <p className="text-slate-500 text-sm mb-8 max-w-sm">
            Hãy khám phá các thiết kế thời trang mới nhất từ ET.TEE Studio
          </p>
          <Link 
            href="/products"
            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <span>Tiếp tục mua sắm</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mb-16 items-start">
          {/* Item List (Left) */}
          <div className="flex-1 w-full">
            
            {/* Free Shipping Progress Bar Banner */}
            <div className="bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border border-red-100 p-4 rounded-2xl mb-8">
              <div className="flex items-center justify-between text-xs font-bold text-red-900 mb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-red-600" />
                  {amountNeeded > 0 ? (
                    <span>
                      Thêm <strong className="text-red-600 font-black">{amountNeeded.toLocaleString('vi-VN')}₫</strong> để được <strong>FREESHIP TOÀN QUỐC</strong>
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-black flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Chúc mừng! Bạn đã đạt điều kiện MIỄN PHÍ GIAO HÀNG
                    </span>
                  )}
                </div>
                <span className="text-slate-500">{shippingProgress}%</span>
              </div>
              <div className="w-full bg-red-200/50 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-600 to-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${shippingProgress}%` }}
                />
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-12 gap-4 pb-4 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-wider">
              <div className="col-span-6">Sản phẩm</div>
              <div className="col-span-3 text-center">Số lượng</div>
              <div className="col-span-3 text-right">Tổng cộng</div>
            </div>

            <div className="divide-y divide-slate-100">
              {cart.items.map((item) => (
                <div key={item.id} className="py-6 flex flex-col sm:flex-row gap-4 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center group">
                  {/* Product Info */}
                  <div className="col-span-6 flex gap-4">
                    <Link href={`/products/${item.productSlug}`} className="w-24 h-[120px] relative bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                      <Image 
                        src={item.productImage || '/images/placeholder.webp'}
                        alt={item.productName}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                    <div className="flex flex-col justify-center">
                      <Link href={`/products/${item.productSlug}`}>
                        <h3 className="font-bold text-slate-900 hover:text-red-600 text-sm md:text-base mb-1 line-clamp-2 transition-colors">
                          {item.productName}
                        </h3>
                      </Link>
                      <div className="text-xs text-slate-500 space-y-0.5 mb-2">
                        <p>Màu: <span className="font-bold text-slate-900">{item.color}</span></p>
                        <p>Size: <span className="font-bold text-slate-900">{item.size}</span></p>
                      </div>
                      <div className="lg:hidden text-xs mt-1">
                        {item.salePrice && item.salePrice < item.price ? (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-red-600">{item.salePrice.toLocaleString('vi-VN')}₫</span>
                            <span className="text-slate-400 line-through text-[11px]">{item.price.toLocaleString('vi-VN')}₫</span>
                          </div>
                        ) : (
                          <span className="font-black text-slate-900">{item.price.toLocaleString('vi-VN')}₫</span>
                        )}
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 mt-2 w-max transition-colors font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Desktop Quantity Controls */}
                  <div className="hidden sm:flex lg:col-span-3 items-center lg:justify-center">
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-l-xl transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-r-xl transition-colors"
                        disabled={item.quantity >= item.availableQuantity}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Desktop Total */}
                  <div className="hidden lg:block lg:col-span-3 text-right">
                    <span className="font-black text-base text-slate-900">{item.itemTotal.toLocaleString('vi-VN')}₫</span>
                    {item.salePrice && item.salePrice < item.price && (
                      <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                        Tiết kiệm {((item.price - item.salePrice) * item.quantity).toLocaleString('vi-VN')}₫
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary (Right Card) */}
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <div className="bg-slate-50 rounded-2xl p-6 lg:p-7 sticky top-24 border border-slate-200 shadow-sm">
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider mb-6 pb-3 border-b border-slate-200">
                Tóm tắt đơn hàng
              </h2>
              
              <div className="space-y-3.5 text-xs mb-6 pb-6 border-b border-slate-200">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Tạm tính ({cart.totalQuantity} sản phẩm)</span>
                  <span className="font-bold text-slate-900">{cart.subtotal.toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-bold text-slate-900">
                    {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                      <span className="text-emerald-600 font-black">MIỄN PHÍ</span>
                    ) : (
                      'Tính khi thanh toán'
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8">
                <div>
                  <span className="font-black text-slate-900 uppercase text-xs tracking-wider block">Tổng thanh toán</span>
                  <span className="text-[10px] text-slate-400 font-medium">(Đã bao gồm VAT)</span>
                </div>
                <span className="font-black text-2xl text-red-600 tracking-tight">{cart.subtotal.toLocaleString('vi-VN')}₫</span>
              </div>

              {/* Voucher */}
              <form onSubmit={handleApplyVoucher} className="mb-6">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-2 tracking-wider">Mã giảm giá</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Mã voucher..." 
                    className="flex-1 h-11 px-4 border border-slate-300 rounded-xl focus:border-slate-900 outline-none text-xs font-bold uppercase placeholder:normal-case bg-white"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  />
                  <button 
                    type="submit"
                    className="h-11 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider disabled:opacity-50 transition-colors"
                    disabled={!voucherCode.trim()}
                  >
                    Áp dụng
                  </button>
                </div>
              </form>

              <Link 
                href="/checkout"
                className="w-full flex items-center justify-center h-13 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg hover:shadow-red-600/30 gap-2"
              >
                <span>Tiến hành thanh toán</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Bảo mật thanh toán 100%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="border-t border-slate-100 pt-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Có thể bạn sẽ thích</h2>
          <p className="text-slate-500 text-xs mt-1 font-medium">Những đề xuất trang phục được lựa chọn bởi AI</p>
        </div>
        <CartRecommendations cartItems={cart?.items || []} />
      </div>
    </div>
  );
}

