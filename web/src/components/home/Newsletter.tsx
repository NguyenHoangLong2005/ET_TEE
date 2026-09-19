'use client';

import { Mail, Gift, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast.success('Đăng ký nhận tin thành công! Voucher 10% đã gửi vào email.');
    setEmail('');
  };

  return (
    <section className="py-16 md:py-24 bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 xl:px-8">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase mb-4">
            ĐĂNG KÝ NHẬN BẢN TIN
          </h2>
          <p className="text-gray-600 text-sm md:text-base mb-8 max-w-md leading-relaxed">
            Nhận ngay voucher giảm 10% cho đơn hàng đầu tiên. Cập nhật sớm nhất về các bộ sưu tập mới và ưu đãi độc quyền.
          </p>

          {/* Subscribe Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col sm:flex-row gap-3">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Địa chỉ email của bạn" 
              className="flex-1 h-12 px-4 bg-white border border-gray-300 text-black placeholder:text-gray-400 outline-none focus:border-black text-sm transition-colors"
              required
            />
            <button 
              type="submit"
              className="h-12 px-8 bg-black hover:bg-gray-800 text-white font-bold text-sm uppercase tracking-wider transition-colors shrink-0"
            >
              Đăng ký
            </button>
          </form>

          <p className="text-[11px] text-gray-500 mt-6">
            Bằng cách đăng ký, bạn đồng ý với <a href="/privacy" className="underline hover:text-black transition-colors">Chính sách bảo mật</a> của chúng tôi.
          </p>
        </div>
      </div>
    </section>
  );
}

