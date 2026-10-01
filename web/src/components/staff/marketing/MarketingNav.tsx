"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/staff/dashboard/marketing", label: "Tổng quan" },
  { href: "/staff/dashboard/marketing/homepage", label: "Trang chủ" },
  { href: "/staff/dashboard/marketing/posts", label: "Bài viết" },
  { href: "/staff/dashboard/marketing/vouchers", label: "Voucher" },
  { href: "/staff/dashboard/marketing/analytics", label: "Hiệu quả" },
];

export default function MarketingNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 text-xs font-semibold">
      {LINKS.map((l) => {
        const active =
          l.href === "/staff/dashboard/marketing"
            ? pathname === l.href
            : pathname?.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg border px-3 py-2 transition ${
              active
                ? "border-purple-300 bg-purple-50 text-purple-700 font-bold"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
