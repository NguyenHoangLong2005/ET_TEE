'use client';

import { Mail, Gift, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { CustomerMarketingService } from '@/lib/services/customerMarketingService';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Stores the consent (marketing_subscriptions); every email it leads to carries a one-click
  // unsubscribe link. No voucher is promised here: the welcome voucher belongs to an account.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await CustomerMarketingService.subscribeNewsletter(email.trim());
      toast.success('Đã đăng ký! Bạn sẽ nhận email khi ET.TEE có ưu đãi mới.');
      setEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không đăng ký được, vui lòng thử lại.');
    } finally {
      setSending(false);
    }
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
              disabled={sending}
              className="h-12 px-8 bg-black hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-wider transition-colors shrink-0"
            >
              Đăng ký
            </button>
          </form>

          <p className="text-[11px] text-slate-500 mt-6">
            Bằng cách đăng ký, bạn đồng ý nhận email ưu đãi và <a href="/privacy" className="underline hover:text-black transition-colors">Chính sách bảo mật</a> của chúng tôi. Hủy bất cứ lúc nào bằng link trong email.
          </p>
        </div>
      </div>
    </section>
  );
}


