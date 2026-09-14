'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Ticket } from 'lucide-react';
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
  type Voucher,
  type VoucherStatus,
  type VoucherType,
  type VoucherTarget,
} from '@/lib/services/marketingService';

const TYPE_OPTIONS: { value: VoucherType; label: string }[] = [
  { value: 'PERCENT',       label: 'Phần trăm (%)' },
  { value: 'FIXED_AMOUNT',  label: 'Số tiền cố định' },
  { value: 'FREE_SHIPPING', label: 'Miễn phí vận chuyển' },
];

const TARGET_OPTIONS: { value: VoucherTarget; label: string }[] = [
  { value: 'ALL',                label: 'Tất cả khách hàng' },
  { value: 'NEW_CUSTOMER',       label: 'Khách mới' },
  { value: 'RETURNING_CUSTOMER', label: 'Khách cũ' },
];

const STATUS_OPTIONS: { value: VoucherStatus; label: string }[] = [
  { value: 'ACTIVE',  label: 'Đang chạy' },
  { value: 'PAUSED',  label: 'Tạm dừng' },
  { value: 'EXPIRED', label: 'Hết hạn' },
];

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('vi-VN') : '—');
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

export default function VouchersPage() {
  return (
    <RoleGate>
      <VouchersInner />
    </RoleGate>
  );
}

function VouchersInner() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VoucherStatus>('ALL');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Voucher | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await marketingService.listVouchers();
      setVouchers(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải voucher');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return vouchers.filter((v) => {
      const matchQ = !search || `${v.code} ${v.name}`.toLowerCase().includes(search.toLowerCase());
      const matchS = statusFilter === 'ALL' || (v.status || 'ACTIVE') === statusFilter;
      return matchQ && matchS;
    });
  }, [vouchers, search, statusFilter]);

  const handleSubmit = async (form: Partial<Voucher>) => {
    try {
      if (editing?.id) {
        await marketingService.updateVoucher(editing.id, form);
        toast.success('Đã cập nhật voucher');
      } else {
        await marketingService.createVoucher(form);
        toast.success('Đã tạo voucher');
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
      await marketingService.deleteVoucher(confirmDelete.id);
      toast.success('Đã xóa voucher');
      setConfirmDelete(null);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (v: Voucher) => {
    const next: VoucherStatus = (v.status || 'ACTIVE') === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await marketingService.updateVoucherStatus(v.id!, next);
      toast.success(`Đã ${next === 'ACTIVE' ? 'kích hoạt' : 'tạm dừng'} voucher`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <MarketingShell
      title="Quản lý Voucher"
      subtitle="Tạo và quản lý mã giảm giá áp dụng tại bước thanh toán."
      action={
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold"
        >
          <Plus size={15} /> Tạo voucher
        </button>
      }
    >
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[220px] max-w-md">
          <SearchInput placeholder="Tìm theo mã hoặc tên voucher…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          {filtered.length} / {vouchers.length} voucher
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : vouchers.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Chưa có voucher nào"
          hint="Tạo voucher đầu tiên để kích thích đơn hàng và tăng tỉ lệ chuyển đổi."
          action={
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold"
            >
              <Plus size={15} /> Tạo voucher đầu tiên
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-2.5 font-medium">Mã</th>
                  <th className="px-4 py-2.5 font-medium">Tên & mô tả</th>
                  <th className="px-4 py-2.5 font-medium">Loại / Giá trị</th>
                  <th className="px-4 py-2.5 font-medium text-right">Điều kiện</th>
                  <th className="px-4 py-2.5 font-medium text-right">Lượt dùng</th>
                  <th className="px-4 py-2.5 font-medium">Hiệu lực</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-4 py-2.5 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v) => {
                  const used = v.usedCount || 0;
                  const max = v.maxUses || 0;
                  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 align-top">
                        <div className="font-mono font-semibold text-slate-900">{v.code}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{v.targetGroup || 'ALL'}</div>
                      </td>
                      <td className="px-4 py-3 align-top max-w-[260px]">
                        <div className="font-medium text-slate-900">{v.name}</div>
                        {v.description ? (
                          <div className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{v.description}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <Badge tone="sky" dot>
                          {v.type === 'PERCENT' ? `${v.discountValue}%` : v.type === 'FIXED_AMOUNT' ? fmtMoney(v.discountValue) : 'Free ship'}
                        </Badge>
                        {v.type === 'PERCENT' && v.maxDiscountAmount ? (
                          <div className="text-[11.5px] text-slate-500 mt-1">tối đa {fmtMoney(v.maxDiscountAmount)}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top text-right tabular-nums whitespace-nowrap">
                        {v.minOrderAmount ? <div className="text-slate-700">≥ {fmtMoney(v.minOrderAmount)}</div> : <div className="text-slate-400">không yêu cầu</div>}
                        <div className="text-[11.5px] text-slate-500 mt-0.5">mỗi user: {v.perUserLimit ?? 1}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-right tabular-nums">
                        <div className="text-slate-900 font-medium">{used}{max ? ` / ${max}` : ''}</div>
                        {max > 0 ? (
                          <div className="mt-1 h-1.5 w-20 ml-auto rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-slate-700" style={{ width: `${pct}%` }} />
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top text-[12px] text-slate-600 tabular-nums whitespace-nowrap">
                        <div>{fmtDate(v.startDate)}</div>
                        <div className="text-slate-400">→ {fmtDate(v.endDate)}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge tone={statusTone(v.status)} dot>{v.status || 'ACTIVE'}</Badge>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleStatus(v)}
                            className="h-8 px-2.5 rounded-md border border-slate-200 hover:bg-slate-50 text-[12px] font-medium text-slate-700"
                          >
                            {(v.status || 'ACTIVE') === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}
                          </button>
                          <button
                            onClick={() => { setEditing(v); setShowForm(true); }}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700"
                            aria-label="Sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(v)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-200 hover:bg-red-50 text-red-600"
                            aria-label="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <VoucherForm
        open={showForm}
        voucher={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa voucher này?"
        message={`Voucher "${confirmDelete?.code}" sẽ bị xóa và không thể khôi phục.`}
        confirmText="Xóa voucher"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </MarketingShell>
  );
}

interface VoucherFormProps {
  open: boolean;
  voucher: Voucher | null;
  onClose: () => void;
  onSubmit: (data: Partial<Voucher>) => Promise<void>;
}

function VoucherForm({ open, voucher, onClose, onSubmit }: VoucherFormProps) {
  const [form, setForm] = useState<Partial<Voucher>>(voucher || defaultVoucher());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(voucher || defaultVoucher());
  }, [open, voucher]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Voucher> = {
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        code: (form.code || '').trim().toUpperCase(),
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const isPercent = form.type === 'PERCENT';

  return (
    <Modal
      open={open}
      title={voucher?.id ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}
      description="Mã voucher sẽ được áp dụng tại bước thanh toán khi khách nhập đúng điều kiện."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-3.5 rounded-md border border-slate-300 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            Hủy
          </button>
          <button
            type="submit"
            form="voucher-form"
            disabled={saving}
            className="h-9 px-4 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold inline-flex items-center gap-2"
          >
            {saving && <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {voucher?.id ? 'Lưu thay đổi' : 'Tạo voucher'}
          </button>
        </>
      }
    >
      <form id="voucher-form" onSubmit={submit} className="space-y-4">
        <FormRow cols={2}>
          <div>
            <FieldLabel required>Mã voucher (viết hoa, không dấu)</FieldLabel>
            <TextInput required value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VD: SUMMER10" className="font-mono uppercase" />
          </div>
          <div>
            <FieldLabel required>Tên hiển thị</FieldLabel>
            <TextInput required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Giảm 10% mùa hè" />
          </div>
        </FormRow>

        <div>
          <FieldLabel>Mô tả</FieldLabel>
          <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn cho khách hàng hiểu điều kiện áp dụng" />
        </div>

        <FormRow cols={3}>
          <div>
            <FieldLabel>Loại giảm giá</FieldLabel>
            <SelectInput value={form.type || 'PERCENT'} onChange={(e) => setForm({ ...form, type: e.target.value as VoucherType })}>
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectInput>
          </div>
          <div>
            <FieldLabel required hint={isPercent ? 'Nhập 0-100' : 'Nhập số tiền VND'}>
              Giá trị {isPercent ? '(%)' : '(VND)'}
            </FieldLabel>
            <NumberInput required min={0} value={form.discountValue ?? 0} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} />
          </div>
          {isPercent ? (
            <div>
              <FieldLabel hint="Để trống nếu không giới hạn">Giảm tối đa (VND)</FieldLabel>
              <NumberInput min={0} value={form.maxDiscountAmount ?? ''} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </div>
          ) : (
            <div>
              <FieldLabel>Đối tượng áp dụng</FieldLabel>
              <SelectInput value={form.targetGroup || 'ALL'} onChange={(e) => setForm({ ...form, targetGroup: e.target.value as VoucherTarget })}>
                {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectInput>
            </div>
          )}
        </FormRow>

        <FormRow cols={3}>
          <div>
            <FieldLabel hint="Để trống nếu không yêu cầu đơn tối thiểu">Đơn tối thiểu (VND)</FieldLabel>
            <NumberInput min={0} value={form.minOrderAmount ?? ''} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </div>
          <div>
            <FieldLabel hint="Để trống nếu không giới hạn">Tổng lượt dùng</FieldLabel>
            <NumberInput min={0} value={form.maxUses ?? ''} onChange={(e) => setForm({ ...form, maxUses: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </div>
          <div>
            <FieldLabel hint="Số lần tối đa mỗi khách được dùng">Lượt / khách</FieldLabel>
            <NumberInput min={1} value={form.perUserLimit ?? 1} onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })} />
          </div>
        </FormRow>

        <FormRow cols={3}>
          {!isPercent ? null : (
            <div>
              <FieldLabel>Đối tượng áp dụng</FieldLabel>
              <SelectInput value={form.targetGroup || 'ALL'} onChange={(e) => setForm({ ...form, targetGroup: e.target.value as VoucherTarget })}>
                {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectInput>
            </div>
          )}
          <div>
            <FieldLabel>Trạng thái</FieldLabel>
            <SelectInput value={form.status || 'ACTIVE'} onChange={(e) => setForm({ ...form, status: e.target.value as VoucherStatus })}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectInput>
          </div>
        </FormRow>

        <FormRow cols={2}>
          <div>
            <FieldLabel hint="Để trống = có hiệu lực ngay">Có hiệu lực từ</FieldLabel>
            <input
              type="date"
              value={form.startDate ? new Date(form.startDate).toISOString().slice(0, 10) : ''}
              onChange={(e) => setForm({ ...form, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <FieldLabel hint="Để trống = không giới hạn">Hết hạn vào</FieldLabel>
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

function defaultVoucher(): Partial<Voucher> {
  return {
    code: '',
    name: '',
    description: '',
    type: 'PERCENT',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountAmount: undefined,
    maxUses: undefined,
    perUserLimit: 1,
    targetGroup: 'ALL',
    status: 'ACTIVE',
    isActive: true,
    freeShipping: false,
  };
}
