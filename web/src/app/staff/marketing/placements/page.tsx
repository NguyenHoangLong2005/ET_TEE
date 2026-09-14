'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, PackageSearch, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import MarketingShell from '@/components/staff/marketing/MarketingShell';
import RoleGate from '@/components/staff/marketing/RoleGate';
import { Modal } from '@/components/staff/marketing/Modal';
import { ConfirmDialog } from '@/components/staff/marketing/ConfirmDialog';
import { Badge, statusTone } from '@/components/staff/marketing/Badge';
import { PageLoader, ErrorState, EmptyState } from '@/components/staff/marketing/PageStates';
import { FieldLabel, TextInput, NumberInput, SelectInput } from '@/components/staff/marketing/Form';
import {
  marketingService,
  type ProductPlacement,
} from '@/lib/services/marketingService';

const KEY_OPTIONS = [
  { value: 'HOME_NEW',            label: 'Trang chủ - Hàng mới về' },
  { value: 'HOME_BEST_SELLER',    label: 'Trang chủ - Bán chạy' },
  { value: 'HOME_RECOMMENDED',    label: 'Trang chủ - Gợi ý cho bạn' },
  { value: 'CATEGORY_FEATURED',   label: 'Danh mục - Nổi bật' },
];

interface ProductLite {
  id: number;
  name: string;
  price?: number;
  image?: string;
}

export default function PlacementsPage() {
  return (
    <RoleGate>
      <PlacementsInner />
    </RoleGate>
  );
}

function PlacementsInner() {
  const [placements, setPlacements] = useState<ProductPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductPlacement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProductPlacement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await marketingService.listPlacements();
      setPlacements((res.data || []).sort((a: any, b: any) => (a.placementKey || '').localeCompare(b.placementKey || '') || (a.position - b.position)));
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const m: Record<string, ProductPlacement[]> = {};
    for (const p of placements) {
      const k = p.placementKey || 'OTHER';
      (m[k] ||= []).push(p);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => a.position - b.position);
    }
    return m;
  }, [placements]);

  const handleSubmit = async (form: Partial<ProductPlacement>) => {
    try {
      if (editing?.id) {
        await marketingService.updatePlacement(editing.id, form);
        toast.success('Đã cập nhật placement');
      } else {
        await marketingService.createPlacement(form);
        toast.success('Đã thêm placement');
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
      await marketingService.deletePlacement(confirmDelete.id);
      toast.success('Đã xóa placement');
      setConfirmDelete(null);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const movePosition = async (p: ProductPlacement, dir: -1 | 1) => {
    const group = grouped[p.placementKey || ''] || [];
    const idx = group.findIndex((x) => x.id === p.id);
    const swap = group[idx + dir];
    if (!swap) return;
    try {
      await Promise.all([
        marketingService.updatePlacement(p.id!, { position: swap.position }),
        marketingService.updatePlacement(swap.id!, { position: p.position }),
      ]);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <MarketingShell
      title="Quản lý vị trí sản phẩm"
      subtitle="Sắp xếp thứ tự sản phẩm hiển thị ở các khu vực nổi bật trên trang chủ và trang danh mục."
      action={
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold"
        >
          <Plus size={15} /> Thêm placement
        </button>
      }
    >
      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : placements.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Chưa có placement nào"
          hint="Thêm sản phẩm vào các vị trí hiển thị để kiểm soát thứ tự xuất hiện trên trang chủ."
          action={
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold"
            >
              <Plus size={15} /> Thêm placement đầu tiên
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([key, items]) => {
            const keyMeta = KEY_OPTIONS.find((o) => o.value === key);
            return (
              <div key={key} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11.5px] uppercase tracking-wider text-slate-500 font-medium">{keyMeta?.label || key}</div>
                    <div className="text-[12.5px] text-slate-700 mt-0.5">{items.length} sản phẩm</div>
                  </div>
                  <Badge tone="gray">{key}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <th className="px-4 py-2 font-medium w-12">#</th>
                        <th className="px-4 py-2 font-medium">Sản phẩm</th>
                        <th className="px-4 py-2 font-medium">Trạng thái</th>
                        <th className="px-4 py-2 font-medium text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 align-top tabular-nums font-semibold text-slate-700">{idx + 1}</td>
                          <td className="px-4 py-2.5 align-top">
                            <div className="font-medium text-slate-900">Product #{p.productId}</div>
                            {p.productName ? <div className="text-[12px] text-slate-500">{p.productName}</div> : null}
                            <div className="text-[11.5px] text-slate-400 mt-0.5">position: {p.position}</div>
                          </td>
                          <td className="px-4 py-2.5 align-top">
                            <Badge tone={statusTone(p.status)} dot>{p.status || 'ACTIVE'}</Badge>
                          </td>
                          <td className="px-4 py-2.5 align-top">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => movePosition(p, -1)}
                                disabled={idx === 0}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white"
                                aria-label="Lên"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={() => movePosition(p, 1)}
                                disabled={idx === items.length - 1}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white"
                                aria-label="Xuống"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                onClick={() => { setEditing(p); setShowForm(true); }}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700"
                                aria-label="Sửa"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(p)}
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
            );
          })}
        </div>
      )}

      <PlacementForm
        open={showForm}
        placement={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Xóa placement này?"
        message={`Sản phẩm sẽ bị gỡ khỏi vị trí "${confirmDelete?.placementKey}".`}
        confirmText="Xóa placement"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </MarketingShell>
  );
}

interface PlacementFormProps {
  open: boolean;
  placement: ProductPlacement | null;
  onClose: () => void;
  onSubmit: (data: Partial<ProductPlacement>) => Promise<void>;
}

function PlacementForm({ open, placement, onClose, onSubmit }: PlacementFormProps) {
  const [form, setForm] = useState<Partial<ProductPlacement>>(placement || defaultPlacement());
  const [saving, setSaving] = useState(false);

  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductLite[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) setForm(placement || defaultPlacement());
  }, [open, placement]);

  const searchProduct = async (q: string) => {
    if (!q || q.trim().length < 1) {
      setProductResults([]);
      return;
    }
    setSearching(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081';
      const res = await fetch(`${API}/api/products?search=${encodeURIComponent(q)}&pageSize=8`);
      if (res.ok) {
        const data = await res.json();
        const list = (data.data?.content || data.data || data.content || data || []) as any[];
        setProductResults(list.slice(0, 8).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.images?.[0]?.imageUrl || p.imageUrl,
        })));
      }
    } catch (e) {
      // silent
    } finally {
      setSearching(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<ProductPlacement> = {
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
      title={placement?.id ? 'Chỉnh sửa placement' : 'Thêm placement mới'}
      description="Chọn sản phẩm và vị trí hiển thị. Số position nhỏ sẽ hiển thị trước."
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 px-3.5 rounded-md border border-slate-300 bg-white text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            Hủy
          </button>
          <button
            type="submit"
            form="placement-form"
            disabled={saving}
            className="h-9 px-4 rounded-md bg-slate-900 hover:bg-black text-white text-[13px] font-semibold inline-flex items-center gap-2"
          >
            {saving && <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
            {placement?.id ? 'Lưu thay đổi' : 'Thêm placement'}
          </button>
        </>
      }
    >
      <form id="placement-form" onSubmit={submit} className="space-y-4">
        <div>
          <FieldLabel required>Vị trí hiển thị</FieldLabel>
          <SelectInput value={form.placementKey || 'HOME_NEW'} onChange={(e) => setForm({ ...form, placementKey: e.target.value })}>
            {KEY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </SelectInput>
        </div>

        {/* Product picker */}
        <div>
          <FieldLabel required>Chọn sản phẩm</FieldLabel>
          {form.productId ? (
            <div className="mt-1.5 flex items-center gap-3 border border-slate-300 rounded-md p-3 bg-white">
              <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-slate-500 text-[11px] font-mono">#{form.productId}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-slate-900 truncate">Product #{form.productId}</div>
                <div className="text-[11.5px] text-slate-500">Đã chọn</div>
              </div>
              <button type="button" onClick={() => setForm({ ...form, productId: undefined })} className="text-[12px] text-slate-500 hover:text-slate-900">
                Đổi sản phẩm
              </button>
            </div>
          ) : (
            <div className="mt-1.5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => { setProductQuery(e.target.value); searchProduct(e.target.value); }}
                  placeholder="Tìm sản phẩm theo tên…"
                  className="w-full h-9 pl-8 pr-3 rounded-md border border-slate-300 bg-white text-[13px] focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <div className="mt-2 max-h-56 overflow-y-auto border border-slate-200 rounded-md bg-white">
                {searching ? (
                  <div className="p-3 text-[12.5px] text-slate-500">Đang tìm…</div>
                ) : productResults.length === 0 ? (
                  <div className="p-3 text-[12.5px] text-slate-500">
                    {productQuery ? `Không tìm thấy kết quả cho "${productQuery}"` : 'Nhập tên sản phẩm để tìm kiếm'}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {productResults.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, productId: p.id, productName: p.name })}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left"
                        >
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt="" className="h-9 w-9 rounded object-cover bg-slate-100 border border-slate-200" />
                          ) : (
                            <div className="h-9 w-9 rounded bg-slate-100 border border-slate-200" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-slate-900 truncate">{p.name}</div>
                            <div className="text-[11.5px] text-slate-500">ID: {p.id}</div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-2">
                <label className="block text-[11.5px] uppercase tracking-wider text-slate-500 font-medium">Hoặc nhập ID trực tiếp</label>
                <NumberInput
                  min={1}
                  placeholder="ID sản phẩm"
                  value={form.productId ?? ''}
                  onChange={(e) => setForm({ ...form, productId: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel hint="Số nhỏ = hiển thị trước">Thứ tự (position)</FieldLabel>
            <NumberInput min={0} value={form.position ?? 0} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
          </div>
          <div>
            <FieldLabel>Trạng thái</FieldLabel>
            <SelectInput value={form.status || 'ACTIVE'} onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'PAUSED' })}>
              <option value="ACTIVE">Đang hiển thị</option>
              <option value="PAUSED">Tạm ẩn</option>
            </SelectInput>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel hint="Để trống = luôn hiển thị">Bắt đầu</FieldLabel>
            <input
              type="date"
              value={form.startDate ? new Date(form.startDate).toISOString().slice(0, 10) : ''}
              onChange={(e) => setForm({ ...form, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <FieldLabel hint="Để trống = không giới hạn">Kết thúc</FieldLabel>
            <input
              type="date"
              value={form.endDate ? new Date(form.endDate).toISOString().slice(0, 10) : ''}
              onChange={(e) => setForm({ ...form, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

function defaultPlacement(): Partial<ProductPlacement> {
  return {
    placementKey: 'HOME_NEW',
    productId: undefined,
    position: 0,
    status: 'ACTIVE',
  };
}
