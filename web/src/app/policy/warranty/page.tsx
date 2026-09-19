import Link from 'next/link';
import { ShieldCheck, Wrench, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Chính Sách Bảo Hành & Sửa Chữa | ET.TEE Studio',
  description: 'Thông tin bảo hành đường may, khóa kéo 6 tháng và hỗ trợ sửa chữa miễn phí cho tất cả sản phẩm thời trang ET.TEE.',
};

export default function WarrantyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-4xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <Link href="/policy" className="hover:underline">Chính sách</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Chính sách bảo hành</span>
        </div>

        <article className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          
          <div className="border-b border-gray-100 pb-6">
            <span className="inline-block px-3 py-1 bg-amber-500 text-slate-950 text-xs font-black uppercase rounded-full mb-3 shadow-xs">
              Product Warranty
            </span>
            <h1 className="text-3xl font-black uppercase text-slate-900">
              Chính Sách Bảo Hành & Sửa Chữa ET.TEE
            </h1>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            
            <div className="p-5 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-900">
                <strong className="block font-bold">Bảo hành đường may & phụ kiện 6 tháng:</strong>
                <span>ET.TEE cam kết hỗ trợ sửa chữa hoàn toàn miễn phí các lỗi bung chỉ, sứt khóa kéo, đứt cúc áo trong vòng 6 tháng kể từ khi mua hàng.</span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                <span>1. Danh Mục Sản Phẩm Được Bảo Hành</span>
              </h2>
              <ul className="space-y-2 pl-4 list-disc text-gray-600">
                <li><strong>Áo Sơ Mi, Áo Polo, Áo Phông:</strong> Bảo hành đường chỉ may, cúc áo, bác tay và đường cuốn biên.</li>
                <li><strong>Quần Tây, Quần Jeans, Quần Kaki:</strong> Bảo hành đỉa quần, đường may đũng, khóa kéo mạ đồng.</li>
                <li><strong>Áo Khoác, Áo Phao, Áo Windbreaker:</strong> Bảo hành khóa kéo chính, cúc bấm, dây rút gấu áo.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-bold text-slate-900 uppercase flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>2. Đổi Mới Khi Có Lỗi Từ Nhà Sản Xuất</span>
              </h2>
              <p>
                Trường hợp sản phẩm bị lỗi vải (lốm đốm màu, thủng lỗ bẩm sinh, lệch phom dáng), ET.TEE sẽ đổi mới 100% sản phẩm khác hoàn toàn miễn phí cho khách hàng mà không mất thêm bất kỳ chi phí nào.
              </p>
            </div>

          </div>

        </article>

      </div>
    </main>
  );
}
