import Link from 'next/link';

export default function TrendingBlock() {
  return (
    <section className="relative w-full h-[600px] md:h-[700px] bg-gray-100 overflow-hidden">
      {/* Background Image - Using the actual Uniqlo banner downloaded */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/banner_uniqlo_0.jpg"
        alt="Trending Outfit"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Dark overlay for text readability on the left */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 xl:px-8 flex flex-col justify-end pb-20 md:pb-32">
        <div className="max-w-2xl text-white">
          <span className="inline-block bg-black text-white text-[10px] md:text-xs font-bold tracking-widest uppercase px-3 py-1 mb-4">
            Trending
          </span>
          
          <h2 className="text-3xl md:text-5xl font-normal tracking-tight mb-3">
            Áo Nỉ Chui Đầu Cài Nút
          </h2>
          
          <p className="text-sm md:text-base text-gray-200 mb-6 max-w-xl">
            Phom dáng thoải mái cùng cổ đứng tinh tế, phối cùng Quần Nỉ Ống Rộng để hoàn thiện set đồ. Dành riêng cho mùa thu đông 2026.
          </p>
          
          <div className="flex items-center gap-6">
            <span className="text-3xl md:text-4xl font-bold tracking-tighter">
              784.000 VND
            </span>
            <Link 
              href="/products" 
              className="bg-white text-black text-sm md:text-base font-bold px-6 py-3 hover:bg-gray-100 transition-colors hidden sm:block"
            >
              MUA NGAY
            </Link>
          </div>
          <Link 
            href="/products" 
            className="bg-white text-black text-sm font-bold px-6 py-3 hover:bg-gray-100 transition-colors mt-6 inline-block sm:hidden w-max"
          >
            MUA NGAY
          </Link>
        </div>
      </div>
    </section>
  );
}
