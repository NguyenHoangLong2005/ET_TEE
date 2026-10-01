'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, X, Save, ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import Button from '@/components/ui/Button';
import SafeImage from '@/components/ui/SafeImage';

interface ImageForm { imageUrl: string; alt: string; isPrimary?: boolean }
interface VariantForm { id?: number; sku: string; color: string; colorHex: string; size: string; stock: string | number }

interface FormState {
  name: string;
  categoryId: string;
  brand: string;
  manufacturerId: string;
  supplierId: string;
  description: string;
  gender: string;
  targetGroup: string;
  productType: string;
  material: string;
  price: string;
  sale: string;
  active: boolean;
  images: ImageForm[];
  variants: VariantForm[];
}

interface CategoryOption { id: number; name: string; parentId: number | null }
interface PartnerOption { id: number; name: string }

const emptyForm: FormState = {
  name: '', categoryId: '', brand: '', manufacturerId: '', supplierId: '', description: '', gender: '', targetGroup: '', productType: '', material: '',
  price: '', sale: '', active: true, images: [], variants: [{ sku: '', color: '', colorHex: '', size: '', stock: 0 }],
};

const TARGET_GROUPS = [
  { value: '', label: '— Không chọn —' },
  { value: 'men', label: 'Nam' },
  { value: 'women', label: 'Nữ' },
  { value: 'kids', label: 'Trẻ em' },
  { value: 'baby', label: 'Em bé' },
  { value: 'family', label: 'Gia đình' },
];

const GENDERS = [
  { value: '', label: '— Không chọn —' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'unisex', label: 'Unisex' },
];

const inputClass =
  'w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E50027]/20 focus:border-[#E50027]';
const labelClass = 'block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1.5';

const money = (v: number | null) => (v == null ? '—' : `${Math.round(v).toLocaleString('vi-VN')} ₫`);

interface Props {
  /** null = create a new product */
  productId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductFormModal({ productId, onClose, onSaved }: Props) {
  const isEdit = productId != null;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [manufacturers, setManufacturers] = useState<PartnerOption[]>([]);
  const [suppliers, setSuppliers] = useState<PartnerOption[]>([]);
  const [partnersError, setPartnersError] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await apiClient.get<CategoryOption[]>('/api/categories');
        setCategories(Array.isArray(list) ? list : []);
      } catch { /* the select stays empty; the error shows on save */ }
    })();
  }, []);

  // Manufacturers and suppliers come from the store owner's "Nhà sản xuất" / "Nhà cung cấp" pages.
  useEffect(() => {
    (async () => {
      try {
        const [m, s]: any[] = await Promise.all([
          apiClient.get('/api/manufacturers?page=0&size=200'),
          apiClient.get('/api/suppliers?page=0&size=200'),
        ]);
        setManufacturers((m?.items ?? []).map((x: any) => ({ id: x.id, name: x.name })));
        setSuppliers((s?.items ?? []).map((x: any) => ({ id: x.id, name: x.name })));
      } catch {
        setPartnersError(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const p: any = await apiClient.get(`/api/store-owner/products/${productId}/form`);
        setForm({
          name: p.name ?? '',
          categoryId: p.categoryId != null ? String(p.categoryId) : '',
          brand: p.brand ?? '',
          manufacturerId: p.manufacturerId != null ? String(p.manufacturerId) : '',
          supplierId: p.supplierId != null ? String(p.supplierId) : '',
          description: p.description ?? '',
          gender: p.gender ?? '',
          targetGroup: p.targetGroup ?? '',
          productType: p.productType ?? '',
          material: p.material ?? '',
          price: p.price != null ? String(Math.round(p.price)) : '',
          sale: p.salePrice != null && p.price != null && p.salePrice < p.price ? String(Math.round(p.salePrice)) : '',
          active: p.status === 'ACTIVE',
          images: (p.images ?? []).map((i: any) => ({ imageUrl: i.imageUrl ?? '', alt: i.alt ?? '', isPrimary: i.isPrimary })),
          variants: (p.variants ?? []).map((v: any) => ({
            id: v.id, sku: v.sku ?? '', color: v.color ?? '', colorHex: v.colorHex ?? '', size: v.size ?? '', stock: v.stock ?? 0,
          })),
        });
      } catch (err: any) {
        toast.error(err?.message || 'Không thể tải thông tin sản phẩm');
        onClose();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_BYTES = 5 * 1024 * 1024;

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || uploading) return;
    const picked = Array.from(files);
    const bad = picked.find((f) => !ALLOWED.includes(f.type) || f.size > MAX_BYTES);
    if (bad) {
      toast.error(!ALLOWED.includes(bad.type) ? `"${bad.name}" không phải ảnh JPG, PNG, WEBP hoặc GIF` : `"${bad.name}" lớn hơn 5MB`);
      return;
    }
    setUploading(true);
    const added: ImageForm[] = [];
    try {
      for (const f of picked) {
        const body = new FormData();
        body.append('file', f);
        const res: any = await apiClient.post('/api/store-owner/uploads/product-image', body);
        added.push({ imageUrl: res.url, alt: '' });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải ảnh lên');
    } finally {
      if (added.length) setForm((f) => ({ ...f, images: [...f.images, ...added] }));
      setUploading(false);
    }
  };

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!/^https?:\/\//i.test(url)) return toast.error('Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://');
    if (url.length > 1000) return toast.error('Đường dẫn ảnh quá dài');
    set({ images: [...form.images, { imageUrl: url, alt: '' }] });
    setUrlDraft('');
  };

  const makeCover = (i: number) =>
    set({ images: [form.images[i], ...form.images.filter((_, k) => k !== i)] });

  /** Categories as an indented list: parent, then its children. */
  const categoryOptions = useMemo(() => {
    const ids = new Set(categories.map((c) => c.id));
    const out: { id: number; label: string }[] = [];
    const walk = (parent: number | null, depth: number) => {
      categories
        .filter((c) => (c.parentId != null && ids.has(c.parentId) ? c.parentId : null) === parent)
        .forEach((c) => { out.push({ id: c.id, label: `${'— '.repeat(depth)}${c.name}` }); walk(c.id, depth + 1); });
    };
    walk(null, 0);
    return out;
  }, [categories]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nhập tên sản phẩm.';
    if (!form.categoryId) e.categoryId = 'Chọn danh mục.';
    const price = form.price.trim() === '' ? null : Number(form.price);
    const sale = form.sale.trim() === '' ? null : Number(form.sale);
    if (price === null || !Number.isFinite(price) || price <= 0) e.price = 'Nhập giá niêm yết lớn hơn 0.';
    else if (price % 1000 !== 0) e.price = 'Giá phải là bội số của 1.000đ.';
    else if (sale !== null) {
      if (!Number.isFinite(sale) || sale <= 0) e.sale = 'Giá khuyến mãi phải lớn hơn 0 (để trống nếu không có).';
      else if (sale % 1000 !== 0) e.sale = 'Giá phải là bội số của 1.000đ.';
      else if (sale >= price) e.sale = 'Phải nhỏ hơn giá niêm yết.';
    }
    if (form.images.some((i) => !i.imageUrl.trim())) e.images = 'Có ảnh chưa nhập đường dẫn.';
    if (!isEdit) {
      const skus = form.variants.map((v) => v.sku.trim().toLowerCase());
      if (form.variants.length === 0) e.variants = 'Cần ít nhất một biến thể.';
      else if (skus.some((s) => !s)) e.variants = 'Mỗi biến thể cần có SKU.';
      else if (new Set(skus).size !== skus.length) e.variants = 'SKU bị trùng nhau.';
      else if (form.variants.some((v) => v.stock === '' || Number(v.stock) < 0 || !Number.isInteger(Number(v.stock)))) e.variants = 'Tồn kho phải là số nguyên từ 0 trở lên.';
    }
    // `price` / `sale` are the parsed numbers, only meaningful when `e` has no price errors
    return { e, price, sale } as { e: Record<string, string>; price: number | null; sale: number | null };
  }, [form, isEdit]);

  const hasErrors = Object.keys(errors.e).length > 0;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitted(true);
    if (hasErrors) return toast.error(Object.values(errors.e)[0]);
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        brand: form.brand.trim() || null,
        manufacturerId: form.manufacturerId ? Number(form.manufacturerId) : null,
        supplierId: form.supplierId ? Number(form.supplierId) : null,
        description: form.description.trim() || null,
        gender: form.gender || null,
        targetGroup: form.targetGroup || null,
        productType: form.productType.trim() || null,
        material: form.material.trim() || null,
        price: errors.price,
        salePrice: errors.sale,
        status: form.active ? 'ACTIVE' : 'INACTIVE',
        images: form.images.map((i, idx) => ({ imageUrl: i.imageUrl.trim(), alt: i.alt.trim(), isPrimary: idx === 0 })),
      };
      if (!isEdit) {
        payload.variants = form.variants.map((v) => ({
          sku: v.sku.trim(), color: v.color.trim() || null, colorHex: v.colorHex.trim() || null,
          size: v.size.trim() || null, stock: Number(v.stock),
        }));
        await apiClient.post('/api/store-owner/products', payload);
        toast.success('Đã tạo sản phẩm');
      } else {
        await apiClient.put(`/api/store-owner/products/${productId}`, payload);
        toast.success('Đã cập nhật sản phẩm');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  const err = (k: string) => (submitted && errors.e[k] ? <p className="mt-1 text-xs font-medium text-[#BD001F]" role="alert">{errors.e[k]}</p> : null);
  const fieldBorder = (k: string) => (submitted && errors.e[k] ? 'border-[#E50027]' : '');

  const priceNum = Number(form.price);
  const saleNum = form.sale.trim() === '' ? null : Number(form.sale);
  const shownPrice = !errors.e.price && !errors.e.sale ? (saleNum ?? priceNum) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900">{isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-zinc-500">Đang tải…</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="space-y-6 overflow-y-auto p-6">
              {/* Thông tin cơ bản */}
              <section className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Thông tin cơ bản</h4>
                <div>
                  <label className={labelClass}>Tên sản phẩm <span className="text-[#E50027]">*</span></label>
                  <input className={`${inputClass} ${fieldBorder('name')}`} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="VD: Áo thun cotton basic" />
                  {err('name')}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Danh mục <span className="text-[#E50027]">*</span></label>
                    <select className={`${inputClass} ${fieldBorder('categoryId')}`} value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                      <option value="">— Chọn danh mục —</option>
                      {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    {err('categoryId')}
                  </div>
                  <div>
                    <label className={labelClass}>Thương hiệu (hiển thị cho khách)</label>
                    <input className={inputClass} value={form.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="VD: ET.TEE" maxLength={100} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Nhà sản xuất</label>
                    <select className={inputClass} value={form.manufacturerId} onChange={(e) => set({ manufacturerId: e.target.value })}>
                      <option value="">— Chưa chọn —</option>
                      {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Nhà cung cấp</label>
                    <select className={inputClass} value={form.supplierId} onChange={(e) => set({ supplierId: e.target.value })}>
                      <option value="">— Chưa chọn —</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                {partnersError && (
                  <p className="text-xs font-medium text-[#BD001F]">Không tải được danh sách nhà sản xuất / nhà cung cấp. Đóng form và thử lại.</p>
                )}
                {!partnersError && (manufacturers.length === 0 || suppliers.length === 0) && (
                  <p className="text-xs text-zinc-500">
                    {manufacturers.length === 0 && 'Chưa có nhà sản xuất nào — thêm ở mục Nhà sản xuất. '}
                    {suppliers.length === 0 && 'Chưa có nhà cung cấp nào — thêm ở mục Nhà cung cấp.'}
                  </p>
                )}
                <div>
                  <label className={labelClass}>Mô tả</label>
                  <textarea rows={3} className={`${inputClass} h-auto py-2.5 resize-none`} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Chất liệu, form dáng, hướng dẫn bảo quản…" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className={labelClass}>Đối tượng</label>
                    <select className={inputClass} value={form.targetGroup} onChange={(e) => set({ targetGroup: e.target.value })}>
                      {TARGET_GROUPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Giới tính</label>
                    <select className={inputClass} value={form.gender} onChange={(e) => set({ gender: e.target.value })}>
                      {GENDERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Loại sản phẩm</label>
                    <input className={inputClass} value={form.productType} onChange={(e) => set({ productType: e.target.value })} placeholder="VD: tshirt" maxLength={100} />
                  </div>
                  <div>
                    <label className={labelClass}>Chất liệu</label>
                    <input className={inputClass} value={form.material} onChange={(e) => set({ material: e.target.value })} placeholder="VD: Cotton" maxLength={100} />
                  </div>
                </div>
              </section>

              {/* Giá */}
              <section className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Giá và trạng thái</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Giá niêm yết (₫) <span className="text-[#E50027]">*</span></label>
                    <input type="number" min="0" step="1000" inputMode="numeric" className={`${inputClass} font-mono ${fieldBorder('price')}`} value={form.price} onChange={(e) => set({ price: e.target.value })} />
                    {err('price')}
                  </div>
                  <div>
                    <label className={labelClass}>Giá khuyến mãi (₫)</label>
                    <input type="number" min="0" step="1000" inputMode="numeric" className={`${inputClass} font-mono ${fieldBorder('sale')}`} value={form.sale} onChange={(e) => set({ sale: e.target.value })} placeholder="Không khuyến mãi" />
                    {err('sale')}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4">
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900">Đang bán</span>
                    <span className="block text-xs text-zinc-500">Tắt để lưu nháp: sản phẩm không hiển thị trên cửa hàng.</span>
                  </span>
                  <button
                    type="button" role="switch" aria-checked={form.active} aria-label="Đang bán"
                    onClick={() => set({ active: !form.active })}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.active ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {shownPrice != null && (
                  <p className="text-xs text-zinc-500">
                    Khách sẽ thấy <strong className="text-[#E50027] font-mono">{money(shownPrice)}</strong>
                    {saleNum != null && priceNum > 0 && ` (giảm ${Math.round(((priceNum - saleNum) / priceNum) * 100)}%)`}
                  </p>
                )}
                {isEdit && (
                  <p className="text-xs text-zinc-500">Giá mới áp dụng cho mọi biến thể và toàn hệ thống. Đơn đã đặt trước đó giữ nguyên giá.</p>
                )}
              </section>

              {/* Ảnh */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Hình ảnh</h4>
                    <p className="mt-0.5 text-xs text-zinc-500">JPG, PNG, WEBP hoặc GIF, tối đa 5MB mỗi ảnh. Ảnh đầu tiên là ảnh bìa.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowUrlInput((v) => !v)}>
                      Dùng đường dẫn
                    </Button>
                    <Button type="button" size="sm" loading={uploading} icon={<Upload className="w-4 h-4" />}
                      onClick={() => fileInputRef.current?.click()}>
                      Tải ảnh lên
                    </Button>
                    <input
                      ref={fileInputRef} type="file" multiple hidden
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }}
                    />
                  </div>
                </div>

                {showUrlInput && (
                  <div className="flex items-center gap-2">
                    <input
                      className={inputClass} value={urlDraft} placeholder="https://… (không dán dữ liệu base64)"
                      onChange={(e) => setUrlDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                    />
                    <Button type="button" variant="outline" onClick={addUrl}>Thêm</Button>
                  </div>
                )}

                {form.images.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 py-8 text-sm text-zinc-500 hover:border-[#E50027] hover:text-[#BD001F] transition-colors"
                  >
                    <ImageIcon className="w-6 h-6" />
                    Kéo thả ảnh vào đây hoặc bấm để chọn ảnh
                  </button>
                ) : (
                  <div
                    className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}
                  >
                    {form.images.map((img, i) => (
                      <div key={`${i}-${img.imageUrl}`} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                        <div className="relative aspect-square">
                          <SafeImage src={img.imageUrl} alt={img.alt || form.name} fill className="object-cover" />
                        </div>
                        {i === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-[#E50027] px-2 py-0.5 text-[11px] font-semibold text-white">Ảnh bìa</span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                          {i !== 0 ? (
                            <button type="button" onClick={() => makeCover(i)}
                              className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-white">
                              Đặt làm bìa
                            </button>
                          ) : <span />}
                          <button type="button" aria-label="Xóa ảnh" onClick={() => set({ images: form.images.filter((_, k) => k !== i) })}
                            className="rounded-md bg-white/90 p-1.5 text-zinc-700 hover:bg-white hover:text-[#E50027]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {uploading && (
                      <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-zinc-300 text-xs text-zinc-500">
                        Đang tải lên…
                      </div>
                    )}
                  </div>
                )}
                {err('images')}
              </section>

              {/* Biến thể */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Biến thể (màu / size)</h4>
                  {!isEdit && (
                    <Button type="button" size="sm" variant="outline" icon={<Plus className="w-4 h-4" />}
                      onClick={() => set({ variants: [...form.variants, { sku: '', color: '', colorHex: '', size: '', stock: 0 }] })}>
                      Thêm biến thể
                    </Button>
                  )}
                </div>
                {isEdit ? (
                  <>
                    <div className="overflow-hidden rounded-xl border border-zinc-200">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                          <tr><th className="px-3 py-2 text-left">SKU</th><th className="px-3 py-2 text-left">Màu</th><th className="px-3 py-2 text-left">Size</th><th className="px-3 py-2 text-right">Tồn kho</th></tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {form.variants.length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-center text-zinc-400">Sản phẩm chưa có biến thể.</td></tr>}
                          {form.variants.map((v) => (
                            <tr key={v.id}>
                              <td className="px-3 py-2 font-mono text-xs">{v.sku}</td>
                              <td className="px-3 py-2">{v.color || '—'}</td>
                              <td className="px-3 py-2">{v.size || '—'}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{v.stock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-zinc-500">Tồn kho không sửa trực tiếp ở đây: để bổ sung hàng, dùng “Nhập bổ sung” ở mục Tồn kho (chọn đúng màu / size), số lượng được cộng vào hàng bán được ngay.</p>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-12 gap-2 px-1 text-[11px] font-bold uppercase text-zinc-400">
                      <span className="col-span-4">SKU *</span><span className="col-span-3">Màu</span><span className="col-span-2">Size</span><span className="col-span-2">Tồn kho</span><span />
                    </div>
                    {form.variants.map((v, i) => {
                      const upd = (patch: Partial<VariantForm>) => set({ variants: form.variants.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
                      return (
                        <div key={i} className="grid grid-cols-12 items-center gap-2">
                          <input className={`${inputClass} col-span-4 font-mono`} value={v.sku} onChange={(e) => upd({ sku: e.target.value })} placeholder="ET-AT-001-M" maxLength={100} />
                          <input className={`${inputClass} col-span-3`} value={v.color} onChange={(e) => upd({ color: e.target.value })} placeholder="Trắng" />
                          <input className={`${inputClass} col-span-2`} value={v.size} onChange={(e) => upd({ size: e.target.value })} placeholder="M" />
                          <input type="number" min="0" className={`${inputClass} col-span-2`} value={v.stock} onChange={(e) => upd({ stock: e.target.value })} />
                          <button type="button" aria-label="Xóa biến thể" disabled={form.variants.length === 1}
                            onClick={() => set({ variants: form.variants.filter((_, k) => k !== i) })}
                            className="justify-self-center p-1.5 rounded-lg text-zinc-400 hover:text-[#E50027] hover:bg-[#FFF0F2] disabled:opacity-30 disabled:pointer-events-none transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    {err('variants')}
                  </>
                )}
              </section>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-zinc-100 bg-zinc-50 px-6 py-3 shrink-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
              <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>{isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
