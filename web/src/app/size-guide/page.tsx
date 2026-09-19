import Link from 'next/link';
import SizeGuideClient from './SizeGuideClient';

export const metadata = {
  title: 'Hướng Dẫn Chọn Size Chuẩn ET.TEE | ET.TEE Studio',
  description: 'Bảng quy đổi kích thước chuẩn cho áo sơ mi, áo thun, polo, quần nam nữ và trẻ em ET.TEE. Công cụ tính size tự động theo chiều cao, cân nặng.',
};

export default function SizeGuidePage() {
  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-5xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Hướng dẫn chọn size</span>
        </div>

        {/* Hero Header */}
        <div className="bg-slate-900 text-white p-8 md:p-12 rounded-3xl mb-10 shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-red-600/20 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-full mb-4">
              ET.TEE Size Chart 2026
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
              Hướng Dẫn Chọn Kích Cỡ Chuẩn Vóc Dáng
            </h1>
            <p className="text-sm md:text-base text-gray-300 leading-relaxed">
              Bảng quy đổi kích thước thời trang ET.TEE được nghiên cứu tối ưu riêng cho phom dáng người Việt Nam. 
              Trải nghiệm công cụ tính size tự động và chính sách đổi trả 30 ngày hoàn toàn miễn phí.
            </p>
          </div>
        </div>

        {/* Interactive Client Hub Component */}
        <SizeGuideClient />

      </div>
    </main>
  );
}
