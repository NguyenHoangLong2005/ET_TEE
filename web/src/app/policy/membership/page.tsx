import Link from 'next/link';
import { Award, Gift, Star, Sparkles, Check } from 'lucide-react';

export const metadata = {
  title: 'Chính Sách Khách Hàng Thân Thiết ET.TEE Club | ET.TEE Studio',
  description: 'Quyền lợi tích điểm 1% - 5%, thăng hạng VIP Bronze, Silver, Gold, Diamond và quà tặng sinh nhật dành riêng cho hội viên ET.TEE Club.',
};

export default function MembershipPolicyPage() {
  const TIERS = [
    { name: 'Bronze', points: 'Khởi tạo', perk: 'Tích điểm 1% trên mỗi hóa đơn', color: 'border-amber-300 bg-amber-50/40 text-amber-900' },
    { name: 'Silver', points: 'Tích lũy 3.000.000đ', perk: 'Tích điểm 2% • Giảm 5% tháng sinh nhật', color: 'border-slate-300 bg-slate-50 text-slate-900' },
    { name: 'Gold', points: 'Tích lũy 8.000.000đ', perk: 'Tích điểm 3% • Giảm 10% tháng sinh nhật • Freeship mọi đơn', color: 'border-amber-400 bg-amber-100/70 text-amber-950 font-bold' },
    { name: 'Diamond VIP', points: 'Tích lũy 15.000.000đ', perk: 'Tích điểm 5% • Giảm 15% tháng sinh nhật • Quyền mua ưu tiên BST mới', color: 'border-slate-900 bg-slate-900 text-white font-black' },
  ];

  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-4xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <Link href="/policy" className="hover:underline">Chính sách</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">ET.TEE Club</span>
        </div>

        <article className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          
          <div className="border-b border-gray-100 pb-6">
            <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black uppercase rounded-full mb-3 shadow-xs">
              ET.TEE Club Loyalty
            </span>
            <h1 className="text-3xl font-black uppercase text-slate-900">
              Chương Trình Khách Hàng Thân Thiết ET.TEE Club
            </h1>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            
            <p>
              Tất cả khách hàng có tài khoản tại ET.TEE đều tự động trở thành hội viên của <strong>ET.TEE Club</strong>. Mỗi lần mua sắm tại bất kỳ kênh online hay showroom nào, bạn đều được tích lũy điểm thưởng và hưởng hàng loạt đặc quyền VIP.
            </p>

            {/* Tiers Grid */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <span>Các Hạng Hội Viên & Đặc Quyền</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TIERS.map((tier, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border ${tier.color} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black uppercase">{tier.name}</span>
                      <span className="text-[10px] uppercase font-bold opacity-80">{tier.points}</span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{tier.perk}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Birthday Gift */}
            <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-2xl flex items-center gap-4 shadow-md">
              <Gift className="w-10 h-10 text-slate-950 shrink-0" />
              <div>
                <strong className="block text-sm font-black uppercase text-slate-950">Quà Tặng Sinh Nhật Đặc Biệt</strong>
                <span className="text-xs text-slate-900 font-medium">Vào tháng sinh nhật của bạn, ET.TEE gửi tặng voucher giảm từ 5% đến 15% kèm phần quà bất ngờ gửi trực tiếp về địa chỉ tận nhà.</span>
              </div>
            </div>

          </div>

        </article>

      </div>
    </main>
  );
}
