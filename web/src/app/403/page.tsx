import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200/80 max-w-md w-full text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="w-16 h-16 bg-rose-50 border border-rose-200/80 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">Truy cập bị từ chối</h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Bạn không có quyền (role) hợp lệ để xem trang này. Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là một lỗi.
        </p>
        <Link 
          href="/"
          className="inline-block w-full px-6 py-3.5 bg-primary text-white rounded-full hover:bg-primary/90 font-black uppercase text-xs tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all"
        >
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
}

