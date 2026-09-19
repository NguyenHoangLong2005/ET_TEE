import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Calendar, ArrowLeft, Share2, Sparkles, CheckCircle2 } from 'lucide-react';
import { ARTICLES } from '../page';

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = ARTICLES.find(a => a.slug === slug);

  if (!article) {
    notFound();
  }

  const related = ARTICLES.filter(a => a.slug !== article.slug);

  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <div className="container mx-auto px-4 xl:px-8 max-w-3xl">
        
        {/* Back Link */}
        <Link href="/news" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang tin tức</span>
        </Link>

        {/* Article Container */}
        <article className="bg-white p-6 md:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Category & Date Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 text-xs">
            <span className="bg-amber-100 text-amber-900 font-bold uppercase tracking-wider px-3 py-1 rounded-full text-[11px] border border-amber-300">
              {article.category}
            </span>

            <div className="flex items-center gap-4 text-gray-400 font-medium">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {article.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.readTime}</span>
            </div>
          </div>

          {/* Title & Summary */}
          <h1 className="text-2xl md:text-3xl font-black uppercase text-slate-900 leading-tight">
            {article.title}
          </h1>

          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 font-semibold text-slate-800 text-xs leading-relaxed italic">
            "{article.summary}"
          </div>

          {/* Featured Image */}
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.img}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Article Body Content */}
          <div className="text-sm leading-relaxed text-slate-700 space-y-4 pt-4 border-t border-gray-100">
            <p>
              Khi lựa chọn trang phục thời trang hằng ngày, phom dáng và chất liệu luôn là hai yếu tố hàng đầu quyết định sự tự tin của người mặc. Tại ET.TEE, mỗi đường kim mũi chỉ đều được thiết kế tỉ mỉ dựa trên nghiên cứu vóc dáng thực tế của hơn 100.000 người tiêu dùng Việt Nam.
            </p>

            <h3 className="font-bold text-slate-900 text-base pt-2">1. Hiểu Đúng Về Phom Dáng Dành Cho Bạn</h3>
            <p>
              Một chiếc áo vừa vặn là khi rộng vai ôm vừa đỉnh xương vai, độ dài áo vừa qua thắt lưng 5-7cm và nách áo không bị đùn vải. Nếu bạn có thân hình cân đối, phom <strong>Slim Fit</strong> ôm nhẹ sẽ tôn vòng ngực và vòng eo hoàn hảo. Nếu bạn thích sự thoải mái, phom <strong>Regular Fit</strong> là sự lựa chọn an toàn tuyệt đối.
            </p>

            <h3 className="font-bold text-slate-900 text-base pt-2">2. Chất Liệu Cao Cấp – Bí Quyết Giữ Phom Bền Lâu</h3>
            <p>
              ET.TEE ưu tiên sử dụng dòng chất liệu <strong>Eco-Cotton 95% kết hợp 5% Spandex</strong>. Sự kết hợp này mang lại bề mặt vải mềm mịn, thấm hút mồ hôi vượt trội và co giãn 4 chiều linh hoạt mà không lo biến dạng hay bai gião sau nhiều lần giặt.
            </p>

            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>3 Mẹo Nhỏ Cần Lưu Ý Từ ET.TEE:</span>
              </span>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Luôn lộn trái áo khi giặt máy để giữ màu vải luôn tươi mới.</li>
                <li>Không ngâm sản phẩm với dung dịch tẩy rửa nồng độ cao quá 15 phút.</li>
                <li>Phơi áo trên móc treo có độ rộng vừa phải để tránh làm vểnh vai áo.</li>
              </ul>
            </div>
          </div>

          {/* Bottom Share & Nav */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Chia sẻ bài viết này:</span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-amber-100 text-slate-900 rounded-lg text-xs font-bold transition-colors">
                Facebook
              </button>
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-amber-100 text-slate-900 rounded-lg text-xs font-bold transition-colors">
                Copy Link
              </button>
            </div>
          </div>

        </article>

        {/* Related Articles */}
        <div className="mt-12 space-y-4">
          <h3 className="text-sm font-black uppercase text-slate-900">Bài viết liên quan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {related.map(r => (
              <Link key={r.slug} href={`/news/${r.slug}`} className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 transition-all flex gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.img} alt={r.title} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">{r.category}</span>
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">{r.title}</h4>
                  <span className="text-[10px] text-gray-400">{r.readTime}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
