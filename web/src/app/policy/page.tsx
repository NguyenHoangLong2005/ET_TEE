import Link from 'next/link';
import { Truck, RefreshCcw, ShieldCheck, Award, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Chính Sách Khách Hàng | ET.TEE Studio',
  description: 'Tổng hợp chính sách giao hàng, đổi trả 30 ngày, bảo hành sản phẩm và chương trình khách hàng thân thiết ET.TEE Club.',
};

export default function PolicyOverviewPage() {
  const POLICIES = [
    {
      title: 'Chính Sách Vận Chuyển',
      href: '/policy/shipping',
      icon: Truck,
      desc: 'Freeship toàn quốc đơn từ 499.000đ. Giao hàng hỏa tốc 2h nội thành Hà Nội & TP.HCM.',
      badge: 'Freeship từ 499k',
    },
    {
      title: 'Chính Sách Đổi Trả 30 Ngày',
      href: '/policy/return',
      icon: RefreshCcw,
      desc: 'Đổi trả miễn phí trong 30 ngày tại 200+ showroom hoặc shipper tới lấy tận nhà.',
      badge: 'Cam kết 30 ngày',
    },
    {
      title: 'Chính Sách Bảo Hành',
      href: '/policy/warranty',
      icon: ShieldCheck,
      desc: 'Sửa chữa khóa kéo, đường may miễn phí 6 tháng. Đổi mới với lỗi từ nhà sản xuất.',
      badge: 'Bảo hành 6 tháng',
    },
    {
      title: 'ET.TEE Club & Tích Điểm VIP',
      href: '/policy/membership',
      icon: Award,
      desc: 'Tích điểm 1% - 5% cho mỗi đơn hàng, nhận quà sinh nhật và ưu đãi giảm giá độc quyền.',
      badge: 'Hạng VIP Club',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-5xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Chính sách chung</span>
        </div>

        {/* Hero Header */}
        <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl mb-10 shadow-md relative overflow-hidden border border-slate-200/80">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-3.5 py-1 bg-amber-50 text-amber-900 text-xs font-bold uppercase tracking-widest rounded-full mb-4 border border-amber-200 shadow-2xs">
              Dịch Vụ Phục Vụ Quyền Lợi Khách Hàng
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900 mb-4">
              Chính Sách Khách Hàng ET.TEE
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              ET.TEE cam kết mang tới trải nghiệm mua sắm an tâm tuyệt đối với chính sách minh bạch, đổi trả 30 ngày và dịch vụ hậu mãi chu đáo.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {POLICIES.map((p, idx) => {
            const Icon = p.icon;
            return (
              <Link key={idx} href={p.href} className="group bg-white p-8 rounded-3xl border border-slate-200 hover:border-amber-400 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="bg-amber-50 text-amber-900 text-[11px] font-bold px-3 py-1 rounded-full border border-amber-200/80">
                      {p.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {p.title}
                  </h3>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    {p.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  <span>Xem chi tiết điều khoản</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </main>
  );
}
