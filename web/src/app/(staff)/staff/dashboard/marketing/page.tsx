"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";

type Overview = { impressions: number; clicks: number; ctr: number; revenue: number };
type Counts = {
  activeBanners: number; totalBanners: number;
  activeVouchers: number; expiringVouchers: number;
  publishedPosts: number; draftPosts: number;
};

const PERIODS = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
];

const EMPTY_OVERVIEW: Overview = { impressions: 0, clicks: 0, ctr: 0, revenue: 0 };
const EMPTY_COUNTS: Counts = {
  activeBanners: 0, totalBanners: 0, activeVouchers: 0,
  expiringVouchers: 0, publishedPosts: 0, draftPosts: 0,
};

const toList = (d: any): any[] => (Array.isArray(d) ? d : d?.data ?? d?.content ?? []);
const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M₫` : `${v.toLocaleString("vi-VN")}₫`;
const fmtNum = (v: number) => v.toLocaleString("vi-VN");

export default function MarketingDashboardPage() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview>(EMPTY_OVERVIEW);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const base = getApiBaseUrl();
    const headers = getAuthHeaders() as Record<string, string>;
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19);
    const get = async (path: string) => {
      const res = await fetch(`${base}/api/staff/marketing/${path}`, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(path);
      return res.json();
    };

    const [ov, banners, vouchers, posts] = await Promise.allSettled([
      get(`analytics/overview?since=${since}`),
      get("banners"),
      get("vouchers"),
      get("posts"),
    ]);
    if ([ov, banners, vouchers, posts].every(r => r.status === "rejected")) setFailed(true);

    if (ov.status === "fulfilled") {
      const o = ov.value?.data ?? ov.value;
      setOverview({
        impressions: Number(o?.impressions ?? 0),
        clicks: Number(o?.clicks ?? 0),
        ctr: Number(o?.ctr ?? 0),
        revenue: Number(o?.revenue ?? 0),
      });
    }

    const next: Counts = { ...EMPTY_COUNTS };
    if (banners.status === "fulfilled") {
      const arr = toList(banners.value);
      next.totalBanners = arr.length;
      next.activeBanners = arr.filter((b: any) => b.isActive || b.status === "ACTIVE").length;
    }
    if (vouchers.status === "fulfilled") {
      const arr = toList(vouchers.value).filter((v: any) => v.status === "ACTIVE" || v.isActive);
      next.activeVouchers = arr.length;
      next.expiringVouchers = arr.filter((v: any) => {
        const end = v.endDate ?? v.expiresAt ?? v.validTo;
        if (!end) return false;
        const left = (new Date(end).getTime() - Date.now()) / 86400000;
        return left >= 0 && left <= 7;
      }).length;
    }
    if (posts.status === "fulfilled") {
      const arr = toList(posts.value);
      next.publishedPosts = arr.filter((p: any) => p.status === "PUBLISHED").length;
      next.draftPosts = arr.filter((p: any) => p.status === "DRAFT").length;
    }
    setCounts(next);
    setLoading(false);
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const todo = [
    counts.activeBanners === 0 && !loading && { text: "Chưa có banner nào đang hiển thị", href: "/staff/dashboard/marketing/homepage", cta: "Chỉnh sửa trang chủ" },
    counts.expiringVouchers > 0 && { text: `${counts.expiringVouchers} voucher hết hạn trong 7 ngày tới`, href: "/staff/dashboard/marketing/vouchers", cta: "Xem voucher" },
    counts.draftPosts > 0 && { text: `${counts.draftPosts} bài viết còn ở bản nháp`, href: "/staff/dashboard/marketing/posts", cta: "Xem bài viết" },
  ].filter(Boolean) as { text: string; href: string; cta: string }[];

  const metrics = [
    { label: "Lượt hiển thị", value: fmtNum(overview.impressions) },
    { label: "Lượt click", value: fmtNum(overview.clicks) },
    { label: "CTR", value: `${overview.ctr.toFixed(1)}%` },
    { label: "Doanh thu từ khuyến mãi", value: fmtMoney(overview.revenue) },
  ];

  const sections = [
    { href: "/staff/dashboard/marketing/homepage", label: "Trang chủ", stat: `${counts.activeBanners} banner đang hiển thị` },
    { href: "/staff/dashboard/marketing/vouchers", label: "Voucher", stat: `${counts.activeVouchers} đang hiệu lực` },
    { href: "/staff/dashboard/marketing/posts", label: "Bài viết", stat: `${counts.publishedPosts} đã đăng · ${counts.draftPosts} nháp` },
    { href: "/staff/dashboard/marketing/analytics", label: "Hiệu quả", stat: "Báo cáo chi tiết" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="border-l-4 border-red-600 pl-3 text-xl font-semibold">Marketing</h1>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            {PERIODS.map(p => (
              <button
                key={p.days}
                type="button"
                onClick={() => setDays(p.days)}
                className={`rounded-md px-3 py-1 ${days === p.days ? "bg-red-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {failed && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Không tải được dữ liệu.
            <button type="button" onClick={() => void load()} className="font-medium underline">Thử lại</button>
          </div>
        )}

        <section className="grid grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white lg:grid-cols-4">
          {metrics.map(m => (
            <div key={m.label} className="border-t-2 border-red-600 p-4">
              <p className="text-xs text-slate-500">{m.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-red-700">{loading ? "…" : m.value}</p>
            </div>
          ))}
        </section>

        {todo.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium">Cần xử lý</h2>
            <ul className="divide-y divide-slate-100">
              {todo.map(t => (
                <li key={t.text} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-red-600" />{t.text}</span>
                  <Link href={t.href} className="font-medium text-red-600 underline underline-offset-2 hover:text-red-700">{t.cta}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium">Quản lý</h2>
          <ul className="divide-y divide-slate-100">
            {sections.map(s => (
              <li key={s.href}>
                <Link href={s.href} className="group flex items-center justify-between px-4 py-3 text-sm hover:bg-red-50/60">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-slate-500 group-hover:text-red-600">{loading ? "…" : s.stat} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
