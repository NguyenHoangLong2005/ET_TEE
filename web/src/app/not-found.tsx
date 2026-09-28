import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-slate-50/50">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200/80 p-8 md:p-10 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="text-7xl md:text-8xl font-black text-slate-900 mb-2 tracking-tight">
          404
        </div>
        <div className="w-16 h-1.5 bg-primary rounded-full mx-auto mb-6"></div>
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 mb-3">
          Không tìm thấy trang
        </h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Trang bạn đang tìm kiếm không tồn tại, đã bị di chuyển hoặc tạm thời không khả dụng.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white font-black uppercase text-xs tracking-wider rounded-full hover:bg-primary/90 shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-slate-300 text-slate-700 font-bold rounded-full hover:bg-slate-50 transition-all text-xs uppercase tracking-wider"
          >
            <Search className="w-4 h-4" />
            Tìm sản phẩm
          </Link>
        </div>
      </div>
    </div>
  );
}

