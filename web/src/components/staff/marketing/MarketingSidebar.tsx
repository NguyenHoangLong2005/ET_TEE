'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Tag,
  Megaphone,
  PackageSearch,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';

const NAV = [
  { href: '/staff/marketing/dashboard',  label: 'Tổng quan',   icon: LayoutDashboard },
  { href: '/staff/marketing/banners',    label: 'Banner',      icon: ImageIcon },
  { href: '/staff/marketing/vouchers',   label: 'Voucher',     icon: Tag },
  { href: '/staff/marketing/campaigns',  label: 'Campaign',    icon: Megaphone },
  { href: '/staff/marketing/placements', label: 'Trưng bày',   icon: PackageSearch },
  { href: '/staff/marketing/analytics',  label: 'Analytics',   icon: BarChart3 },
];

export default function MarketingSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">
          Marketing
        </div>
        <div className="mt-1 text-base font-semibold text-slate-900">
          ET.TEE Studio
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (pathname?.startsWith(href + '/') ?? false);
          return (
            <Link
              key={href}
              href={href}
              className={[
                'group flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
              ].join(' ')}
            >
              <Icon size={15} className={active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'} />
              <span>{label}</span>
              {active ? null : (
                <ArrowUpRight size={12} className="ml-auto opacity-0 group-hover:opacity-60 text-slate-400" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 my-4 p-3 rounded-md bg-slate-50 border border-slate-200">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
          Mẹo
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
          Theo dõi hiệu quả chiến dịch và tối ưu vị trí hiển thị sản phẩm ngay trong bảng điều khiển.
        </p>
      </div>
    </aside>
  );
}
