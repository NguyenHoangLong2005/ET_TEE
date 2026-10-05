"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type RangeKey = "today" | "7d" | "30d" | "90d" | "all";

type BannerStat = { bannerId?: number; name: string; position: string; impressions: number; clicks: number; ctr: number };
type VoucherStat = { code: string; name?: string; used: number; totalDiscount: number; avgOrder: number };
type Data = {
  impressions: number; clicks: number; ctr: number; conversions: number;
  conversionRate: number; revenue: number; vouchersUsed: number;
  banners: BannerStat[]; vouchers: VoucherStat[];
};

const RANGES: { key: RangeKey; label: string; days?: number }[] = [
  { key: "today", label: "Hôm nay", days: 0 },
  { key: "7d", label: "7 ngày", days: 7 },
  { key: "30d", label: "30 ngày", days: 30 },
  { key: "90d", label: "90 ngày", days: 90 },
  { key: "all", label: "Tất cả" },
];

const POSITION_LABEL: Record<string, string> = {
  HOME_HERO: "Đầu trang chủ", HERO: "Đầu trang chủ", HOME_MID: "Giữa trang chủ",
  CATEGORY_TOP: "Đầu danh mục", PRODUCT_DETAIL: "Chi tiết sản phẩm", MIDDLE: "Giữa trang", POPUP: "Popup",
};

const EMPTY: Data = {
  impressions: 0, clicks: 0, ctr: 0, conversions: 0, conversionRate: 0,
  revenue: 0, vouchersUsed: 0, banners: [], vouchers: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNum = (n: number) => Number(n || 0).toLocaleString("vi-VN");
const fmtMoney = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M₫` : `${Number(n || 0).toLocaleString("vi-VN")}₫`;
const fmtPct = (n: number) => `${Number(n || 0).toFixed(1)}%`;

/** Local date-time without zone/millis, e.g. 2026-09-30T00:00:00 (what the API's ISO.DATE_TIME accepts). */
function sinceFor(days?: number): string | null {
  if (days === undefined) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  if (days === 0) d.setHours(0, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MarketingAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const since = sinceFor(RANGES.find(r => r.key === range)?.days);
      const url = `${getApiBaseUrl()}/api/staff/marketing/analytics/overview${since ? `?since=${since}` : ""}`;
      const res = await fetch(url, { headers: getAuthHeaders() as Record<string, string>, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const d = j?.data ?? j ?? {};
      setData({
        impressions: Number(d.impressions ?? 0),
        clicks: Number(d.clicks ?? 0),
        ctr: Number(d.ctr ?? 0),
        conversions: Number(d.conversions ?? 0),
        conversionRate: Number(d.conversionRate ?? 0),
        revenue: Number(d.revenue ?? 0),
        vouchersUsed: Number(d.vouchersUsed ?? 0),
        banners: Array.isArray(d.banners) ? d.banners : [],
        vouchers: Array.isArray(d.vouchers) ? d.vouchers : [],
      });
    } catch (e: any) {
      setFailed(true);
      toast.error(`Không tải được dữ liệu hiệu quả (${e?.message ?? "lỗi"})`);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const kpis = [
    { label: "Lượt hiển thị", value: fmtNum(data.impressions) },
    { label: "Lượt click", value: fmtNum(data.clicks), sub: `CTR ${fmtPct(data.ctr)}` },
    // Conversions are voucher orders, not banner clicks, so a "per click" rate is meaningless (it hit 125%).
    { label: "Đơn từ khuyến mãi", value: fmtNum(data.conversions), sub: "Đơn có dùng voucher" },
    { label: "Doanh thu", value: fmtMoney(data.revenue) },
    { label: "Voucher đã dùng", value: fmtNum(data.vouchersUsed) },
  ];

  const maxImp = Math.max(1, ...data.banners.map(b => b.impressions));
  const noTracking = !loading && !failed && data.impressions === 0 && data.clicks === 0;

  const th = "px-4 py-2 text-xs font-medium text-slate-500";

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="border-l-4 border-red-600 pl-3 text-xl font-semibold">Hiệu quả marketing</h1>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            {RANGES.map(r => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1 ${range === r.key ? "bg-red-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {r.label}
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

        <section className="grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-5 lg:divide-y-0">
          {kpis.map(k => (
            <div key={k.label} className="border-t-2 border-red-600 p-4 first:border-t-2">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-red-700">{loading ? "…" : k.value}</p>
              <p className="mt-0.5 h-4 text-xs text-slate-400">{loading ? "" : k.sub ?? ""}</p>
            </div>
          ))}
        </section>

        {noTracking && (
          <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Chưa có lượt xem hoặc click nào được ghi nhận trong khoảng thời gian này.
          </p>
        )}

        {/* Banners */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium">Banner</h2>
          {data.banners.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Chưa có dữ liệu banner.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr className="border-b border-slate-100">
                    <th className={th}>Banner</th>
                    <th className={th}>Vị trí</th>
                    <th className={`${th} w-48`}>Hiển thị</th>
                    <th className={`${th} text-right`}>Click</th>
                    <th className={`${th} text-right`}>CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.banners.map((b, i) => (
                    <tr key={b.bannerId ?? i}>
                      <td className="px-4 py-2.5 font-medium">{b.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{POSITION_LABEL[b.position] ?? b.position}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-red-600" style={{ width: `${Math.round((b.impressions / maxImp) * 100)}%` }} />
                          </div>
                          <span className="w-12 text-right tabular-nums">{fmtNum(b.impressions)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(b.clicks)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtPct(b.ctr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Vouchers */}
        <section className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium">Voucher</h2>
          {data.vouchers.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Chưa có voucher nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr className="border-b border-slate-100">
                    <th className={th}>Mã</th>
                    <th className={`${th} text-right`}>Lượt dùng</th>
                    <th className={`${th} text-right`}>Tổng giảm</th>
                    <th className={`${th} text-right`}>Giá trị đơn TB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.vouchers.map(v => (
                    <tr key={v.code}>
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-medium">{v.code}</span>
                        {v.name && <span className="ml-2 text-slate-500">{v.name}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtNum(v.used)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{v.used > 0 ? fmtMoney(Number(v.totalDiscount)) : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{v.used > 0 ? fmtMoney(Number(v.avgOrder)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
