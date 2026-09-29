'use client';

import { Mail, Gift, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // There is no newsletter backend (no subscriber storage, no voucher
    // auto-issued/emailed on signup) - this used to claim a voucher had
    // been sent when nothing was stored or sent anywhere. Until that exists,
    // don't promise a delivery that never happens.
    toast.info('Cảm ơn bạn đã quan tâm! Tính năng đăng ký nhận bản tin đang được hoàn thiện.');
    setEmail('');
  };

  return (
    <section className="py-16 md:py-24 bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-4 xl:px-8">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase mb-4">
            ĐĂNG KÝ NHẬN BẢN TIN
          </h2>
          <p className="text-slate-600 text-sm md:text-base mb-8 max-w-md leading-relaxed">
            Cập nhật sớm nhất về các bộ sưu tập mới và ưu đãi độc quyền từ ET.TEE.
          </p>

          {/* Subscribe Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col sm:flex-row gap-3">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Địa chỉ email của bạn" 
              className="flex-1 h-12 px-4 bg-white border border-slate-300 text-black placeholder:text-slate-400 outline-none focus:border-black text-sm transition-colors"
              required
            />
            <button 
              type="submit"
              className="h-12 px-8 bg-black hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-wider transition-colors shrink-0"
            >
              Đăng ký
            </button>
          </form>

          <p className="text-[11px] text-slate-500 mt-6">
            Bằng cách đăng ký, bạn đồng ý với <a href="/privacy" className="underline hover:text-black transition-colors">Chính sách bảo mật</a> của chúng tôi.
          </p>
        </div>
      </div>
    </section>
  );
}


