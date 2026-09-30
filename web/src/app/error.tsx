'use client';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200/80 p-8 md:p-10 relative overflow-hidden">
        <div className="w-16 h-16 bg-red-50 text-primary border border-red-200 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
          ⚠️
        </div>
        <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight mb-3">Đã xảy ra lỗi hệ thống</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Chúng tôi đang nỗ lực khắc phục. Vui lòng thử lại sau.
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-3.5 bg-primary text-white rounded-full font-black uppercase text-xs tracking-wider hover:bg-primary/90 shadow-md transition-all cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
