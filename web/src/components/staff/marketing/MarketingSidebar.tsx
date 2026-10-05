'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Tag,
  BarChart3,
} from 'lucide-react';

const NAV = [
  { href: '/staff/marketing/dashboard',  label: 'Tổng quan',  icon: LayoutDashboard },
  { href: '/staff/dashboard/marketing/homepage', label: 'Trang chủ', icon: ImageIcon },
  { href: '/staff/marketing/vouchers',   label: 'Voucher',    icon: Tag },
  { href: '/staff/marketing/analytics',  label: 'Analytics',  icon: BarChart3 },
];

export default function MarketingSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-4 py-4 border-b border-slate-100">
        <div
          className="text-[10px] font-bold text-slate-400 uppercase"
          style={{ letterSpacing: '0.08em' }}
        >
          Marketing
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-900">
          ET.TEE Studio
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (pathname?.startsWith(href + '/') ?? false);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={active ? {
                background: '#F9E2E5',   /* primary-100 */
                color: '#6E0013',        /* primary-900 */
              } : {
                color: '#64748B',        /* text-secondary */
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = '#F1F5F9';
                  (e.currentTarget as HTMLElement).style.color = '#0F172A';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = '';
                  (e.currentTarget as HTMLElement).style.color = '#64748B';
                }
              }}
            >
              <Icon
                size={15}
                style={active ? { color: '#6E0013' } : { color: '#94A3B8' }}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
