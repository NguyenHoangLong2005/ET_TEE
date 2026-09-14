'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function CartDrawer() {
  const { cart, isDrawerOpen, closeDrawer, updateQuantity, removeItem } = useCart();

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/35 backdrop-blur-sm z-40 transition-all duration-300"
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-white shadow-2xl border-l border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-[22px] font-bold uppercase tracking-wide text-gray-900">
            Giỏ hàng của bạn <span className="text-gray-500 font-medium">({cart?.totalQuantity || 0})</span>
          </h2>
          <button 
            onClick={closeDrawer}
            className="p-2 -mr-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!cart || !cart.items || cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-5 animate-in fade-in duration-300">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <p className="text-gray-500 font-medium">Giỏ hàng của bạn đang trống</p>
              <button 
                onClick={closeDrawer}
                className="bg-black text-white px-8 py-3 rounded-md uppercase text-sm font-bold tracking-wider hover:bg-gray-800 transition-colors"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-6 animate-in slide-in-from-right-4 fade-in duration-300">
                  {/* Product Image */}
                  <Link href={`/products/${item.productSlug}`} onClick={closeDrawer} className="w-[100px] h-[132px] relative flex-shrink-0 bg-gray-50 rounded-md overflow-hidden group">
                    <Image 
                      src={item.productImage || '/images/placeholder.webp'} 
                      alt={item.productName}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <Link href={`/products/${item.productSlug}`} onClick={closeDrawer}>
                          <h3 className="font-bold text-gray-900 hover:text-[#e50027] line-clamp-2 text-[15px] leading-snug transition-colors">
                            {item.productName}
                          </h3>
                        </Link>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-gray-300 hover:text-red-500 p-1 -mr-1 transition-colors"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-[18px] h-[18px]" />
                        </button>
                      </div>
                      
                      <div className="mt-2 text-[13px] text-gray-500 flex items-center gap-2">
                        <span>Màu: <span className="font-medium text-gray-700">{item.color}</span></span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>Size: <span className="font-medium text-gray-700">{item.size}</span></span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between mt-4">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-gray-200 rounded-md bg-white">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-[13px] font-bold text-gray-900">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          disabled={item.quantity >= item.availableQuantity}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        {item.salePrice && item.salePrice < item.price ? (
                          <div className="flex flex-col items-end">
                            <p className="text-[#e50027] font-bold text-[15px]">
                              {item.salePrice.toLocaleString('vi-VN')}đ
                            </p>
                            <p className="text-[13px] text-gray-400 line-through mt-0.5">
                              {item.price.toLocaleString('vi-VN')}đ
                            </p>
                          </div>
                        ) : (
                          <p className="font-bold text-gray-900 text-[15px]">
                            {item.price.toLocaleString('vi-VN')}đ
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items && cart.items.length > 0 && (
          <div className="border-t border-gray-100 p-6 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)] flex-shrink-0">
            <div className="flex justify-between items-end mb-6">
              <span className="font-bold text-gray-900 text-lg uppercase tracking-wide">Tổng tiền</span>
              <span className="font-black text-2xl text-[#e50027] tracking-tight">{cart.subtotal.toLocaleString('vi-VN')}đ</span>
            </div>
            
            <div className="flex flex-col gap-3">
              <Link 
                href="/checkout"
                onClick={closeDrawer}
                className="w-full flex items-center justify-center h-12 bg-black text-white rounded-md font-bold uppercase tracking-wider text-sm hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
              >
                Thanh toán
              </Link>
              <Link 
                href="/cart"
                onClick={closeDrawer}
                className="w-full flex items-center justify-center h-12 bg-white border-2 border-gray-200 text-gray-900 rounded-md font-bold uppercase tracking-wider text-sm hover:border-black hover:bg-gray-50 transition-colors"
              >
                Xem giỏ hàng
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
