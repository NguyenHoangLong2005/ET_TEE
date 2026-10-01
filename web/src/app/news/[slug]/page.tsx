import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Calendar, ArrowLeft } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import ViewTracker from './ViewTracker';

// Staff write plain text in the posts form: blank line between paragraphs, "## " for a section
// heading, "- " for bullets. Rendered as React text rather than innerHTML so a post cannot inject markup.
function PostBody({ content }: { content: string }) {
  const blocks = content.replace(/\r\n/g, '\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return (
    <div className="text-sm leading-relaxed text-slate-700 space-y-4 pt-4 border-t border-slate-100">
      {blocks.map((block, i) => {
        if (block.startsWith('## ')) {
          return <h3 key={i} className="font-bold text-slate-900 text-base pt-2">{block.slice(3).trim()}</h3>;
        }
        const lines = block.split('\n');
        if (lines.every(l => l.trimStart().startsWith('- '))) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {lines.map((l, j) => <li key={j}>{l.trimStart().slice(2)}</li>)}
            </ul>
          );
        }
        return <p key={i} className="whitespace-pre-line">{block}</p>;
      })}
    </div>
  );
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let article: any = null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/marketing/posts/${slug}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      const p = json?.data || json;
      if (p && p.slug) {
        article = {
          slug: p.slug,
          title: p.title,
          category: (Array.isArray(p.tags) && p.tags[0]) ? p.tags[0] : (typeof p.tags === 'string' && p.tags.trim() ? p.tags.split(',')[0].trim() : 'Tin tức'),
          date: new Date(p.publishedAt || p.createdAt || Date.now()).toLocaleDateString('vi-VN'),
          readTime: '4 phút đọc',
          summary: p.excerpt || p.title,
          img: p.coverImageUrl || 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop',
          content: p.content,
        };
      }
    }
  } catch {}

  if (!article) {
    notFound();
  }

  // Other published posts; previously this listed the hardcoded demo articles whatever was published.
  let related: { slug: string; title: string; category: string; img: string }[] = [];
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/marketing/posts`, { next: { revalidate: 60 } });
    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      related = list
        .filter((p: any) => p.slug !== article.slug)
        .slice(0, 4)
        .map((p: any) => ({
          slug: p.slug,
          title: p.title,
          category: (Array.isArray(p.tags) && p.tags[0]) ? p.tags[0] : 'Tin tức',
          img: p.coverImageUrl || 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop',
        }));
    }
  } catch {}

  return (
    <main className="min-h-screen bg-slate-50/50 pt-6 pb-20">
      <ViewTracker slug={article.slug} />
      <div className="container mx-auto px-4 xl:px-8 max-w-3xl">
        
        {/* Back Link */}
        <Link href="/news" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang tin tức</span>
        </Link>

        {/* Article Container */}
        <article className="bg-white p-6 md:p-10 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          
          {/* Category & Date Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-xs">
            <span className="bg-amber-100 text-amber-900 font-bold uppercase tracking-wider px-3 py-1 rounded-full text-[11px] border border-amber-300">
              {article.category}
            </span>

            <div className="flex items-center gap-4 text-slate-400 font-medium">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {article.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.readTime}</span>
            </div>
          </div>

          {/* Title & Summary */}
          <h1 className="text-2xl md:text-3xl font-black uppercase text-slate-900 leading-tight">
            {article.title}
          </h1>

          {article.summary && (
            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 font-semibold text-slate-800 text-xs leading-relaxed italic">
              "{article.summary}"
            </div>
          )}

          {/* Featured Image */}
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.img}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Article Body Content */}
          {article.content && <PostBody content={article.content} />}

          {/* Bottom Share & Nav */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Chia sẻ bài viết này:</span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-900 rounded-lg text-xs font-bold transition-colors">
                Facebook
              </button>
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-900 rounded-lg text-xs font-bold transition-colors">
                Copy Link
              </button>
            </div>
          </div>

        </article>

        {/* Related Articles */}
        {related.length > 0 && (
        <div className="mt-12 space-y-4">
          <h3 className="text-sm font-black uppercase text-slate-900">Bài viết liên quan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {related.map(r => (
              <Link key={r.slug} href={`/news/${r.slug}`} className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 transition-all flex gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.img} alt={r.title} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">{r.category}</span>
                  <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">{r.title}</h4>
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
