import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'women',
    name: 'Thời Trang Nữ',
    sub: 'Áo, Váy, Quần & Phụ Kiện',
    badge: 'XU HƯỚNG',
    href: '/products?category=women',
    img: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-2 lg:row-span-2',
    tall: true,
  },
  {
    id: 'men',
    name: 'Thời Trang Nam',
    sub: 'Sơ mi, Polo, Áo khoác',
    badge: 'MUST-HAVE',
    href: '/products?category=men',
    img: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-1',
    tall: false,
  },
  {
    id: 'kids',
    name: 'Trẻ Em (Kids)',
    sub: 'Size 90 – 160 cm',
    badge: 'ORGANIC',
    href: '/products?category=kids',
    img: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-1',
    tall: false,
  },
  {
    id: 'accessories',
    name: 'Phụ Kiện',
    sub: 'Túi xách, Mũ, Thắt lưng',
    badge: 'HOT DEAL',
    href: '/products?category=accessories',
    img: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-1',
    tall: false,
  },
  {
    id: 'family',
    name: 'Family Set',
    sub: 'Mặc đồng điệu cả nhà',
    badge: 'EXCLUSIVE',
    href: '/products?category=family',
    img: 'https://images.unsplash.com/photo-1543269664-76bc3997d9ea?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-1',
    tall: false,
  },
];

export default function CategoryHighlights() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 xl:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-black tracking-tight uppercase">
              KHÁM PHÁ THEO DANH MỤC
            </h2>
          </div>
          
          <Link 
            href="/products" 
            className="inline-flex items-center gap-1.5 text-sm font-bold uppercase text-gray-500 hover:text-black transition-colors group"
          >
            <span>Xem tất cả</span>
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[220px] md:auto-rows-[260px]">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className={`group relative overflow-hidden bg-gray-100 transition-all duration-500 ${cat.span} ${cat.tall ? 'row-span-2' : ''}`}
            >
              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.img}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Dark overlay for text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="px-3 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-widest">
                  {cat.badge}
                </span>
              </div>

              {/* Card Label & Details */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <p className="text-white/80 text-xs md:text-sm mb-1">{cat.sub}</p>
                <h3 className="text-white font-bold text-xl md:text-3xl uppercase tracking-wide">
                  {cat.name}
                </h3>
                
                <div className="mt-4 flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                  <span className="border-b border-white pb-0.5">Khám phá</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

