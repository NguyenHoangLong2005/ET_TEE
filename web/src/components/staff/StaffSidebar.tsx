'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/staff/dashboard', label: '📊 Tổng quan', roles: ['STAFF', 'ADMIN'] },
  { href: '/staff/products', label: '📦 Sản phẩm & Tồn kho', roles: ['STAFF', 'ADMIN'] },
  { href: '/staff/orders', label: '🚚 Đơn hàng', roles: ['STAFF', 'ADMIN'] },
  { href: '/staff/marketing/banners', label: '🎨 Banner', roles: ['STAFF', 'ADMIN'] },
  { href: '/staff/marketing/vouchers', label: '🎟️ Voucher', roles: ['STAFF', 'ADMIN'] },
  { href: '/staff/marketing/campaigns', label: '📢 Campaign', roles: ['STAFF', 'ADMIN'] },
  { href: '/staff/marketing/dashboard', label: '🎯 Marketing Studio', roles: ['MARKETING_STAFF', 'ADMIN'] },
  { href: '/staff/marketing/placements', label: '🧱 Product Placements', roles: ['MARKETING_STAFF', 'ADMIN'] },
  { href: '/staff/marketing/analytics', label: '📊 Analytics', roles: ['MARKETING_STAFF', 'ADMIN'] },
];

export default function StaffSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 mb-6">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-4 py-2 rounded-lg font-medium text-xs border transition ${
            pathname === item.href || pathname.startsWith(item.href + '/')
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
