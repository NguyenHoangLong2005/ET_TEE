'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, MousePointerClick, ShoppingBag, TrendingUp } from 'lucide-react';
import MarketingShell from '@/components/staff/marketing/MarketingShell';
import RoleGate from '@/components/staff/marketing/RoleGate';
import { MetricCard, PageLoader, ErrorState } from '@/components/staff/marketing/PageStates';
import { Badge, statusTone } from '@/components/staff/marketing/Badge';
import { marketingService, type AnalyticsOverview, type Banner, type Voucher, type Campaign } from '@/lib/services/marketingService';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);
const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

export default function MarketingDashboardPage() {
  return (
    <RoleGate>
      <DashboardInner />
    </RoleGate>
  );
}

function DashboardInner() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, bn, vc, cp] = await Promise.all([
        marketingService.getAnalyticsOverview(),
        marketingService.listBanners().catch(() => ({ data: [] })),
        marketingService.listVouchers().catch(() => ({ data: [] })),
        marketingService.listCampaigns().catch(() => ({ data: [] })),
      ]);
      setOverview(ov.data || ov);
      setBanners(bn.data || []);
      setVouchers(vc.data || []);
      setCampaigns(cp.data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu');
      toast.error(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeBanners = banners.filter((b) => (b.status || 'ACTIVE') === 'ACTIVE').length;
  const activeVouchers = vouchers.filter((v) => (v.status || 'ACTIVE') === 'ACTIVE').length;
  const activeCampaigns = campaigns.filter((c) => (c.status || 'DRAFT') === 'ACTIVE').length;

  return (
    <MarketingShell
      title="Tổng quan Marketing"
      subtitle="Theo dõi nhanh hiệu quả banner, voucher và chiến dịch đang chạy."
    >
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Lượt hiển thị" value={fmt(overview?.impressions ?? 0)} hint="Tổng impression đã ghi nhận" />
            <MetricCard label="Lượt click"    value={fmt(overview?.clicks ?? 0)}       hint={`CTR ${(overview?.ctr ?? 0).toFixed(2)}%`} accent="up" />
            <MetricCard label="Chuyển đổi"    value={fmt(overview?.conversions ?? 0)} hint={`CVR ${(overview?.conversionRate ?? 0).toFixed(2)}%`} accent="up" />
            <MetricCard label="Doanh thu"     value={money(overview?.revenue ?? 0)} hint="Từ conversion đã ghi nhận" accent="up" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SummaryTile
              title="Banner đang chạy"
              value={`${activeBanners}/${banners.length}`}
              link="/staff/marketing/banners"
            />
            <SummaryTile
              title="Voucher đang hoạt động"
              value={`${activeVouchers}/${vouchers.length}`}
              link="/staff/marketing/vouchers"
            />
            <SummaryTile
              title="Campaign đang chạy"
              value={`${activeCampaigns}/${campaigns.length}`}
              link="/staff/marketing/campaigns"
            />
          </div>

          {/* Top performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Top banner theo lượt tương tác" icon={Eye}>
              {!overview?.topBanners?.length ? (
                <EmptyMini text="Chưa có dữ liệu banner" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {overview!.topBanners.slice(0, 5).map((b) => (
                    <li key={b.bannerId} className="flex items-center gap-3 py-2.5">
                      {b.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.imageUrl} alt="" className="h-10 w-16 object-cover rounded border border-slate-200 bg-slate-100" />
                      ) : (
                        <div className="h-10 w-16 rounded border border-slate-200 bg-slate-100" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-slate-900 truncate">{b.title || `Banner #${b.bannerId}`}</div>
                        <div className="text-[11.5px] text-slate-500">ID: {b.bannerId}</div>
                      </div>
                      <div className="text-[13px] font-semibold text-slate-900 tabular-nums">{fmt(b.count)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Top campaign" icon={MegaphoneSvg}>
              {!overview?.topCampaigns?.length ? (
                <EmptyMini text="Chưa có dữ liệu campaign" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {overview!.topCampaigns.slice(0, 5).map((c) => {
                    const full = campaigns.find((x) => x.id === c.campaignId);
                    return (
                      <li key={c.campaignId} className="flex items-center gap-3 py-2.5">
                        <div className="h-9 w-9 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                          <ShoppingBag size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-slate-900 truncate">{c.name || full?.name || `Campaign #${c.campaignId}`}</div>
                          <div className="mt-0.5"><Badge tone={statusTone(full?.status)}>{full?.status || 'ACTIVE'}</Badge></div>
                        </div>
                        <div className="text-[13px] font-semibold text-slate-900 tabular-nums">{fmt(c.count)}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Voucher sắp / đang chạy" icon={TagSvg}>
            {vouchers.length === 0 ? (
              <EmptyMini text="Chưa có voucher nào" />
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11.5px] uppercase tracking-wider text-slate-500">
                      <th className="px-2 py-2 font-medium">Mã</th>
                      <th className="px-2 py-2 font-medium">Tên</th>
                      <th className="px-2 py-2 font-medium">Loại</th>
                      <th className="px-2 py-2 font-medium text-right">Đã dùng</th>
                      <th className="px-2 py-2 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vouchers.slice(0, 5).map((v) => (
                      <tr key={v.id}>
                        <td className="px-2 py-2.5 font-mono font-semibold text-slate-900">{v.code}</td>
                        <td className="px-2 py-2.5 text-slate-700 truncate max-w-[260px]">{v.name}</td>
                        <td className="px-2 py-2.5 text-slate-600">{v.type}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{fmt(v.usedCount || 0)}{v.maxUses ? ` / ${fmt(v.maxUses)}` : ''}</td>
                        <td className="px-2 py-2.5"><Badge tone={statusTone(v.status)}>{v.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </MarketingShell>
  );
}

function SummaryTile({ title, value, link }: { title: string; value: string; link: string }) {
  return (
    <Link href={link} className="group block bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition">
      <div className="text-[12px] uppercase tracking-wider text-slate-500 font-medium">{title}</div>
      <div className="mt-2 text-[20px] font-semibold text-slate-900 tabular-nums">{value}</div>
      <div className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-slate-700 group-hover:text-slate-900">
        Quản lý <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <Icon size={15} className="text-slate-500" />
        <h3 className="text-[13.5px] font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="py-6 text-center text-[12.5px] text-slate-500">{text}</div>;
}

const MegaphoneSvg = (p: any) => <TrendingUp {...p} />;
const TagSvg       = (p: any) => <MousePointerClick {...p} />;
