'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Image as ImageIcon, ExternalLink } from 'lucide-react';
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
  type Banner,
  type BannerStatus,
} from '@/lib/services/marketingService';

const POSITION_OPTIONS = [
  { value: 'HOME_HERO',       label: 'Trang chủ - Banner lớn (Hero)' },
  { value: 'HOME_MID',        label: 'Trang chủ - Giữa trang' },
  { value: 'CATEGORY_TOP',    label: 'Đầu trang danh mục' },
  { value: 'PRODUCT_DETAIL',  label: 'Trang chi tiết sản phẩm' },
];

const STATUS_OPTIONS: { value: BannerStatus; label: string }[] = [
  { value: 'ACTIVE',  label: 'Đang chạy' },
  { value: 'DRAFT',   label: 'Bản nháp' },
  { value: 'PAUSED',  label: 'Tạm dừng' },
  { value: 'EXPIRED', label: 'Hết hạn' },
];

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString('vi-VN') : '—');
const toLocalDateTime = (s?: string | null) => (s ? new Date(s).toISOString().slice(0, 16) : '');

export default function BannersPage() {
  return (
    <RoleGate>
      <BannersInner />
    </RoleGate>
  );
}

function BannersInner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BannerStatus>('ALL');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await marketingService.listBanners();
      setBanners(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải banner');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return banners.filter((b) => {
      const matchQ = !search || `${b.title} ${b.subtitle ?? ''}`.toLowerCase().includes(search.toLowerCase());
      const matchS = statusFilter === 'ALL' || (b.status || 'ACTIVE') === statusFilter;
      return matchQ && matchS;
    });
  }, [banners, search, statusFilter]);

  const handleSubmit = async (form: Partial<Banner>) => {
    try {
      if (editing?.id) {
        await marketingService.updateBanner(editing.id, form);
        toast.success('Đã cập nhật banner');
      } else {
        await marketingService.createBanner(form);
        toast.success('Đã tạo banner');
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
      await marketingService.deleteBanner(confirmDelete.id);
      toast.success('Đã xóa banner');
      setConfirmDelete(null);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (b: Banner) => {
    const next: BannerStatus = (b.status || 'ACTIVE') === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await marketingService.updateBannerStatus(b.id!, next);
      toast.success(`Đã ${next === 'ACTIVE' ? 'kích hoạt' : 'tạm dừng'} banner`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <MarketingShell
      title="Quản lý Banner"
      subtitle="Tạo và quản lý các banner hiển thị trên trang chủ và trang danh mục."
      action={
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold"
        >
          <Plus size={15} /> Tạo banner
        </button>
      }
    >
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[220px] max-w-md">
          <SearchInput placeholder="Tìm theo tiêu đề hoặc phụ đề…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          {filtered.length} / {banners.length} banner
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : banners.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Chưa có banner nào"
          hint="Tạo banner đầu tiên để bắt đầu quảng bá sản phẩm và chương trình khuyến mãi."
          action={
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold"
            >
              <Plus size={15} /> Tạo banner đầu tiên
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-2.5 font-medium">Banner</th>
                  <th className="px-4 py-2.5 font-medium">Vị trí</th>
                  <th className="px-4 py-2.5 font-medium">Ưu tiên</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-4 py-2.5 font-medium">Hiệu lực</th>
                  <th className="px-4 py-2.5 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {b.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.imageUrl}
                            alt={b.title}
                            className="h-12 w-20 rounded border border-slate-200 object-cover bg-slate-100"
                            onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
                          />
                        ) : (
                          <div className="h-12 w-20 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                            <ImageIcon size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate max-w-[280px]">{b.title}</div>
                          {b.subtitle ? (
                            <div className="text-[12px] text-slate-500 truncate max-w-[280px]">{b.subtitle}</div>
                          ) : null}
                          {b.linkUrl ? (
                            <Link href={b.linkUrl} className="inline-flex items-center gap-1 text-[11.5px] text-slate-600 hover:text-slate-900 mt-0.5">
                              <ExternalLink size={11} /> {b.linkUrl}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{positionLabel(b.position)}</td>
                    <td className="px-4 py-3 tabular-nums">{b.priority ?? 0}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(b.status)} dot>
                        {b.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-600 tabular-nums whitespace-nowrap">
                      <div>{fmtDate(b.startDate)}</div>
                      <div className="text-slate-400">→ {fmtDate(b.endDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleStatus(b)}
                          className="h-8 px-2.5 rounded-md border border-slate-200 hover:bg-slate-50 text-[12px] font-medium text-slate-700"
                        >
                          {(b.status || 'ACTIVE') === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}
                        </button>
                        <button
                          onClick={() => { setEditing(b); setShowForm(true); }}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700"
                          aria-label="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(b)}
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

      <BannerForm
        open={showForm}
        banner={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa banner này?"
        message={`Banner "${confirmDelete?.title}" sẽ bị xóa và không thể khôi phục.`}
        confirmText="Xóa banner"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </MarketingShell>
  );
}

function positionLabel(p?: string) {
  const found = POSITION_OPTIONS.find((o) => o.value === p);
  if (found) return found.label;
  if (p === 'HERO') return 'Hero (cũ)';
  if (p === 'MIDDLE') return 'Giữa (cũ)';
  if (p === 'POPUP') return 'Popup (cũ)';
  return p || '—';
}

interface BannerFormProps {
  open: boolean;
  banner: Banner | null;
  onClose: () => void;
  onSubmit: (data: Partial<Banner>) => Promise<void>;
}

function BannerForm({ open, banner, onClose, onSubmit }: BannerFormProps) {
  const [form, setForm] = useState<Partial<Banner>>(banner || defaultBanner());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(banner || defaultBanner());
  }, [open, banner]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Banner> = {
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={banner?.id ? 'Chỉnh sửa banner' : 'Tạo banner mới'}
      description="Banner sẽ hiển thị công khai khi trạng thái ACTIVE và nằm trong thời gian hiệu lực."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-3.5 rounded-md border border-slate-300 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            Hủy
          </button>
          <button
            type="submit"
            form="banner-form"
            disabled={saving}
            className="h-9 px-4 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold inline-flex items-center gap-2"
          >
            {saving && <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {banner?.id ? 'Lưu thay đổi' : 'Tạo banner'}
          </button>
        </>
      }
    >
      <form id="banner-form" onSubmit={submit} className="space-y-4">
        <FormRow cols={2}>
          <div>
            <FieldLabel required>Tiêu đề</FieldLabel>
            <TextInput required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Summer Sale 2026" />
          </div>
          <div>
            <FieldLabel>Phụ đề</FieldLabel>
            <TextInput value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Giảm đến 50% toàn bộ BST" />
          </div>
        </FormRow>

        <FormRow cols={2}>
          <div>
            <FieldLabel required hint="Dùng ảnh tỉ lệ 3:1, tối thiểu 1200×400px">
              URL ảnh banner
            </FieldLabel>
            <TextInput required value={form.imageUrl || ''} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <FieldLabel hint="Đường dẫn khi khách click vào banner">
              Link đích (tùy chọn)
            </FieldLabel>
            <TextInput value={form.linkUrl || ''} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="/products?sale=true" />
          </div>
        </FormRow>

        {/* Preview */}
        {form.imageUrl ? (
          <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-50">
            <div className="text-[11.5px] font-medium text-slate-500 px-3 py-1.5 border-b border-slate-200 bg-white">
              Xem trước
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.imageUrl}
              alt={form.title || 'preview'}
              className="w-full max-h-44 object-cover"
              onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')}
            />
          </div>
        ) : null}

        <FormRow cols={3}>
          <div>
            <FieldLabel>Vị trí hiển thị</FieldLabel>
            <SelectInput value={form.position || 'HOME_HERO'} onChange={(e) => setForm({ ...form, position: e.target.value })}>
              {POSITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel hint="Số cao hơn = ưu tiên hiển thị trước">Ưu tiên</FieldLabel>
            <NumberInput value={form.priority ?? 0} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
          </div>
          <div>
            <FieldLabel>Trạng thái</FieldLabel>
            <SelectInput value={form.status || 'ACTIVE'} onChange={(e) => setForm({ ...form, status: e.target.value as BannerStatus })}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectInput>
          </div>
        </FormRow>

        <FormRow cols={2}>
          <div>
            <FieldLabel hint="Để trống = chạy ngay">Bắt đầu</FieldLabel>
            <input
              type="datetime-local"
              value={toLocalDateTime(form.startDate)}
              onChange={(e) => setForm({ ...form, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <FieldLabel hint="Để trống = không giới hạn">Kết thúc</FieldLabel>
            <input
              type="datetime-local"
              value={toLocalDateTime(form.endDate)}
              onChange={(e) => setForm({ ...form, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </FormRow>
      </form>
    </Modal>
  );
}

function defaultBanner(): Partial<Banner> {
  return {
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    position: 'HOME_HERO',
    priority: 0,
    status: 'ACTIVE',
    displayOrder: 0,
    isActive: true,
  };
}
