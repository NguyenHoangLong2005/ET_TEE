'use client';

import { Search, Inbox } from 'lucide-react';
import { ReactNode } from 'react';

export function PageLoader({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-500 text-[13px]">
      <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin mr-3" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-red-100 bg-red-50 rounded-lg px-4 py-3 text-[13px] text-red-700 flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">Đã xảy ra lỗi</div>
        <div className="mt-0.5 text-red-600/90">{message}</div>
      </div>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="h-8 px-3 rounded-md border border-red-200 text-[12.5px] font-medium text-red-700 hover:bg-red-100"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
}: {
  icon?: any;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-slate-200 rounded-lg bg-white px-6 py-14 text-center">
      <div className="mx-auto h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
        <Icon size={20} />
      </div>
      <div className="mt-4 text-[14px] font-semibold text-slate-900">{title}</div>
      {hint ? <p className="mt-1 text-[12.5px] text-slate-500 max-w-md mx-auto">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        {...props}
        className={[
          'w-full h-9 pl-8 pr-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900',
          'placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10',
          props.className || '',
        ].join(' ')}
      />
    </div>
  );
}

export function MetricCard({
  label, value, hint, accent,
}: { label: string; value: string | number; hint?: string; accent?: 'up' | 'down' | 'neutral' }) {
  const accentColor = accent === 'up' ? 'text-emerald-600' : accent === 'down' ? 'text-red-600' : 'text-slate-500';
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="mt-2 text-[24px] font-semibold text-slate-900 tabular-nums">{value}</div>
      {hint ? <div className={['mt-1 text-[12px]', accentColor].join(' ')}>{hint}</div> : null}
    </div>
  );
}
