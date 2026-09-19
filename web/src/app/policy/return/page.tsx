import Link from 'next/link';
import { RefreshCcw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Chính Sách Đổi Trả 30 Ngày | ET.TEE Studio',
  description: 'Cam kết đổi trả trong 30 ngày hoàn toàn miễn phí tại 200+ cửa hàng hoặc yêu cầu shipper thu gom tận nhà.',
};

export default function ReturnPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-4xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <Link href="/policy" className="hover:underline">Chính sách</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Chính sách đổi trả</span>
        </div>

        <article className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          
          <div className="border-b border-gray-100 pb-6">
            <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black uppercase rounded-full mb-3 shadow-xs">
              30-Day Guarantee
            </span>
            <h1 className="text-3xl font-black uppercase text-slate-900">
              Chính Sách Đổi Trả 30 Ngày ET.TEE
            </h1>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            
            {/* Highlight Banner */}
            <div className="p-5 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-start gap-3">
              <RefreshCcw className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-900">
                <strong className="block font-bold">Cam kết "Không hài lòng, đổi trả trong 30 ngày":</strong>
                <span>Nếu bạn mặc thử không vừa vặn, không ưng ý màu sắc hoặc phom dáng, ET.TEE hỗ trợ đổi size, đổi mẫu hoàn toàn miễn phí trong vòng 30 ngày kể từ ngày nhận hàng.</span>
              </div>
            </div>

            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>1. Điều Kiện Đổi Hàng</span>
              </h2>
              <ul className="space-y-2 pl-4 list-disc text-gray-600">
                <li>Sản phẩm còn nguyên tem, mác, niêm phong của nhà sản xuất.</li>
                <li>Sản phẩm chưa qua sử dụng, giặt tẩy, không bị bẩn hay ám mùi lạ.</li>
                <li>Sản phẩm mua trong thời hạn 30 ngày kể từ ngày hiển thị giao hàng thành công.</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <span>2. Quy Trình 4 Bước Đổi Hàng Đơn Giản</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                  <span className="font-bold text-slate-900 text-xs">Cách 1: Đổi Trực Tiếp Tại Showroom</span>
                  <p className="text-gray-500 text-xs">Mang sản phẩm kèm hóa đơn/số điện thoại đến bất kỳ cửa hàng nào trong hệ thống 200+ showroom ET.TEE để thử và đổi ngay.</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                  <span className="font-bold text-slate-900 text-xs">Cách 2: Đổi Tận Nhà Qua Shipper</span>
                  <p className="text-gray-500 text-xs">Gọi Hotline 1900 1234, ET.TEE sẽ cho nhân viên giao sản phẩm mới đến tận nhà và thu hồi sản phẩm cũ cùng lúc.</p>
                </div>
              </div>
            </div>

          </div>

        </article>

      </div>
    </main>
  );
}
