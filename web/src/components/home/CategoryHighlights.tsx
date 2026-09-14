import Link from 'next/link';

const CATEGORIES = [
  {
    id: 'women',
    name: 'Thời Trang Nữ',
    sub: 'Áo, Váy, Quần',
    href: '/products?category=women',
    img: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-2 lg:row-span-2',
    tall: true,
  },
  {
    id: 'men',
    name: 'Thời Trang Nam',
    sub: 'Sơ mi, Polo, Khoác',
    href: '/products?category=men',
    img: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-1',
    tall: false,
  },
  {
    id: 'kids',
    name: 'Trẻ Em',
    sub: 'Size 90 – 160',
    href: '/products?category=kids',
    img: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-1',
    tall: false,
  },
  {
    id: 'accessories',
    name: 'Phụ Kiện',
    sub: 'Túi, Mũ, Thắt lưng',
    href: '/products?category=accessories',
    img: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-1',
    tall: false,
  },
  {
    id: 'family',
    name: 'Family Set',
    sub: 'Mặc đồng điệu cả nhà',
    href: '/products?category=family',
    img: 'https://images.unsplash.com/photo-1543269664-76bc3997d9ea?q=80&w=800&auto=format&fit=crop',
    span: 'lg:col-span-1',
    tall: false,
  },
];

export default function CategoryHighlights() {
  return (
    <section className="py-14 md:py-20 bg-white">
      <div className="container mx-auto px-4 xl:px-8">
        {/* Section header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#e50027] mb-1">Danh mục</p>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">KHÁM PHÁ BỘ SƯU TẬP</h2>
          </div>
          <Link href="/products" className="text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors border-b border-slate-300 pb-0.5 hidden sm:block">
            Xem tất cả
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[200px] md:auto-rows-[240px]">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className={`group relative overflow-hidden rounded-lg bg-gray-100 ${cat.span} ${cat.tall ? 'row-span-2' : ''}`}
            >
              {/* Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.img}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Dark overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {/* Label */}
              <div className="absolute bottom-0 left-0 p-4 md:p-5">
                <p className="text-white text-xs font-medium opacity-80 mb-1">{cat.sub}</p>
                <h3 className="text-white font-black text-base md:text-xl leading-tight tracking-tight">{cat.name}</h3>
                <span className="inline-flex items-center gap-1 mt-2 text-white text-[11px] font-bold tracking-wider uppercase opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  Xem ngay →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
