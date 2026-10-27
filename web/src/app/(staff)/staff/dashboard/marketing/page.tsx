"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";
import {
  AlertCircle, BarChart3, ChevronRight, Eye, FileText, LayoutTemplate, MousePointerClick, Percent, Tag, TrendingUp,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";

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
    { label: "Lượt hiển thị", value: fmtNum(overview.impressions), icon: Eye },
    { label: "Lượt click", value: fmtNum(overview.clicks), icon: MousePointerClick },
    { label: "CTR", value: `${overview.ctr.toFixed(1)}%`, icon: Percent },
    { label: "Doanh thu từ khuyến mãi", value: fmtMoney(overview.revenue), icon: TrendingUp },
  ];

  const sections = [
    { href: "/staff/dashboard/marketing/homepage", label: "Trang chủ", icon: LayoutTemplate, stat: `${counts.activeBanners} banner đang hiển thị` },
    { href: "/staff/dashboard/marketing/vouchers", label: "Voucher", icon: Tag, stat: `${counts.activeVouchers} đang hiệu lực` },
    { href: "/staff/dashboard/marketing/posts", label: "Bài viết", icon: FileText, stat: `${counts.publishedPosts} đã đăng · ${counts.draftPosts} nháp` },
    { href: "/staff/dashboard/marketing/analytics", label: "Hiệu quả", icon: BarChart3, stat: "Báo cáo chi tiết" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-8 text-slate-900">
      <PageHeader
        title="Tổng quan marketing"
        subtitle="Hiệu quả banner, voucher và bài viết trong kỳ đã chọn."
        actions={
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {PERIODS.map(p => (
              <button
                key={p.days}
                type="button"
                onClick={() => setDays(p.days)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${days === p.days ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {failed && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Không tải được dữ liệu.
          <button type="button" onClick={() => void load()} className="font-medium underline">Thử lại</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(m => (
          <StatCard key={m.label} title={m.label} value={loading ? "—" : m.value} icon={m.icon} />
        ))}
      </div>

      {todo.length > 0 && (
        <Card noPadding title="Cần xử lý">
          <ul className="divide-y divide-slate-100">
            {todo.map(t => (
              <li key={t.text} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span className="flex items-center gap-2.5 text-slate-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />{t.text}
                </span>
                <Link href={t.href} className="shrink-0 font-medium text-slate-900 underline underline-offset-2 hover:text-primary">{t.cta}</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card noPadding title="Quản lý">
        <ul className="divide-y divide-slate-100">
          {sections.map(s => (
            <li key={s.href}>
              <Link href={s.href} className="group flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-slate-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-primary-50 group-hover:text-primary">
                  <s.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 font-semibold text-slate-900">{s.label}</span>
                <span className="text-slate-500">{loading ? "…" : s.stat}</span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
