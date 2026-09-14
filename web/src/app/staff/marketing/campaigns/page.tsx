'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import MarketingShell from '@/components/staff/marketing/MarketingShell';
import RoleGate from '@/components/staff/marketing/RoleGate';
import { Modal } from '@/components/staff/marketing/Modal';
import { ConfirmDialog } from '@/components/staff/marketing/ConfirmDialog';
import { Badge, statusTone } from '@/components/staff/marketing/Badge';
import { PageLoader, ErrorState, EmptyState, SearchInput } from '@/components/staff/marketing/PageStates';
import { FieldLabel, TextInput, NumberInput, SelectInput, TextArea, FormRow } from '@/components/staff/marketing/Form';
import {
  marketingService,
  type Campaign,
  type CampaignStatus,
  type CampaignGoal,
  type CampaignAnalytics,
} from '@/lib/services/marketingService';

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'DRAFT',  label: 'Bản nháp' },
  { value: 'ACTIVE', label: 'Đang chạy' },
  { value: 'PAUSED', label: 'Tạm dừng' },
  { value: 'ENDED',  label: 'Đã kết thúc' },
];

const GOAL_OPTIONS: { value: CampaignGoal; label: string }[] = [
  { value: 'SALES',       label: 'Doanh số' },
  { value: 'TRAFFIC',     label: 'Lưu lượng truy cập' },
  { value: 'NEW_USER',    label: 'Khách hàng mới' },
  { value: 'CLEAR_STOCK', label: 'Xả hàng tồn kho' },
];

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('vi-VN') : '—');
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function CampaignsPage() {
  return (
    <RoleGate>
      <CampaignsInner />
    </RoleGate>
  );
}

function CampaignsInner() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CampaignStatus>('ALL');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [analyticsFor, setAnalyticsFor] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await marketingService.listCampaigns();
      setCampaigns(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải campaign');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchQ = !search || `${c.name} ${c.code ?? ''}`.toLowerCase().includes(search.toLowerCase());
      const matchS = statusFilter === 'ALL' || (c.status || 'DRAFT') === statusFilter;
      return matchQ && matchS;
    });
  }, [campaigns, search, statusFilter]);

  const handleSubmit = async (form: Partial<Campaign>) => {
    try {
      if (editing?.id) {
        await marketingService.updateCampaign(editing.id, form);
        toast.success('Đã cập nhật campaign');
      } else {
        await marketingService.createCampaign(form);
        toast.success('Đã tạo campaign');
      }
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Lưu thất bại');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete?.id) return;
    setDeleting(true);
    try {
      await marketingService.deleteCampaign(confirmDelete.id);
      toast.success('Đã xóa campaign');
      setConfirmDelete(null);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (c: Campaign) => {
    const cur = c.status || 'DRAFT';
    const next: CampaignStatus = cur === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await marketingService.updateCampaignStatus(c.id!, next);
      toast.success(`Đã chuyển sang ${next}`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openAnalytics = async (c: Campaign) => {
    setAnalyticsFor(c);
    setAnalytics(null);
    setAnalyticsLoading(true);
    try {
      const res = await marketingService.getCampaignAnalytics(c.id!);
      setAnalytics(res.data || res);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (
    <MarketingShell
      title="Quản lý Campaign"
      subtitle="Lên kế hoạch và theo dõi hiệu quả các chiến dịch marketing theo mục tiêu kinh doanh."
      action={
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold"
        >
          <Plus size={15} /> Tạo campaign
        </button>
      }
    >
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[220px] max-w-md">
          <SearchInput placeholder="Tìm theo tên hoặc mã campaign…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:border-slate-900"
        >
          <option value="ALL">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="ml-auto text-[12.5px] text-slate-500">
          {filtered.length} / {campaigns.length} campaign
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Chưa có campaign nào"
          hint="Tạo campaign đầu tiên để bắt đầu gắn banner, voucher và theo dõi hiệu quả."
          action={
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold"
            >
              <Plus size={15} /> Tạo campaign đầu tiên
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-2.5 font-medium">Campaign</th>
                  <th className="px-4 py-2.5 font-medium">Mục tiêu</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ngân sách</th>
                  <th className="px-4 py-2.5 font-medium">Thời gian</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-4 py-2.5 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 align-top max-w-[300px]">
                      <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                      {c.code ? <div className="text-[11.5px] font-mono text-slate-500 mt-0.5">{c.code}</div> : null}
                      {c.description ? <div className="text-[12px] text-slate-500 mt-1 line-clamp-2">{c.description}</div> : null}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <Badge tone="violet" dot>{c.goal || 'SALES'}</Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-right tabular-nums whitespace-nowrap">
                      {c.budget ? fmtMoney(c.budget) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 align-top text-[12px] text-slate-600 tabular-nums whitespace-nowrap">
                      <div>{fmtDate(c.startDate)}</div>
                      <div className="text-slate-400">→ {fmtDate(c.endDate)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge tone={statusTone(c.status)} dot>{c.status || 'DRAFT'}</Badge>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openAnalytics(c)}
                          className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md border border-slate-200 hover:bg-slate-50 text-[12px] font-medium text-slate-700"
                        >
                          <BarChart3 size={13} /> Analytics
                        </button>
                        <button
                          onClick={() => toggleStatus(c)}
                          className="h-8 px-2.5 rounded-md border border-slate-200 hover:bg-slate-50 text-[12px] font-medium text-slate-700"
                        >
                          {(c.status || 'DRAFT') === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}
                        </button>
                        <button
                          onClick={() => { setEditing(c); setShowForm(true); }}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700"
                          aria-label="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-200 hover:bg-red-50 text-red-600"
                          aria-label="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CampaignForm
        open={showForm}
        campaign={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa campaign này?"
        message={`Campaign "${confirmDelete?.name}" sẽ bị xóa cùng các số liệu analytics liên quan.`}
        confirmText="Xóa campaign"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <Modal
        open={!!analyticsFor}
        title={`Analytics · ${analyticsFor?.name || ''}`}
        description="Số liệu tương tác và chuyển đổi của campaign này (cộng dồn từ lúc tạo)."
        onClose={() => setAnalyticsFor(null)}
      >
        {analyticsLoading ? (
          <PageLoader label="Đang tải analytics…" />
        ) : analytics ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MiniStat label="Hiển thị"    value={fmt(analytics.impressions)} />
            <MiniStat label="Click"       value={fmt(analytics.clicks)} />
            <MiniStat label="CTR"         value={`${(analytics.ctr ?? 0).toFixed(2)}%`} />
            <MiniStat label="Chuyển đổi"  value={fmt(analytics.conversions)} />
            <MiniStat label="Conversion Rate" value={`${(analytics.conversionRate ?? 0).toFixed(2)}%`} />
            <MiniStat label="Doanh thu"   value={fmtMoney(analytics.revenue ?? 0)} />
          </div>
        ) : (
          <div className="text-center text-slate-500 text-[13px] py-8">Chưa có dữ liệu</div>
        )}
      </Modal>
    </MarketingShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-slate-200 rounded-md p-3.5 bg-slate-50">
      <div className="text-[11.5px] uppercase tracking-wider text-slate-500 font-medium">{label}</div>
      <div className="mt-1 text-[18px] font-semibold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

interface CampaignFormProps {
  open: boolean;
  campaign: Campaign | null;
  onClose: () => void;
  onSubmit: (data: Partial<Campaign>) => Promise<void>;
}

function CampaignForm({ open, campaign, onClose, onSubmit }: CampaignFormProps) {
  const [form, setForm] = useState<Partial<Campaign>>(campaign || defaultCampaign());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(campaign || defaultCampaign());
  }, [open, campaign]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Campaign> = {
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        code: form.code ? form.code.trim().toUpperCase() : undefined,
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={campaign?.id ? 'Chỉnh sửa campaign' : 'Tạo campaign mới'}
      description="Campaign là đơn vị để gắn banner, voucher và theo dõi mục tiêu kinh doanh."
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-3.5 rounded-md border border-slate-300 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            Hủy
          </button>
          <button
            type="submit"
            form="campaign-form"
            disabled={saving}
            className="h-9 px-4 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold inline-flex items-center gap-2"
          >
            {saving && <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {campaign?.id ? 'Lưu thay đổi' : 'Tạo campaign'}
          </button>
        </>
      }
    >
      <form id="campaign-form" onSubmit={submit} className="space-y-4">
        <FormRow cols={2}>
          <div>
            <FieldLabel required>Tên campaign</FieldLabel>
            <TextInput required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Summer Sale 2026" />
          </div>
          <div>
            <FieldLabel hint="Mã định danh nội bộ (không bắt buộc)">Mã campaign</FieldLabel>
            <TextInput value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VD: SUMMER26" className="font-mono uppercase" />
          </div>
        </FormRow>

        <div>
          <FieldLabel>Mô tả</FieldLabel>
          <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mục tiêu, đối tượng, kênh chạy…" />
        </div>

        <FormRow cols={3}>
          <div>
            <FieldLabel>Mục tiêu</FieldLabel>
            <SelectInput value={form.goal || 'SALES'} onChange={(e) => setForm({ ...form, goal: e.target.value as CampaignGoal })}>
              {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel hint="Để trống nếu không giới hạn">Ngân sách (VND)</FieldLabel>
            <NumberInput min={0} value={form.budget ?? ''} onChange={(e) => setForm({ ...form, budget: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </div>
          <div>
            <FieldLabel>Trạng thái</FieldLabel>
            <SelectInput value={form.status || 'DRAFT'} onChange={(e) => setForm({ ...form, status: e.target.value as CampaignStatus })}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectInput>
          </div>
        </FormRow>

        <FormRow cols={2}>
          <div>
            <FieldLabel hint="Để trống = chưa xác định">Bắt đầu</FieldLabel>
            <input
              type="date"
              value={form.startDate ? new Date(form.startDate).toISOString().slice(0, 10) : ''}
              onChange={(e) => setForm({ ...form, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <FieldLabel hint="Để trống = không giới hạn">Kết thúc</FieldLabel>
            <input
              type="date"
              value={form.endDate ? new Date(form.endDate).toISOString().slice(0, 10) : ''}
              onChange={(e) => setForm({ ...form, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </FormRow>
      </form>
    </Modal>
  );
}

function defaultCampaign(): Partial<Campaign> {
  return {
    name: '',
    code: '',
    description: '',
    goal: 'SALES',
    status: 'DRAFT',
    budget: 0,
    isActive: true,
  };
}
