"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, TrendingUp, Eye, MousePointer, DollarSign,
  Tag, Megaphone, Image as ImageIcon, ArrowUp, ArrowDown, Minus, Loader2
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type DateRange = "today" | "7d" | "30d" | "all";

interface CampaignStat {
  rank: number;
  name: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  trend?: "up" | "down" | "flat";
}

interface VoucherStat {
  code: string;
  name?: string;
  used: number;
  totalDiscount: number;
  avgOrder: number;
  convRate: number;
}

interface BannerStat {
  name: string;
  position: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface AnalyticsData {
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  conversions: number;
  vouchersUsed: number;
  campaigns: CampaignStat[];
  vouchers: VoucherStat[];
  banners: BannerStat[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("vi-VN");
}

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M₫`;
  return `${n.toLocaleString("vi-VN")}₫`;
}

function TrendIcon({ trend }: { trend?: "up" | "down" | "flat" }) {
  if (trend === "up") return <ArrowUp className="w-3.5 h-3.5 text-emerald-500 inline shrink-0" />;
  if (trend === "down") return <ArrowDown className="w-3.5 h-3.5 text-rose-500 inline shrink-0" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400 inline shrink-0" />;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MarketingAnalyticsPage() {
  const [range, setRange] = useState<DateRange>("7d");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    impressions: 0,
    clicks: 0,
    ctr: 0,
    revenue: 0,
    conversions: 0,
    vouchersUsed: 0,
    campaigns: [],
    vouchers: [],
    banners: [],
  });

  const fetchAnalytics = useCallback(async (selectedRange: DateRange) => {
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders() as Record<string, string>;

      let since = "";
      const now = new Date();
      if (selectedRange === "today") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        since = startOfDay.toISOString();
      } else if (selectedRange === "7d") {
        const d = new Date(now.getTime() - 7 * 86400000);
        since = d.toISOString();
      } else if (selectedRange === "30d") {
        const d = new Date(now.getTime() - 30 * 86400000);
        since = d.toISOString();
      }

      const url = since
        ? `${baseUrl}/api/staff/marketing/analytics/overview?since=${encodeURIComponent(since)}`
        : `${baseUrl}/api/staff/marketing/analytics/overview`;

      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`Lỗi tải dữ liệu hiệu quả (HTTP ${res.status})`);
      const json = await res.json();
      const d = json?.data ?? json ?? {};

      setAnalytics({
        impressions: Number(d.impressions ?? 0),
        clicks: Number(d.clicks ?? 0),
        ctr: Number(d.ctr ?? 0),
        revenue: Number(d.revenue ?? 0),
        conversions: Number(d.conversions ?? 0),
        vouchersUsed: Number(d.vouchersUsed ?? 0),
        campaigns: Array.isArray(d.campaigns) ? d.campaigns : [],
        vouchers: Array.isArray(d.vouchers) ? d.vouchers : [],
        banners: Array.isArray(d.banners) ? d.banners : [],
      });
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải dữ liệu hiệu quả marketing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics(range);
  }, [range, fetchAnalytics]);

  const maxImpressions = analytics.campaigns.length > 0
    ? Math.max(...analytics.campaigns.map(c => c.impressions || 1))
    : 1;

  const maxBannerImpressions = analytics.banners.length > 0
    ? Math.max(...analytics.banners.map(b => b.impressions || 1))
    : 1;

  const voucherColumns: Column<VoucherStat>[] = [
    {
      key: 'code',
      header: 'Mã Voucher',
      render: (v) => (
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
          {v.code}
        </span>
      )
    },
    {
      key: 'used',
      header: 'Đã Dùng',
      render: (v) => <span className="font-bold text-slate-800">{v.used.toLocaleString()}</span>
    },
    {
      key: 'totalDiscount',
      header: 'Tổng Giảm Giá',
      render: (v) => <span className="font-semibold text-rose-600">{fmtMoney(v.totalDiscount)}</span>
    },
    {
      key: 'avgOrder',
      header: 'Giá Trị ĐH Trung Bình',
      render: (v) => <span className="text-slate-600 font-medium">{fmtMoney(v.avgOrder)}</span>
    },
    {
      key: 'convRate',
      header: 'Tỷ Lệ Thành Công',
      render: (v) => (
        <span className="font-bold text-emerald-600">
          {v.convRate}%
        </span>
      )
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50/60 p-6 text-slate-800 md:p-8 font-sans antialiased">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Hiệu Quả Marketing"
          subtitle="Thống kê tổng hợp số liệu thực tế về chiến dịch, banner quảng cáo, và voucher"
          breadcrumbs={[
            { label: 'Staff Hub', href: '/staff/dashboard' },
            { label: 'Marketing', href: '/staff/dashboard/marketing' },
            { label: 'Hiệu quả' }
          ]}
          actions={
            <div className="flex gap-1 rounded-xl bg-slate-100 border border-slate-200 p-1">
              {([["today", "Hôm nay"], ["7d", "7 ngày"], ["30d", "30 ngày"], ["all", "Tất cả"]] as [DateRange, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setRange(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${range === val
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"}`}
                >{label}</button>
              ))}
            </div>
          }
        />

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-4 text-purple-600 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang cập nhật số liệu thời gian thực...</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Lượt hiển thị", value: fmtNum(analytics.impressions), icon: Eye, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
            { label: "Lượt click", value: fmtNum(analytics.clicks), icon: MousePointer, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
            { label: "CTR TB", value: `${analytics.ctr}%`, icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Doanh thu KM", value: fmtMoney(analytics.revenue), icon: DollarSign, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
            { label: "Chuyển đổi", value: fmtNum(analytics.conversions), icon: Megaphone, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
            { label: "Voucher dùng", value: fmtNum(analytics.vouchersUsed), icon: Tag, color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-4 bg-white shadow-sm ${bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-[11px] text-slate-600 font-semibold leading-tight">{label}</span>
              </div>
              <p className={`text-xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaign Performance */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-semibold text-slate-900">Chiến dịch nổi bật</h2>
              </div>
              <span className="text-xs text-slate-500">{analytics.campaigns.length} chiến dịch</span>
            </div>
            <div className="p-4 space-y-4">
              {analytics.campaigns.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Chưa có dữ liệu chiến dịch trong khoảng thời gian này
                </div>
              ) : (
                analytics.campaigns.map(c => (
                  <div key={c.rank} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-slate-400 w-4 shrink-0">#{c.rank}</span>
                        <span className="font-semibold text-slate-800 text-sm truncate">{c.name}</span>
                        <TrendIcon trend={c.trend} />
                      </div>
                      <span className="text-xs font-bold text-purple-700 shrink-0">{fmtNum(c.impressions)} lượt</span>
                    </div>
                    <ProgressBar value={c.impressions} max={maxImpressions} color="bg-purple-600" />
                    <div className="flex gap-4 text-[11px] text-slate-500 font-medium">
                      <span>👁 {fmtNum(c.impressions)}</span>
                      <span>🖱 {fmtNum(c.clicks)}</span>
                      <span>CTR {c.ctr}%</span>
                      <span>🛒 {c.conversions}</span>
                      <span className="text-amber-700 font-bold">{fmtMoney(c.revenue)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Banner Performance */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-semibold text-slate-900">Hiệu quả Banner</h2>
              </div>
              <span className="text-xs text-slate-500">{analytics.banners.length} banner</span>
            </div>
            <div className="p-4 space-y-4">
              {analytics.banners.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Chưa có dữ liệu banner trong khoảng thời gian này
                </div>
              ) : (
                analytics.banners.map((b, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{b.name}</p>
                        <span className="text-[10px] font-mono text-slate-500">{b.position}</span>
                      </div>
                      <span className="text-xs font-bold text-rose-600 shrink-0">CTR {b.ctr}%</span>
                    </div>
                    <ProgressBar value={b.impressions} max={maxBannerImpressions} color="bg-rose-600" />
                    <div className="flex gap-4 text-[11px] text-slate-500 font-medium">
                      <span>👁 {fmtNum(b.impressions)}</span>
                      <span>🖱 {fmtNum(b.clicks)}</span>
                      <span>CTR {b.ctr}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Voucher Usage */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Sử dụng Voucher</h2>
          </div>
          <DataTable<VoucherStat>
            columns={voucherColumns}
            data={analytics.vouchers}
            rowKey={(v) => v.code}
            emptyTitle="Không có dữ liệu voucher"
            emptyMessage="Chưa có lượt sử dụng voucher nào trong khoảng thời gian này."
          />
        </div>
      </div>
    </main>
  );
}
