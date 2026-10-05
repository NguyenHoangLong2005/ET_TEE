'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getApiBaseUrl } from '@/lib/api-config';

export type BankConfig = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrUrl?: string;
};

/** Fetches the (public) bank transfer account details once. */
export function useBankConfig(enabled: boolean) {
  const [bankConfig, setBankConfig] = useState<BankConfig | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/payment-methods/bank-transfer`);
        const json = await res.json();
        if (!cancelled && json?.success) setBankConfig(json.data);
      } catch {
        /* the caller falls back to "unavailable" */
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  return bankConfig;
}

export function CopyField({ label, value, mono = false, emphasis = false }: { label: string; value: string; mono?: boolean; emphasis?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Không thể sao chép, vui lòng chép thủ công');
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`truncate font-bold ${mono ? 'font-mono tracking-wide' : ''} ${emphasis ? 'text-lg text-primary' : 'text-slate-900'}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Sao chép ${label}`}
        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors ${
          copied ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Đã chép' : 'Chép'}
      </button>
    </div>
  );
}

/**
 * QR + account details for a bank-transfer order. The amount and the transfer content are
 * encoded in the QR, so scanning it with a banking app fills both in.
 */
export default function BankTransferPayment({
  orderCode,
  customerPhone,
  amount,
  bankConfig,
}: {
  orderCode: string;
  customerPhone?: string;
  amount: number;
  bankConfig: BankConfig;
}) {
  const transferContent = `ETTEE ${orderCode} ${customerPhone || ''}`.trim();
  const qrSrc = bankConfig.qrUrl
    ? `${bankConfig.qrUrl}?acc=${encodeURIComponent(bankConfig.accountNumber || '')}&bank=${encodeURIComponent(bankConfig.bankName || '')}&amount=${amount}&des=${encodeURIComponent(transferContent)}`
    : null;

  return (
    <section className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mx-auto aspect-square w-full max-w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {qrSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={qrSrc} alt="QR Code Chuyển Khoản" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
            Quét mã QR qua ứng dụng ngân hàng
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Quét mã bằng app ngân hàng, số tiền và nội dung được điền sẵn
      </p>

      <div className="mt-5 space-y-2">
        <CopyField label="Nội dung chuyển khoản" value={transferContent} mono />
        <CopyField label="Số tài khoản" value={String(bankConfig.accountNumber)} mono emphasis />
        <p className="px-1 text-center text-xs text-slate-500">
          {bankConfig.bankName} · {bankConfig.accountName}
        </p>
      </div>

      <div className="mt-auto flex items-start gap-2 pt-5 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p>Đơn hàng được xử lý ngay khi chúng tôi xác nhận đã nhận tiền.</p>
      </div>
    </section>
  );
}
