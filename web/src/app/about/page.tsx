import Link from 'next/link';
import { ArrowRight, Target, Compass } from 'lucide-react';

export const metadata = {
  title: 'Giới Thiệu Thương Hiệu',
  description: 'Khám phá hành trình phát triển, sứ mệnh, tầm nhìn 2030 và 6 giá trị cốt lõi của thương hiệu thời trang gia đình ET.TEE Studio.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 pb-24">
      
      {/* 1. Ultra Premium Hero Header */}
      <section className="bg-white text-slate-900 py-16 md:py-20 px-4 relative overflow-hidden border-b border-slate-200/80 shadow-2xs">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto max-w-5xl relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-800 text-xs font-bold uppercase tracking-widest shadow-2xs">
            <span>CÂU CHUYỆN THƯƠNG HIỆU ET.TEE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-slate-900 leading-tight">
            Định Hình Phong Cách <br className="hidden sm:inline" /> 
            <span className="text-primary">
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
              className="px-8 py-3.5 rounded-full bg-primary hover:bg-primary-hover text-white font-black uppercase text-xs tracking-wider shadow-md transition-colors flex items-center gap-2"
            >
              <span>Khám Phá Sản Phẩm</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/stores" 
              className="px-8 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold uppercase text-xs tracking-wider shadow-2xs transition-all"
            >
              Hệ Thống Cửa Hàng
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 xl:px-8 max-w-5xl mt-12 relative z-20 space-y-16">
        
        {/* 3. Vision & Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary flex items-center justify-center border border-primary-100">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase text-slate-900">Tầm Nhìn 2030</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Trở thành thương hiệu thời trang gia đình hàng đầu Việt Nam và vươn tầm quốc tế, mang thiết kế hiện đại, chất liệu bền vững cùng trải nghiệm dịch vụ khách hàng chuẩn mực đến với hàng triệu gia đình trên khắp thế giới.
            </p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary flex items-center justify-center border border-primary-100">
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
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Triết Lý Kinh Doanh</span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase text-slate-900">
              6 Giá Trị Cốt Lõi Của ET.TEE
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-primary-50/60 rounded-2xl border border-primary-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white font-black flex items-center justify-center shadow-md shadow-primary/20">1</div>
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
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center shadow-md shadow-emerald-600/20">6</div>
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
            className="px-8 py-3.5 bg-primary hover:bg-primary-hover text-white font-black uppercase text-xs tracking-wider rounded-full shadow-md transition-colors shrink-0"
          >
            Sắm Ngay Trực Tuyến
          </Link>
        </div>

      </div>
    </div>
  );
}
