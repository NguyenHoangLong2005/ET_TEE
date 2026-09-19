import Link from 'next/link';
import { Truck, RefreshCcw, ShieldCheck, PhoneCall } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: Truck,
    title: 'Giao Hàng Miễn Phí',
    desc: 'Áp dụng cho mọi đơn hàng từ 499.000đ',
    href: '/policy/shipping',
  },
  {
    icon: RefreshCcw,
    title: 'Đổi Trả 30 Ngày',
    desc: 'Đổi trả tận nơi hoặc trực tiếp tại cửa hàng',
    href: '/policy/return',
  },
  {
    icon: ShieldCheck,
    title: 'Chất Liệu An Toàn',
    desc: 'Chứng nhận 100% Cotton & vải lành tính',
    href: '/about',
  },
  {
    icon: PhoneCall,
    title: 'Tư Vấn Hỗ Trợ 24/7',
    desc: 'Hotline miễn cước: 1900 1234 (8h - 22h)',
    href: '/contact',
  },
];

export default function TrustBar() {
  return (
    <section className="py-12 bg-white border-y border-gray-200">
      <div className="container mx-auto px-4 xl:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
          {TRUST_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link 
                key={index}
                href={item.href}
                className="flex flex-col items-center text-center lg:border-r lg:border-gray-200 last:border-r-0 px-6 group cursor-pointer"
              >
                <div className="mb-3 text-slate-900 group-hover:scale-110 group-hover:text-amber-500 transition-all duration-300">
                  <Icon className="w-8 h-8 stroke-1" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1 group-hover:text-amber-600 transition-colors">
                  {item.title}
                </h4>
                <p className="text-[11px] text-gray-500 max-w-[200px] leading-relaxed">
                  {item.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
