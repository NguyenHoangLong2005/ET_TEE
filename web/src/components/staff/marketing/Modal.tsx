'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

export function Modal({ open, title, description, size = 'md', children, footer, onClose }: ModalProps) {
  if (!open) return null;
  const widths: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className={['w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]', widths[size]].join(' ')}>
        <div className="flex items-start gap-3 px-6 py-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-[12.5px] text-slate-500">{description}</p>
            ) : null}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 px-6 py-3 bg-slate-50 border-t border-slate-100">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
