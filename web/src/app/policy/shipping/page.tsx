import Link from 'next/link';
import { Truck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Chính Sách Vận Chuyển & Giao Hàng | ET.TEE Studio',
  description: 'Thông tin chi tiết về phí giao hàng, thời gian nhận hàng, giao hỏa tốc 2h và quy trình đồng kiểm trước khi thanh toán tại ET.TEE.',
};

export default function ShippingPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-4xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <Link href="/policy" className="hover:underline">Chính sách</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Chính sách vận chuyển</span>
        </div>

        <article className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          
          <div className="border-b border-slate-100 pb-6">
            <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black uppercase rounded-full mb-3 shadow-xs">
              Delivery Policy
            </span>
            <h1 className="text-3xl font-black uppercase text-slate-900">
              Chính Sách Vận Chuyển & Giao Hàng ET.TEE
            </h1>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            
            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600" />
                <span>1. Biểu Phí Vận Chuyển Toàn Quốc</span>
              </h2>
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs space-y-2">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Đơn hàng từ 499.000đ trở lên:</span>
                  <span className="text-emerald-600 uppercase">MIỄN PHÍ VẬN CHUYỂN (Freeship)</span>
                </div>
                <div className="flex justify-between text-slate-600 border-t border-amber-200/60 pt-2">
                  <span>Đơn hàng dưới 499.000đ:</span>
                  <span className="font-bold text-slate-900">20.000đ / đơn</span>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>2. Thời Gian Giao Hàng Dự Kiến</span>
              </h2>
              <ul className="space-y-2 pl-4 list-disc">
                <li><strong>Giao hàng Hỏa tốc 2H:</strong> Áp dụng tại các quận nội thành Hà Nội & TP. Hồ Chí Minh khi đặt hàng trước 16:00.</li>
                <li><strong>Khu vực Nội thành (Hà Nội, TP.HCM, Đà Nẵng, Hải Phòng):</strong> Nhận hàng trong vòng 1 - 2 ngày làm việc.</li>
                <li><strong>Khu vực Ngoại thành & Các Tỉnh khác:</strong> Nhận hàng từ 2 - 4 ngày làm việc.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>3. Quy Định Đồng Kiểm Khi Nhận Hàng</span>
              </h2>
              <p>
                Để đảm bảo quyền lợi tối đa cho khách hàng, ET.TEE <strong>cho phép quý khách mở gói hàng kiểm tra số lượng, màu sắc, size sản phẩm</strong> trước khi thanh toán tiền cho nhân viên giao hàng (COD).
              </p>
              <p className="text-slate-500 text-xs">
                Lưu ý: Quý khách kiểm tra ngoại quan sản phẩm, chưa thử trực tiếp trước mặt shipper để đảm bảo vệ sinh. Nếu sản phẩm không đúng mô tả, quý khách có quyền từ chối nhận hàng không mất phí.
              </p>
            </div>

          </div>

        </article>

      </div>
    </main>
  );
}

