'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isLoading = false,
  type = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colorConfig = {
    danger: { bg: 'bg-red-50', icon: 'text-red-600', button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500' },
    warning: { bg: 'bg-amber-50', icon: 'text-amber-600', button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500' },
    info: { bg: 'bg-blue-50', icon: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' }
  };

  const colors = colorConfig[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={!isLoading ? onClose : undefined} 
      />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center`}>
            <AlertTriangle className={`w-6 h-6 ${colors.icon}`} />
          </div>
          
          <div className="flex-1 pt-1">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {title}
            </h3>
            <div className="text-sm text-slate-500">
              {message}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 ${colors.button}`}
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {confirmText}
          </button>
        </div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

