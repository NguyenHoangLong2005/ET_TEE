'use client';

import { useEffect, useState } from 'react';
import { Calendar, Eye, MousePointerClick, ShoppingBag, Tag, Megaphone, TrendingUp } from 'lucide-react';
import MarketingShell from '@/components/staff/marketing/MarketingShell';
import RoleGate from '@/components/staff/marketing/RoleGate';
import { PageLoader, ErrorState } from '@/components/staff/marketing/PageStates';
import { marketingService, type AnalyticsOverview } from '@/lib/services/marketingService';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);
const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

const RANGES = [
  { value: '7',   label: '7 ngày qua',  days: 7 },
  { value: '30',  label: '30 ngày qua', days: 30 },
  { value: '90',  label: '90 ngày qua', days: 90 },
  { value: 'all', label: 'Tất cả',      days: null },
];

export default function AnalyticsPage() {
  return (
    <RoleGate>
      <AnalyticsInner />
    </RoleGate>
  );
}

function AnalyticsInner() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('30');

  const load = async (selected = range) => {
    setLoading(true);
    setError(null);
    try {
      const r = RANGES.find((x) => x.value === selected);
      const since = r?.days ? new Date(Date.now() - r.days * 86400 * 1000).toISOString() : undefined;
      const res = since ? await marketingService.getAnalyticsOverview(since) : await marketingService.getAnalyticsOverview();
      setOverview(res.data || res);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <MarketingShell
      title="Analytics"
      subtitle="Tổng quan hiệu quả marketing: lượt hiển thị, click, chuyển đổi và doanh thu."
      action={
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-slate-500">
            <Calendar size={13} />
            Khoảng thời gian
          </div>
          <select
            value={range}
            onChange={(e) => { setRange(e.target.value); load(e.target.value); }}
            className="h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:border-slate-900"
          >
            {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      }
    >
      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard icon={Eye}             label="Lượt hiển thị" value={fmt(overview?.impressions ?? 0)} hint="Tổng impression đã ghi nhận" />
            <KpiCard icon={MousePointerClick} label="Lượt click"    value={fmt(overview?.clicks ?? 0)}      hint={`CTR ${(overview?.ctr ?? 0).toFixed(2)}%`} />
            <KpiCard icon={ShoppingBag}     label="Chuyển đổi"     value={fmt(overview?.conversions ?? 0)} hint={`CVR ${(overview?.conversionRate ?? 0).toFixed(2)}%`} />
            <KpiCard icon={TrendingUp}      label="Doanh thu"      value={money(overview?.revenue ?? 0)} hint="Từ conversion đã ghi nhận" />
            <KpiCard icon={Calendar}        label="Tỉ lệ CVR"     value={`${(overview?.conversionRate ?? 0).toFixed(2)}%`} hint="Conversion / Click" />
          </div>

          {/* Funnel bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-[13.5px] font-semibold text-slate-900 mb-4">Phễu chuyển đổi</h3>
            <FunnelBar
              steps={[
                { label: 'Hiển thị',    value: overview?.impressions ?? 0, accent: 'bg-slate-900' },
                { label: 'Click',       value: overview?.clicks ?? 0,      accent: 'bg-slate-700' },
                { label: 'Chuyển đổi',  value: overview?.conversions ?? 0, accent: 'bg-slate-500' },
              ]}
            />
          </div>

          {/* Top performers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TopCard
              title="Top banner"
              icon={Eye}
              empty="Chưa có dữ liệu banner"
              items={overview?.topBanners?.map((b) => ({
                id: b.bannerId,
                title: b.title,
                image: b.imageUrl,
                value: fmt(b.count),
              }))}
            />
            <TopCard
              title="Top campaign"
              icon={Megaphone}
              empty="Chưa có dữ liệu campaign"
              items={overview?.topCampaigns?.map((c) => ({
                id: c.campaignId,
                title: c.name,
                value: fmt(c.count),
              }))}
            />
            <TopCard
              title="Top voucher"
              icon={Tag}
              empty="Chưa có lượt dùng voucher"
              items={overview?.topVouchers?.map((v) => ({
                id: v.voucherId,
                title: v.code ? `${v.code} · ${v.name}` : `Voucher #${v.voucherId}`,
                value: fmt(v.count),
              }))}
            />
          </div>
        </div>
      )}
    </MarketingShell>
  );
}

function KpiCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider text-slate-500 font-medium">
        <Icon size={13} className="text-slate-400" /> {label}
      </div>
      <div className="mt-2 text-[22px] font-semibold text-slate-900 tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-[11.5px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function FunnelBar({ steps }: { steps: { label: string; value: number; accent: string }[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-3">
      {steps.map((s) => {
        const pct = Math.max(2, Math.round((s.value / max) * 100));
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-[12.5px] text-slate-700 mb-1.5">
              <div>{s.label}</div>
              <div className="tabular-nums font-medium text-slate-900">{fmt(s.value)}</div>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={['h-full rounded-full', s.accent].join(' ')} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopCard({
  title, icon: Icon, items, empty,
}: { title: string; icon: any; items?: Array<{ id: number; title?: string; image?: string; value: string }>; empty: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <Icon size={15} className="text-slate-500" />
        <h3 className="text-[13.5px] font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="px-5 py-4">
        {!items?.length ? (
          <div className="py-6 text-center text-[12.5px] text-slate-500">{empty}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                {b.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image} alt="" className="h-10 w-16 object-cover rounded border border-slate-200 bg-slate-100" />
                ) : (
                  <div className="h-10 w-16 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-[11px] text-slate-500 font-mono">
                    #{b.id}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-slate-900 truncate">{b.title || `#${b.id}`}</div>
                  <div className="text-[11.5px] text-slate-500">ID: {b.id}</div>
                </div>
                <div className="text-[13px] font-semibold text-slate-900 tabular-nums">{b.value}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
