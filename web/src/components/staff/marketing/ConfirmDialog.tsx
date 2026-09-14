'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <div className={[
            'mt-0.5 h-9 w-9 rounded-full flex items-center justify-center shrink-0',
            variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700',
          ].join(' ')}>
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
            {message ? (
              <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">{message}</p>
            ) : null}
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-9 px-3.5 rounded-md text-[13px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={[
              'h-9 px-3.5 rounded-md text-[13px] font-semibold inline-flex items-center gap-2',
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-slate-900 hover:bg-black text-white',
            ].join(' ')}
          >
            {loading && <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
