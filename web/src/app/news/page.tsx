import Link from 'next/link';
import { Newspaper, Clock, Eye, ArrowRight, Tag, Sparkles } from 'lucide-react';
import { ARTICLES } from '@/data/articles';
import SafeImage from '@/components/ui/SafeImage';
import { getApiBaseUrl } from '@/lib/api-config';

export const metadata = {
  title: 'Tin Tức & Blog Thời Trang | ET.TEE Studio',
  description: 'Cập nhật tin tức mới nhất về xu hướng thời trang, mẹo phối đồ nam nữ, bí quyết chọn size và kiến thức về các loại chất liệu cao cấp từ ET.TEE.',
};

export default async function NewsPage() {
  let articles = ARTICLES;
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/marketing/posts`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      const livePosts = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
      if (livePosts.length > 0) {
        articles = livePosts.map((p: any, idx: number) => ({
          slug: p.slug,
          title: p.title,
          category: (Array.isArray(p.tags) && p.tags[0]) ? p.tags[0] : (typeof p.tags === 'string' && p.tags.trim() ? p.tags.split(',')[0].trim() : 'Tin tức'),
          date: new Date(p.publishedAt || p.createdAt || Date.now()).toLocaleDateString('vi-VN'),
          readTime: '4 phút đọc',
          summary: p.excerpt || p.title,
          img: p.coverImageUrl || 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop',
          featured: idx === 0,
        }));
      }
    }
  } catch {
    articles = ARTICLES;
  }

  const featuredArticle = articles.find(a => a.featured) || articles[0];
  const regularArticles = articles.filter(a => a.slug !== featuredArticle.slug);

  return (
    <main className="min-h-screen bg-slate-50/70 pt-6 pb-24">
      <div className="container mx-auto px-4 xl:px-8 max-w-5xl">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:underline">Trang chủ</Link>
          <span>/</span>
          <span className="font-bold text-slate-900">Tin tức & Blog</span>
        </div>

        {/* Hero Header */}
        <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl mb-10 shadow-md relative overflow-hidden border border-slate-200/80">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-50 text-amber-900 text-xs font-bold uppercase tracking-widest rounded-full border border-amber-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>ET.TEE Fashion & Lifestyle Mag</span>
            </span>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900">
              Tin Tức & Bí Quyết Phối Đồ
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Cập nhật những xu hướng thời trang mới nhất, mẹo phối đồ chuẩn dáng và bí quyết giữ trang phục luôn bền đẹp cùng thời gian.
            </p>
          </div>
        </div>

        {/* Featured Article Card */}
        {featuredArticle && (
          <div className="mb-12">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Bài viết nổi bật</span>
            </h2>

            <Link 
              href={`/news/${featuredArticle.slug}`} 
              className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 grid grid-cols-1 md:grid-cols-2 hover:-translate-y-1"
            >
              <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-slate-100">
                <SafeImage
                  src={featuredArticle.img}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <span className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md">
                  {featuredArticle.category}
                </span>
              </div>

              <div className="p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                    <span>{featuredArticle.date}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {featuredArticle.readTime}</span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 group-hover:text-amber-600 transition-colors leading-snug">
                    {featuredArticle.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {featuredArticle.summary}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  <span>Đọc bài viết chi tiết</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Regular Articles Grid */}
        {regularArticles.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4">
              Bài viết mới cập nhật
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {regularArticles.map((art) => (
                <Link 
                  key={art.slug} 
                  href={`/news/${art.slug}`} 
                  className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <SafeImage
                        src={art.img}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <span className="absolute top-3 left-3 bg-slate-900 text-white text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                        {art.category}
                      </span>
                    </div>

                    <div className="p-6 space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{art.date}</span>
                        <span>•</span>
                        <span>{art.readTime}</span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
                        {art.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {art.summary}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-2 text-xs font-bold text-amber-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Đọc tiếp</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
