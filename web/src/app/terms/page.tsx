import Link from 'next/link';
import { FileText, ShieldCheck, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Điều Khoản Sử Dụng & Dịch Vụ | ET.TEE Studio',
  description: 'Các quy định chung về điều khoản giao dịch, tài khoản người dùng và sở hữu trí tuệ tại website ET.TEE.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-4xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Điều khoản sử dụng</span>
        </div>

        <article className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          
          <div className="border-b border-slate-100 pb-6">
            <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black uppercase rounded-full mb-3 shadow-xs">
              Terms of Service
            </span>
            <h1 className="text-3xl font-black uppercase text-slate-900">
              Điều Khoản Sử Dụng Dịch Vụ
            </h1>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            
            <p>
              Chào mừng bạn đến với hệ thống thương mại điện tử ET.TEE. Khi truy cập và sử dụng website, quý khách đồng ý tuân thủ các điều khoản mua bán và quy định dưới đây.
            </p>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>1. Tài Khoản & Nghĩa Vụ Khách Hàng</span>
              </h2>
              <p>Khách hàng cần cung cấp thông tin chính xác về tên, số điện thoại và địa chỉ giao hàng. Khách hàng có trách nhiệm bảo mật mật khẩu tài khoản cá nhân.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>2. Giá Cả & Xác Nhận Đơn Hàng</span>
              </h2>
              <p>Giá niêm yết trên website là giá công khai đã bao gồm thuế VAT. ET.TEE có quyền điều chỉnh giá hoặc hủy đơn hàng nếu có sai sót kỹ thuật hiển thị mức giá bất thường.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>3. Quyền Sở Hữu Trí Tuệ</span>
              </h2>
              <p>Tất cả hình ảnh sản phẩm, thiết kế phom dáng, logo ET.TEE và nội dung bài viết trên website thuộc bản quyền độc quyền của ET.TEE Studio. Nghiêm cấm sao chép vì mục đích thương mại khi chưa có sự đồng ý bằng văn bản.</p>
            </div>

          </div>

        </article>

      </div>
    </main>
  );
}

