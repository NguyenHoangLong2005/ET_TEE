import { Truck, RefreshCcw, ShieldCheck, PhoneCall } from 'lucide-react';

export default function TrustBar() {
  return (
    <section className="border-t border-gray-200 bg-white py-12">
      <div className="container mx-auto px-4 xl:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* 1. Vận chuyển */}
          <div className="flex items-center gap-4 group">
            <div className="w-14 h-14 rounded-full bg-red-50 text-[#e50027] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Giao Hàng Miễn Phí</h4>
              <p className="text-xs text-slate-500 mt-1">Áp dụng cho đơn hàng từ 499.000đ</p>
            </div>
          </div>

          {/* 2. Đổi trả */}
          <div className="flex items-center gap-4 group">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Đổi Trả 30 Ngày</h4>
              <p className="text-xs text-slate-500 mt-1">Đổi hàng tận nơi hoặc tại showroom</p>
            </div>
          </div>

          {/* 3. Chất liệu an toàn */}
          <div className="flex items-center gap-4 group">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Chất Liệu An Toàn</h4>
              <p className="text-xs text-slate-500 mt-1">Chứng nhận lành tính cho da nhạy cảm</p>
            </div>
          </div>

          {/* 4. Hotline 24/7 */}
          <div className="flex items-center gap-4 group">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Tư Vấn Miễn Cước</h4>
              <p className="text-xs text-slate-500 mt-1">Hotline hỗ trợ: 1800 2086 (8h - 22h)</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
