'use client';

import { useEffect, useState } from 'react';
import { Ticket, Mail } from 'lucide-react';
import { toast } from 'sonner';
import VoucherCard from '@/components/vouchers/VoucherCard';
import { CustomerMarketingService, VoucherOption } from '@/lib/services/customerMarketingService';

/** "Voucher của tôi": personal vouchers (welcome, comeback, customer care) + public ones, and email consent. */
export default function AccountVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherOption[] | null>(null);
  const [consent, setConsent] = useState<{ subscribed: boolean; since: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // subtotal 0: list everything; conditions (minimum order...) are shown on each card
    CustomerMarketingService.vouchersForMe(0).then(setVouchers);
    CustomerMarketingService.getConsent().then(setConsent).catch(() => setConsent(null));
  }, []);

  const toggle = async () => {
    if (!consent) return;
    setSaving(true);
    try {
      const next = await CustomerMarketingService.setConsent(!consent.subscribed);
      setConsent(next);
      toast.success(next.subscribed ? 'Đã bật nhận email ưu đãi' : 'Đã tắt nhận email ưu đãi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const personal = (vouchers ?? []).filter(v => v.personal);
  const shared = (vouchers ?? []).filter(v => !v.personal);

  return (
    <div>
      <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-8 pb-4 border-b border-slate-200/80 flex items-center gap-2">
        <Ticket className="w-6 h-6" /> Voucher của tôi
      </h2>

      {consent && (
        <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 mt-0.5 text-slate-500" />
            <div>
              <p className="text-sm font-bold text-slate-900">Nhận email ưu đãi</p>
              <p className="text-xs text-slate-500">
                {consent.subscribed
                  ? 'Bạn đang nhận email khi có mã giảm giá mới. Email đơn hàng và mã OTP không bị ảnh hưởng.'
                  : 'Đang tắt. Voucher dành cho bạn vẫn xuất hiện ở trang này và khi thanh toán.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={consent.subscribed}
            aria-label="Nhận email ưu đãi"
            disabled={saving}
            onClick={toggle}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${consent.subscribed ? 'bg-slate-900' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${consent.subscribed ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      )}

      {vouchers === null ? (
        <p className="text-sm text-slate-500">Đang tải…</p>
      ) : (
        <>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Dành riêng cho bạn</h3>
          {personal.length === 0 ? (
            <p className="text-sm text-slate-500 mb-8">Chưa có voucher riêng. Voucher chào mừng, quà quay lại và mã bồi thường từ CSKH sẽ hiện ở đây.</p>
          ) : (
            <div className="grid gap-3 mb-8">{personal.map(v => <VoucherCard key={v.code} voucher={v} />)}</div>
          )}
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-3">Đang áp dụng cho mọi khách</h3>
          {shared.length === 0 ? (
            <p className="text-sm text-slate-500">Hiện chưa có chương trình nào.</p>
          ) : (
            <div className="grid gap-3">{shared.map(v => <VoucherCard key={v.code} voucher={v} />)}</div>
          )}
        </>
      )}
    </div>
  );
}
