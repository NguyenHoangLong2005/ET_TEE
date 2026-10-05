'use client';

import { Ticket } from 'lucide-react';
import { VoucherOption } from '@/lib/services/customerMarketingService';

const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN') + 'đ';

export function voucherHeadline(v: VoucherOption): string {
  const what = v.type === 'PERCENT' ? `Giảm ${v.discountValue}%` : v.type === 'FREE_SHIPPING' ? 'Miễn phí vận chuyển' : `Giảm ${vnd(v.discountValue)}`;
  const cap = v.type === 'PERCENT' && v.maxDiscountAmount ? ` (tối đa ${vnd(v.maxDiscountAmount)})` : '';
  return what + cap;
}

export function voucherConditions(v: VoucherOption): string {
  const parts: string[] = [];
  if (v.minOrderAmount && v.minOrderAmount > 0) parts.push(`Đơn từ ${vnd(v.minOrderAmount)}`);
  if (v.endDate) parts.push(`HSD ${new Date(v.endDate).toLocaleDateString('vi-VN')}`);
  return parts.join(' · ');
}

/** One voucher; `onApply` shows an "Áp dụng" button (checkout). */
export default function VoucherCard({
  voucher,
  onApply,
  highlight = false,
}: {
  voucher: VoucherOption;
  onApply?: (code: string) => void;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 ${highlight ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'} ${voucher.usable ? '' : 'opacity-70'}`}>
      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
        <Ticket className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">
          {voucherHeadline(voucher)}
          {voucher.personal && <span className="ml-2 text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Của riêng bạn</span>}
        </p>
        <p className="text-xs text-slate-500 truncate">
          <span className="font-mono font-bold text-slate-700">{voucher.code}</span>
          {voucherConditions(voucher) && <> · {voucherConditions(voucher)}</>}
        </p>
        {voucher.usable && voucher.discountAmount > 0 && onApply && (
          <p className="text-xs font-bold text-emerald-700">Tiết kiệm {vnd(voucher.discountAmount)} cho đơn này</p>
        )}
        {!voucher.usable && voucher.reason && <p className="text-xs text-slate-500">{voucher.reason}</p>}
      </div>
      {onApply && voucher.usable && (
        <button
          type="button"
          onClick={() => onApply(voucher.code)}
          className="shrink-0 text-xs font-bold bg-slate-900 text-white rounded-full px-3 py-1.5 hover:bg-slate-700"
        >
          Áp dụng
        </button>
      )}
    </div>
  );
}
