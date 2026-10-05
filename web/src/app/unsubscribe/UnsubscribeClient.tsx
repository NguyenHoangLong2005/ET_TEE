'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerMarketingService } from '@/lib/services/customerMarketingService';

/** Target of the one-click "Hủy đăng ký" link in every marketing email. */
export default function UnsubscribeClient({ token }: { token: string }) {
  const [state, setState] = useState<'working' | 'done' | 'invalid' | 'error'>('working');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    CustomerMarketingService.unsubscribe(token)
      .then(ok => setState(ok ? 'done' : 'invalid'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="container mx-auto px-4 py-20 max-w-lg text-center min-h-[50vh]">
      <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-4">Hủy nhận email ưu đãi</h1>
      {state === 'working' && <p className="text-slate-600">Đang xử lý…</p>}
      {state === 'done' && (
        <p className="text-slate-600">
          Bạn sẽ không nhận email khuyến mãi từ ET.TEE nữa. Email về đơn hàng vẫn được gửi bình thường.
          Muốn nhận lại, bật trong <Link href="/account/vouchers" className="underline">Voucher của tôi</Link>.
        </p>
      )}
      {state === 'invalid' && <p className="text-slate-600">Liên kết hủy đăng ký không hợp lệ hoặc đã hết hiệu lực.</p>}
      {state === 'error' && <p className="text-slate-600">Không kết nối được máy chủ, vui lòng thử lại sau.</p>}
    </div>
  );
}
