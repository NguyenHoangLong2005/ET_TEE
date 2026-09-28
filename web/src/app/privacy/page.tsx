import Link from 'next/link';
import { Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Chính Sách Bảo Mật Thông Tin | ET.TEE Studio',
  description: 'Cam kết bảo mật thông tin cá nhân khách hàng, chính sách cookie và an toàn thanh toán tại ET.TEE.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-4xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Chính sách bảo mật</span>
        </div>

        <article className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          
          <div className="border-b border-slate-100 pb-6">
            <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black uppercase rounded-full mb-3 shadow-xs">
              Data Privacy
            </span>
            <h1 className="text-3xl font-black uppercase text-slate-900">
              Chính Sách Bảo Mật Thông Tin Cá Nhân
            </h1>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            
            <p>
              ET.TEE tôn trọng và cam kết bảo vệ tuyệt đối thông tin cá nhân của khách hàng. Chúng tôi hiểu rằng bạn tin tưởng chúng tôi khi cung cấp dữ liệu cá nhân, do đó ET.TEE cam kết chỉ sử dụng thông tin nhằm mang tới dịch vụ mua sắm tốt nhất.
            </p>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                <span>1. Thu Thập Thông Tin Cá Nhân</span>
              </h2>
              <p>Chúng tôi thu thập các thông tin bao gồm: Họ tên, Số điện thoại, Email, Địa chỉ giao hàng và Lịch sử đơn hàng khi bạn tạo tài khoản hoặc đặt hàng tại website.</p>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>2. Mục Đích Sử Dụng Thông Tin</span>
              </h2>
              <ul className="space-y-2 pl-4 list-disc text-slate-600">
                <li>Xử lý và giao đơn hàng tận nơi cho bạn.</li>
                <li>Gửi thông báo về tình trạng vận chuyển đơn hàng.</li>
                <li>Tư vấn size số cá nhân hóa và gợi ý sản phẩm phù hợp.</li>
                <li>Cung cấp thông tin ưu đãi giảm giá độc quyền dành cho hội viên ET.TEE Club.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                <span>3. Cam Kết Không Chia Sẻ Cho Bên Thứ Ba</span>
              </h2>
              <p>
                ET.TEE cam kết <strong>không bán, chia sẻ hay trao đổi thông tin cá nhân</strong> của khách hàng cho bất kỳ bên thứ ba nào vì mục đích thương mại. Thông tin chỉ được cung cấp duy nhất cho đơn vị vận chuyển (GHN, GHTK, Viettel Post) để thực hiện giao hàng.
              </p>
            </div>

          </div>

        </article>

      </div>
    </main>
  );
}

