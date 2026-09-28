"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";
import {
  Megaphone, Image as ImageIcon, FileText, Tag, Grid3X3,
  BarChart3, TrendingUp, Eye, MousePointer, DollarSign,
  Play, Pause, Plus, ArrowRight, Sparkles
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type CampaignSummary = {
  id: number;
  name: string;
  status: string;
  type: string;
  startDate?: string;
  endDate?: string;
};

// ─── Config ───────────────────────────────────────────────────────────────────
const CAMPAIGN_TYPE_CFG: Record<string, string> = {
  FLASH_SALE: "🔥 Flash Sale",
  SEASONAL:   "🌸 Seasonal",
  LOYALTY:    "👑 Loyalty",
  REFERRAL:   "🤝 Referral",
};

const CAMPAIGN_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: "Đang chạy",   cls: "bg-green-100 text-green-700 border-green-200" },
  SCHEDULED: { label: "Sắp diễn ra", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  PAUSED:    { label: "Tạm dừng",    cls: "bg-amber-100 text-amber-700 border-amber-200" },
  ENDED:     { label: "Đã kết thúc", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  CANCELLED: { label: "Đã hủy",      cls: "bg-rose-100 text-rose-700 border-rose-200" },
  DRAFT:     { label: "Bản nháp",    cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const QUICK_LINKS = [
  { href: "/staff/dashboard/marketing/campaigns", icon: Megaphone, label: "Chiến dịch", sub: "Tạo & quản lý campaign", color: "text-purple-700", bg: "bg-purple-50 hover:bg-purple-100/70 border-purple-200", iconBg: "bg-purple-600" },
  { href: "/staff/dashboard/marketing/banners", icon: ImageIcon, label: "Banner", sub: "Quản lý vị trí hiển thị", color: "text-rose-700", bg: "bg-rose-50 hover:bg-rose-100/70 border-rose-200", iconBg: "bg-rose-600" },
  { href: "/staff/dashboard/marketing/posts", icon: FileText, label: "Bài viết", sub: "Nội dung & landing page", color: "text-sky-700", bg: "bg-sky-50 hover:bg-sky-100/70 border-sky-200", iconBg: "bg-sky-600" },
  { href: "/staff/dashboard/marketing/vouchers", icon: Tag, label: "Voucher", sub: "Mã khuyến mãi & ưu đãi", color: "text-amber-700", bg: "bg-amber-50 hover:bg-amber-100/70 border-amber-200", iconBg: "bg-amber-600" },
  { href: "/staff/dashboard/marketing/product-placement", icon: Grid3X3, label: "Vị trí SP", sub: "Sản phẩm nổi bật / sale", color: "text-emerald-700", bg: "bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200", iconBg: "bg-emerald-600" },
  { href: "/staff/dashboard/marketing/analytics", icon: BarChart3, label: "Hiệu quả", sub: "Thống kê campaign & KPI", color: "text-indigo-700", bg: "bg-indigo-50 hover:bg-indigo-100/70 border-indigo-200", iconBg: "bg-indigo-600" },
];

const isEndingSoon = (endDate?: string) => {
  if (!endDate) return false;
  const days = (new Date(endDate).getTime() - Date.now()) / 86400000;
  return days >= 0 && days <= 3;
};

export default function MarketingDashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalBanners: 0,
    activeVouchers: 0,
    publishedPosts: 0,
    totalImpressions: 0,
    totalClicks: 0,
    avgCTR: 0,
    revenueFromPromo: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const baseUrl = getApiBaseUrl();
    const authHeaders = getAuthHeaders() as Record<string, string>;

    try {
      const [campRes, banRes, vouchRes, postRes, analyticsRes] = await Promise.allSettled([
        fetch(`${baseUrl}/api/staff/marketing/campaigns?size=10`, { headers: authHeaders, cache: "no-store" }),
        fetch(`${baseUrl}/api/staff/marketing/banners`, { headers: authHeaders, cache: "no-store" }),
        fetch(`${baseUrl}/api/staff/marketing/vouchers`, { headers: authHeaders, cache: "no-store" }),
        fetch(`${baseUrl}/api/staff/marketing/posts`, { headers: authHeaders, cache: "no-store" }),
        fetch(`${baseUrl}/api/staff/marketing/analytics/overview`, { headers: authHeaders, cache: "no-store" }),
      ]);

      let campList: CampaignSummary[] = [];
      if (campRes.status === "fulfilled" && campRes.value.ok) {
        const data = await campRes.value.json();
        campList = Array.isArray(data) ? data : (data?.data ?? data?.content ?? []);
      }

      let bannerCount = 0;
      if (banRes.status === "fulfilled" && banRes.value.ok) {
        const bData = await banRes.value.json();
        const arr = Array.isArray(bData) ? bData : (bData?.data ?? []);
        bannerCount = arr.filter((b: any) => b.isActive || b.status === "ACTIVE").length;
      }

      let voucherCount = 0;
      if (vouchRes.status === "fulfilled" && vouchRes.value.ok) {
        const vData = await vouchRes.value.json();
        const arr = Array.isArray(vData) ? vData : (vData?.data ?? []);
        voucherCount = arr.filter((v: any) => v.status === "ACTIVE" || v.isActive).length;
      }

      let postCount = 0;
      if (postRes.status === "fulfilled" && postRes.value.ok) {
        const pData = await postRes.value.json();
        const arr = Array.isArray(pData) ? pData : (pData?.data ?? []);
        postCount = arr.filter((p: any) => p.status === "PUBLISHED").length;
      }

      let impressions = 0;
      let clicks = 0;
      let ctr = 0;
      let revenue = 0;

      if (analyticsRes.status === "fulfilled" && analyticsRes.value.ok) {
        const aData = await analyticsRes.value.json();
        const overview = aData?.data ?? aData;
        impressions = Number(overview?.impressions ?? 0);
        clicks = Number(overview?.clicks ?? 0);
        ctr = Number(overview?.ctr ?? 0);
        revenue = Number(overview?.revenue ?? 0);
      }

      setCampaigns(campList);
      setStats({
        activeCampaigns: campList.filter(c => c.status === "ACTIVE").length,
        totalBanners: bannerCount,
        activeVouchers: voucherCount,
        publishedPosts: postCount,
        totalImpressions: impressions,
        totalClicks: clicks,
        avgCTR: ctr,
        revenueFromPromo: revenue,
      });
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fmtDate = (iso?: string) => iso
    ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  const fmtMoney = (v: number) => v >= 1000000
    ? `${(v / 1000000).toFixed(1)}M₫`
    : `${v.toLocaleString("vi-VN")}₫`;

  const toggleCampaignStatus = useCallback(async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setTogglingId(id);
    try {
      const baseUrl = getApiBaseUrl();
      const authHeaders = getAuthHeaders() as Record<string, string>;
      const res = await fetch(`${baseUrl}/api/staff/marketing/campaigns/${id}/status`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => (c.id === id ? { ...c, status: nextStatus } : c)));
      }
    } finally {
      setTogglingId(null);
    }
  }, []);

  const visibleCampaigns = campaigns.filter(c => c.status !== "ENDED" && c.status !== "CANCELLED");
  const endingSoonCount = campaigns.filter(c => c.status === "ACTIVE" && isEndingSoon(c.endDate)).length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Megaphone className="w-7 h-7 text-purple-600" />
              Marketing &amp; Kinh Doanh
            </h1>
            <p className="mt-1 text-sm text-slate-500">Quản lý toàn bộ hoạt động marketing: chiến dịch, banner, bài viết, voucher, vị trí hiển thị sản phẩm</p>
          </div>
          <Link href="/staff/dashboard/marketing/campaigns"
            className="rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2.5 text-sm font-bold text-white transition shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tạo chiến dịch mới
          </Link>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Chiến dịch đang chạy", value: stats.activeCampaigns, icon: Megaphone, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
            { label: "Lượt hiển thị", value: stats.totalImpressions >= 1000 ? `${(stats.totalImpressions / 1000).toFixed(1)}K` : stats.totalImpressions, icon: Eye, color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
            { label: "CTR trung bình", value: `${stats.avgCTR}%`, icon: MousePointer, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Doanh thu từ KM", value: fmtMoney(stats.revenueFromPromo), icon: DollarSign, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl border p-4 ${bg}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-slate-600 font-medium">{label}</span>
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_LINKS.map(({ href, icon: Icon, label, sub, color, bg, iconBg }) => (
            <Link key={href} href={href}
              className={`rounded-xl border p-4 flex flex-col gap-2 hover:scale-[1.02] transition-all duration-200 group ${bg}`}>
              <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className={`text-sm font-bold ${color}`}>{label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{sub}</p>
              </div>
              <ArrowRight className={`w-3 h-3 ${color} opacity-0 group-hover:opacity-100 transition-opacity mt-auto`} />
            </Link>
          ))}
        </div>

        {/* Active Campaigns + Secondary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active campaigns */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-semibold text-slate-900">Chiến dịch gần đây</h2>
                {endingSoonCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    {endingSoonCount} sắp kết thúc
                  </span>
                )}
              </div>
              <Link href="/staff/dashboard/marketing/campaigns"
                className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Đang tải dữ liệu...</div>
              ) : visibleCampaigns.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                  <Megaphone className="w-8 h-8 text-slate-300" />
                  <p className="font-semibold text-slate-700">Chưa có chiến dịch nào</p>
                  <p className="text-xs text-slate-400">Tạo chiến dịch khuyến mãi mới để tăng doanh số bán hàng.</p>
                  <Link href="/staff/dashboard/marketing/campaigns"
                    className="mt-2 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 font-medium">
                    Tạo chiến dịch
                  </Link>
                </div>
              ) : visibleCampaigns.map(c => {
                const statusCfg = CAMPAIGN_STATUS_CFG[c.status] ?? CAMPAIGN_STATUS_CFG.ENDED;
                const endingSoon = c.status === "ACTIVE" && isEndingSoon(c.endDate);
                const canToggle = c.status === "ACTIVE" || c.status === "PAUSED";
                return (
                  <div key={c.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.cls}`}>{statusCfg.label}</span>
                        {endingSoon && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Sắp kết thúc
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-slate-400">
                        <span>{CAMPAIGN_TYPE_CFG[c.type] ?? c.type}</span>
                        {c.startDate && <span>· {fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>}
                      </div>
                    </div>
                    {canToggle && (
                      <button
                        type="button"
                        disabled={togglingId === c.id}
                        onClick={() => toggleCampaignStatus(c.id, c.status)}
                        title={c.status === "ACTIVE" ? "Tạm dừng chiến dịch" : "Kích hoạt lại chiến dịch"}
                        className="shrink-0 w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 transition"
                      >
                        {c.status === "ACTIVE" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary stats */}
          <div className="space-y-3">
            {[
              { label: "Banner đang hiển thị", value: stats.totalBanners, icon: ImageIcon, href: "/staff/dashboard/marketing/banners", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
              { label: "Voucher đang hiệu lực", value: stats.activeVouchers, icon: Tag, href: "/staff/dashboard/marketing/vouchers", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
              { label: "Bài viết đã đăng", value: stats.publishedPosts, icon: FileText, href: "/staff/dashboard/marketing/posts", color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
              { label: "Lượt click", value: stats.totalClicks.toLocaleString(), icon: TrendingUp, href: "/staff/dashboard/marketing/analytics", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
            ].map(({ label, value, icon: Icon, href, color, bg }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-4 rounded-xl border p-4 hover:scale-[1.01] transition-all ${bg} group`}>
                <Icon className={`w-5 h-5 ${color} shrink-0`} />
                <div className="flex-1">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                </div>
                <ArrowRight className={`w-4 h-4 ${color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
