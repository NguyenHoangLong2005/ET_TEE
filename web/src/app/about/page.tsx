import Link from 'next/link';
import { ShieldCheck, Heart, Users, Sparkles, Award, Globe, Leaf, ArrowRight, CheckCircle2, Star, Target, Compass } from 'lucide-react';

export const metadata = {
  title: 'Giới Thiệu Thương Hiệu ET.TEE | Thời Trang Gia Đình Cao Cấp',
  description: 'Khám phá hành trình phát triển, sứ mệnh, tầm nhìn 2030 và 5 giá trị cốt lõi của thương hiệu thời trang gia đình ET.TEE Studio.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50/70 pb-24">
      
      {/* 1. Ultra Premium Hero Header */}
      <section className="bg-white text-slate-900 py-16 md:py-20 px-4 relative overflow-hidden border-b border-slate-200/80 shadow-2xs">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto max-w-5xl relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-widest shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>CÂU CHUYỆN THƯƠNG HIỆU ET.TEE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-slate-900 leading-tight">
            Định Hình Phong Cách <br className="hidden sm:inline" /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700">
              Thời Trang Gia Đình Việt
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            ET.TEE ra đời từ khát vọng mang lại những sản phẩm thời trang chất lượng hàng đầu, thiết kế tinh tế, tối giản 
            và cảm giác thoải mái nhất cho từng thành viên trong gia đình Việt Nam.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link 
              href="/products" 
              className="px-8 py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-xs tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Khám Phá Sản Phẩm</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Link>
            <Link 
              href="/stores" 
              className="px-8 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold uppercase text-xs tracking-wider shadow-2xs transition-all"
            >
              Hệ Thống Showroom
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 xl:px-8 max-w-5xl mt-12 relative z-20 space-y-16">
        
        {/* 2. Bento Grid Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { val: '200+', label: 'Showroom Toàn Quốc', desc: 'Có mặt tại 63 tỉnh thành', color: 'from-amber-600 to-orange-600' },
            { val: '10M+', label: 'Khách Hàng Tin Dùng', desc: 'Hơn 10 triệu sản phẩm trao tay', color: 'from-slate-900 to-slate-800' },
            { val: '5.000+', label: 'Nhân Sự Tận Tâm', desc: 'Đội ngũ chuyên nghiệp 24/7', color: 'from-amber-500 to-orange-600' },
            { val: '99.8%', label: 'Hài Lòng Phục Vụ', desc: 'Đánh giá 5 sao từ khách hàng', color: 'from-emerald-500 to-teal-600' },
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center space-y-2 group"
            >
              <div className={`text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.val}
              </div>
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">{stat.label}</div>
              <div className="text-[11px] text-slate-400">{stat.desc}</div>
            </div>
          ))}
        </div>

        {/* 3. Vision & Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase text-slate-900">Tầm Nhìn 2030</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Trở thành thương hiệu thời trang gia đình hàng đầu Việt Nam và vươn tầm quốc tế, mang thiết kế hiện đại, chất liệu bền vững cùng trải nghiệm dịch vụ khách hàng chuẩn mực đến với hàng triệu gia đình trên khắp thế giới.
            </p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Compass className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase text-slate-900">Sứ Mệnh</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Mang đến sự tự tin, thoải mái tuyệt đối trong từng trang phục mặc hằng ngày. Chúng tôi chú trọng từng đường kim mũi chỉ, lựa chọn nguyên liệu lành tính và thiết kế mặc đồng điệu gắn kết tình thân gia đình.
            </p>
          </div>
        </div>

        {/* 4. 5 Core Values Bento */}
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-sm space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Triết Lý Kinh Doanh</span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase text-slate-900">
              5 Giá Trị Cốt Lõi Của ET.TEE
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-amber-50/40 rounded-2xl border border-amber-200/70 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-md shadow-amber-500/20">1</div>
              <h3 className="font-bold text-slate-900 text-base">Khách Hàng Là Trung Tâm</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Đưa sự hài lòng của khách hàng làm thước đo cao nhất cho mọi quyết định của doanh nghiệp.</p>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center shadow-md">2</div>
              <h3 className="font-bold text-slate-900 text-base">Đam Mê Phục Vụ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Luôn chủ động lắng nghe, chu đáo và mỉm cười phục vụ bằng tất cả sự chân thành.</p>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center shadow-md">3</div>
              <h3 className="font-bold text-slate-900 text-base">Cầu Tiến & Sáng Tạo</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Không ngừng cải tiến công nghệ vải, quy trình sản xuất và trải nghiệm mua sắm.</p>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center shadow-md">4</div>
              <h3 className="font-bold text-slate-900 text-base">Trung Thực & Minh Bạch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Minh bạch về chất liệu, nguồn gốc sản phẩm và chính sách bán hàng công khai.</p>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center shadow-md">5</div>
              <h3 className="font-bold text-slate-900 text-base">Yêu Thương & Đồng Đội</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Xây dựng môi trường làm việc hạnh phúc, hỗ trợ cùng phát triển vì mục tiêu chung.</p>
            </div>

            <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-200/70 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center shadow-md shadow-emerald-600/20">🍃</div>
              <h3 className="font-bold text-slate-900 text-base">Thời Trang Bền Vững (Eco)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Sử dụng chất liệu sợi hữu cơ Eco-Cotton, sợi Bamboo và sợi tái chế giúp bảo vệ môi trường.</p>
            </div>
          </div>
        </div>

        {/* 5. CTA Footer Navigation */}
        <div className="bg-white text-slate-900 p-8 sm:p-10 rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-200/80">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">Khám Phá Các Bộ Sưu Tập Mới Nhất</h3>
            <p className="text-xs text-slate-600">Trải nghiệm mua sắm thời trang cao cấp dành cho cả gia đình cùng ET.TEE</p>
          </div>
          <Link 
            href="/products"
            className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-xs tracking-wider rounded-full shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
          >
            Sắm Ngay Trực Tuyến
          </Link>
        </div>

      </div>
    </main>
  );
}
