'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerMarketingService } from '@/lib/services/customerMarketingService';

/** Target of the link in the newsletter confirmation e-mail (MarketingSubscriptionService.requestSubscription). */
export default function ConfirmNewsletterClient({ token }: { token: string }) {
  const [state, setState] = useState<'working' | 'done' | 'invalid' | 'error'>('working');

  useEffect(() => {
    if (!token) {
      Promise.resolve().then(() => setState('invalid'));
      return;
    }
    CustomerMarketingService.confirmNewsletter(token)
      .then(ok => setState(ok ? 'done' : 'invalid'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="container mx-auto px-4 py-20 max-w-lg text-center min-h-[50vh]">
      <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">Xác nhận đăng ký nhận tin</h1>
      {state === 'working' && <p className="text-slate-600">Đang xử lý…</p>}
      {state === 'done' && (
        <p className="text-slate-600">
          Đã xác nhận. Bạn sẽ nhận email khi ET.TEE có bộ sưu tập mới và ưu đãi. Mỗi email đều có liên kết hủy đăng ký.{' '}
          <Link href="/" className="underline">Về trang chủ</Link>
        </p>
      )}
      {state === 'invalid' && <p className="text-slate-600">Liên kết xác nhận không hợp lệ hoặc đã hết hiệu lực.</p>}
      {state === 'error' && <p className="text-slate-600">Không kết nối được máy chủ, vui lòng thử lại sau.</p>}
    </div>
  );
}
