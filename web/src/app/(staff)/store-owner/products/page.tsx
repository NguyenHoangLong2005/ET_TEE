'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SafeImage from '@/components/ui/SafeImage';
import { toast } from 'sonner';
import { RefreshCw, Search, X, Save, RotateCcw, Pencil, Plus, Trash2, Tag } from 'lucide-react';
import ProductFormModal from './ProductFormModal';

/** One price for the whole system: these are the product's real list / promotional prices. */
interface ShopProduct {
  id: number;
  name: string;
  slug: string;
  categoryName?: string;
  brand?: string;
  basePrice?: number | null; // list price
  baseSalePrice?: number | null; // promotional price
  isAvailableForSale?: boolean;
  status?: string;
  imageUrl?: string;
}

interface CategoryOption { id: number; name: string; slug: string; parentId: number | null }

type BulkAction = 'ACTIVATE' | 'DEACTIVATE' | 'CLEAR_SALE';

const PAGE_SIZE = 20;

const FRIENDLY_CATEGORY: Record<string, string> = {
  men: 'Nam', women: 'Nữ', kids: 'Trẻ em', family: 'Gia đình', accessories: 'Phụ kiện',
};

const MODES = [
  { key: '', label: 'Tất cả' },
  { key: 'sale', label: 'Đang khuyến mãi' },
  { key: 'inactive', label: 'Tạm ngưng bán' },
] as const;

const BULK_CONFIRM: Record<Exclude<BulkAction, 'ACTIVATE'>, { title: string; message: (n: number) => string; confirm: string }> = {
  DEACTIVATE: {
    title: 'Tạm ngưng bán các sản phẩm đã chọn?',
    message: (n) => `${n} sản phẩm sẽ ngừng hiển thị trên cửa hàng cho tới khi bạn bật bán lại.`,
    confirm: 'Tạm ngưng bán',
  },
  CLEAR_SALE: {
    title: 'Bỏ khuyến mãi các sản phẩm đã chọn?',
    message: (n) => `${n} sản phẩm sẽ quay về bán đúng giá niêm yết trên toàn hệ thống.`,
    confirm: 'Bỏ khuyến mãi',
  },
};

const money = (v?: number | null) => (typeof v === 'number' ? `${Math.round(v).toLocaleString('vi-VN')} ₫` : '—');

const hasSale = (p: ShopProduct) =>
  p.baseSalePrice != null && p.basePrice != null && p.baseSalePrice < p.basePrice;

const inputClass =
  'ui-control w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function StoreOwnerProductsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [categoryId, setCategoryId] = useState('');
  const [mode, setMode] = useState<(typeof MODES)[number]['key']>('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [form, setForm] = useState({ price: '', sale: '', active: true });
  const [saving, setSaving] = useState(false);

  const [pendingBulk, setPendingBulk] = useState<Exclude<BulkAction, 'ACTIVATE'> | null>(null);
  const [busy, setBusy] = useState(false);

  /** undefined = closed, null = create, number = edit that product */
  const [formFor, setFormFor] = useState<number | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<ShopProduct | null>(null);
  const [deleteCheck, setDeleteCheck] = useState<{ canDelete: boolean; reason?: string | null; openOrderCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openDelete = async (p: ShopProduct) => {
    setToDelete(p);
    setDeleteCheck(null);
    try {
      setDeleteCheck(await apiClient.get(`/api/store-owner/products/${p.id}/delete-check`));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể kiểm tra điều kiện xóa');
      setToDelete(null);
    }
  };
  const closeDelete = () => { setToDelete(null); setDeleteCheck(null); };
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/store-owner/products/${toDelete.id}`);
      toast.success('Đã xóa sản phẩm');
      closeDelete();
      if (products.length === 1 && page > 0) setPage(page - 1); else await fetchProducts(true);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa sản phẩm');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await apiClient.get<CategoryOption[]>('/api/categories');
        setCategories((Array.isArray(list) ? list : []).filter((c) => c.parentId == null));
      } catch {
        /* the category filter simply stays empty */
      }
    })();
  }, []);

  const fetchProducts = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (debouncedSearch.trim()) params.append('keyword', debouncedSearch.trim());
      if (categoryId) params.append('categoryId', categoryId);
      if (mode) params.append('status', mode);
      const res: any = await apiClient.get(`/api/store-owner/products?${params.toString()}`);
      setProducts(res?.items ?? (Array.isArray(res) ? res : []));
      setTotalPages(Math.max(1, Number(res?.totalPages ?? 1)));
      setTotalItems(Number(res?.totalItems ?? 0));
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách sản phẩm');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryId, mode]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  // a selection only makes sense for the list it was made on
  useEffect(() => { setSelectedIds(new Set()); }, [page, debouncedSearch, categoryId, mode]);

  /* ─── selection ─── */
  const pageIds = useMemo(() => products.map((p) => p.id), [products]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(pageIds));
  const toggleOne = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  /* ─── edit ─── */
  const openEdit = (p: ShopProduct) => {
    setEditing(p);
    setForm({
      price: p.basePrice != null ? String(Math.round(p.basePrice)) : '',
      sale: hasSale(p) && p.baseSalePrice != null ? String(Math.round(p.baseSalePrice)) : '',
      active: p.isAvailableForSale !== false,
    });
  };

  const parsed = useMemo(() => {
    const price = form.price.trim() === '' ? null : Number(form.price);
    const sale = form.sale.trim() === '' ? null : Number(form.sale);
    let error = '';
    if (price === null || !Number.isFinite(price) || price <= 0) error = 'Nhập giá niêm yết lớn hơn 0.';
    else if (price % 1000 !== 0) error = 'Giá niêm yết phải là bội số của 1.000đ.';
    else if (sale !== null) {
      if (!Number.isFinite(sale) || sale <= 0) error = 'Giá khuyến mãi phải lớn hơn 0 (để trống nếu không khuyến mãi).';
      else if (sale % 1000 !== 0) error = 'Giá khuyến mãi phải là bội số của 1.000đ.';
      else if (sale >= price) error = 'Giá khuyến mãi phải nhỏ hơn giá niêm yết.';
    }
    const shown = sale ?? price;
    const percentOff = price && sale && sale < price ? Math.round(((price - sale) / price) * 100) : 0;
    const changed =
      !!editing &&
      (price !== (editing.basePrice ?? null) ||
        sale !== (hasSale(editing) ? editing.baseSalePrice ?? null : null) ||
        form.active !== (editing.isAvailableForSale !== false));
    return { price, sale, error, shown, percentOff, changed };
  }, [form.price, form.sale, form.active, editing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || saving) return;
    if (parsed.error) return toast.error(parsed.error);
    setSaving(true);
    try {
      await apiClient.put(`/api/store-owner/products/${editing.id}/pricing`, {
        price: parsed.price,
        salePrice: parsed.sale,
        active: form.active,
      });
      toast.success('Đã cập nhật giá trên toàn hệ thống');
      setEditing(null);
      await fetchProducts(true);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu thay đổi');
    } finally {
      setSaving(false);
    }
  };

  /* ─── bulk ─── */
  const runBulk = async (action: BulkAction) => {
    setBusy(true);
    try {
      const res: any = await apiClient.put('/api/store-owner/products/bulk', {
        productIds: Array.from(selectedIds),
        action,
      });
      const verb = action === 'ACTIVATE' ? 'Đã bật bán' : action === 'DEACTIVATE' ? 'Đã tạm ngưng bán' : 'Đã bỏ khuyến mãi cho';
      toast.success(`${verb} ${res?.changed ?? 0} sản phẩm`);
      setPendingBulk(null);
      setSelectedIds(new Set());
      await fetchProducts(true);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật hàng loạt');
    } finally {
      setBusy(false);
    }
  };

  const resetFilters = () => { setSearch(''); setCategoryId(''); setMode(''); setPage(0); };
  const filtersActive = !!search || !!categoryId || !!mode;

  /* ─── table ─── */
  const columns: Column<ShopProduct>[] = [
    {
      key: 'select',
      width: '48px',
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          aria-label="Chọn tất cả sản phẩm trong trang"
          className="h-4 w-4 rounded border-slate-300 accent-primary cursor-pointer"
        />
      ),
      render: (p) => (
        <input
          type="checkbox"
          checked={selectedIds.has(p.id)}
          onChange={() => toggleOne(p.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Chọn ${p.name}`}
          className="h-4 w-4 rounded border-slate-300 accent-primary cursor-pointer"
        />
      ),
    },
    {
      key: 'name',
      header: 'Sản phẩm',
      render: (p) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            <SafeImage src={p.imageUrl || ''} alt={p.name} fill className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900" title={p.name}>{p.name}</p>
            <p className="truncate text-xs text-slate-400 font-mono" title={p.slug}>#{p.id} · {p.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Danh mục',
      width: '120px',
      render: (p) => <span className="block truncate text-sm text-slate-600">{FRIENDLY_CATEGORY[(p.categoryName || '').toLowerCase()] || p.categoryName || '—'}</span>,
    },
    {
      key: 'basePrice',
      header: 'Giá niêm yết',
      width: '140px',
      align: 'right',
      render: (p) => (
        <span className={`font-mono text-sm ${hasSale(p) ? 'text-slate-400 line-through' : 'font-bold text-slate-900'}`}>{money(p.basePrice)}</span>
      ),
    },
    {
      key: 'baseSalePrice',
      header: 'Giá khuyến mãi',
      width: '170px',
      align: 'right',
      render: (p) =>
        hasSale(p) ? (
          <div className="text-right">
            <span className="font-mono text-sm font-bold text-primary">{money(p.baseSalePrice)}</span>
            <div className="text-[11px] font-semibold text-emerald-600">
              -{Math.round((((p.basePrice as number) - (p.baseSalePrice as number)) / (p.basePrice as number)) * 100)}%
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-300">—</span>
        ),
    },
    {
      key: 'isAvailableForSale',
      header: 'Bán hàng',
      width: '140px',
      render: (p) =>
        p.isAvailableForSale === false ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Tạm ngưng
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Đang bán
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '132px',
      align: 'right',
      render: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" title="Sửa giá nhanh" aria-label="Sửa giá nhanh" onClick={() => openEdit(p)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
            <Tag className="w-4 h-4" />
          </button>
          <button type="button" title="Chỉnh sửa sản phẩm" aria-label="Chỉnh sửa sản phẩm" onClick={() => setFormFor(p.id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button type="button" title="Xóa sản phẩm" aria-label="Xóa sản phẩm" onClick={() => openDelete(p)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-[#E50027] hover:bg-[#FFF0F2] transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">
        <PageHeader
          title="Sản phẩm & giá bán"
          subtitle="Thêm, chỉnh sửa, xóa sản phẩm và cập nhật giá, khuyến mãi, trạng thái bán. Mọi thay đổi áp dụng cho toàn hệ thống."
          actions={
            <div className="flex items-center gap-2.5">
              <Button variant="outline" onClick={fetchProducts} loading={loading} icon={<RefreshCw className="w-4 h-4" />}>
                Làm mới
              </Button>
              <Button onClick={() => setFormFor(null)} icon={<Plus className="w-4 h-4" />}>
                Thêm sản phẩm
              </Button>
            </div>
          }
        />

        {/* Bộ lọc */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-8">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Tìm theo tên hoặc đường dẫn sản phẩm..."
                className={`${inputClass} pl-10`}
                aria-label="Tìm kiếm"
              />
            </div>
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}
              className={`${inputClass} lg:col-span-4`}
              aria-label="Danh mục"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{FRIENDLY_CATEGORY[c.slug] || c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {MODES.map((m) => (
              <button
                key={m.key || 'all'}
                type="button"
                onClick={() => { setMode(m.key); setPage(0); }}
                className={`ui-control-medium h-8 px-3.5 rounded-full border font-sans transition-colors ${
                  mode === m.key
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-900 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
            {filtersActive && (
              <button type="button" onClick={resetFilters} className="ui-control inline-flex items-center gap-1 font-sans font-semibold text-primary hover:underline ml-1">
                <RotateCcw className="w-3.5 h-3.5" /> Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Thanh thao tác hàng loạt */}
        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-white">
            <span className="text-sm font-semibold">Đã chọn {selectedIds.size} sản phẩm</span>
            <span className="h-5 w-px bg-white/20" aria-hidden="true" />
            <button type="button" disabled={busy} onClick={() => runBulk('ACTIVATE')} className="ui-control-medium rounded-full bg-white/10 px-3.5 py-1 font-sans hover:bg-white/20 disabled:opacity-50">Bật bán</button>
            <button type="button" disabled={busy} onClick={() => setPendingBulk('DEACTIVATE')} className="ui-control-medium rounded-full bg-white/10 px-3.5 py-1 font-sans hover:bg-white/20 disabled:opacity-50">Tạm ngưng bán</button>
            <button type="button" disabled={busy} onClick={() => setPendingBulk('CLEAR_SALE')} className="ui-control-medium rounded-full bg-white/10 px-3.5 py-1 font-sans hover:bg-white/20 disabled:opacity-50">Bỏ khuyến mãi</button>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="ui-control ml-auto font-sans text-white/70 hover:text-white">Bỏ chọn</button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-900">{totalItems.toLocaleString('vi-VN')}</span> sản phẩm{filtersActive ? ' khớp bộ lọc' : ''}
          </p>
        )}

        <Card noPadding>
          <DataTable<ShopProduct>
            data={products}
            columns={columns}
            loading={loading}
            fixedLayout
            rowKey={(p) => p.id}
            onRowClick={openEdit}
            pagination={{
              currentPage: page,
              totalPages,
              totalItems,
              pageSize: PAGE_SIZE,
              onPageChange: (p) => setPage(p),
            }}
            emptyTitle="Không tìm thấy sản phẩm nào"
            emptyMessage="Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
          />
        </Card>

        {/* Chỉnh sửa giá và trạng thái bán */}
        {editing && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h3 className="text-sm font-semibold text-slate-900">Giá và trạng thái bán</h3>
                <button type="button" onClick={() => setEditing(null)} aria-label="Đóng" className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col" noValidate>
                <div className="space-y-5 overflow-y-auto p-6">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <SafeImage src={editing.imageUrl || ''} alt={editing.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900" title={editing.name}>{editing.name}</p>
                      <p className="text-xs text-slate-400 font-mono">#{editing.id}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Giá niêm yết (₫) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number" min="0" step="1000" inputMode="numeric" required
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Giá khuyến mãi (₫)</label>
                      <input
                        type="number" min="0" step="1000" inputMode="numeric"
                        value={form.sale}
                        onChange={(e) => setForm({ ...form, sale: e.target.value })}
                        placeholder="Không khuyến mãi"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  </div>
                  {parsed.error && <p className="-mt-2 text-xs font-medium text-rose-600" role="alert">{parsed.error}</p>}

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">Đang bán</span>
                      <span className="block text-xs text-slate-500">Tắt để tạm ngưng bán và ẩn sản phẩm khỏi cửa hàng.</span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.active}
                      aria-label="Đang bán"
                      onClick={() => setForm({ ...form, active: !form.active })}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.active ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">Khách sẽ thấy</p>
                    <p className="mt-1 text-2xl font-bold text-primary font-mono">{money(parsed.shown)}</p>
                    {parsed.percentOff > 0 && <p className="text-xs text-emerald-700 mt-0.5">Giảm {parsed.percentOff}% so với giá niêm yết</p>}
                    {!form.active && <p className="text-xs text-rose-600 mt-0.5">Sản phẩm đang tạm ngưng bán.</p>}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Thay đổi áp dụng ngay cho <strong className="text-slate-700">toàn hệ thống</strong>: cửa hàng, giỏ hàng và thanh toán.
                    Đơn đã đặt trước đó giữ nguyên giá.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-3 shrink-0">
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
                  <Button type="submit" loading={saving} disabled={!parsed.changed} icon={<Save className="w-4 h-4" />}>Lưu thay đổi</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {formFor !== undefined && (
          <ProductFormModal
            productId={formFor}
            onClose={() => setFormFor(undefined)}
            onSaved={() => { setFormFor(undefined); fetchProducts(); }}
          />
        )}

        <ConfirmModal
          isOpen={!!toDelete && !!deleteCheck}
          onClose={closeDelete}
          onConfirm={deleteCheck?.canDelete ? confirmDelete : closeDelete}
          title={deleteCheck?.canDelete ? 'Xóa sản phẩm?' : 'Không thể xóa sản phẩm'}
          message={
            deleteCheck?.canDelete
              ? `Sản phẩm "${toDelete?.name}" sẽ bị xóa khỏi cửa hàng. Đơn hàng cũ vẫn giữ lịch sử của sản phẩm này. Hành động này không thể hoàn tác.`
              : (
                <div className="space-y-2">
                  <p>{deleteCheck?.reason}</p>
                  <p className="text-xs text-slate-500">Đơn hàng chưa hoàn tất: {deleteCheck?.openOrderCount ?? 0}</p>
                </div>
              )
          }
          confirmText={deleteCheck?.canDelete ? 'Xóa sản phẩm' : 'Đã hiểu'}
          cancelText="Hủy"
          isLoading={deleting}
          type={deleteCheck?.canDelete ? 'danger' : 'warning'}
        />

        <ConfirmModal
          isOpen={pendingBulk !== null}
          onClose={() => setPendingBulk(null)}
          onConfirm={() => pendingBulk && runBulk(pendingBulk)}
          title={pendingBulk ? BULK_CONFIRM[pendingBulk].title : ''}
          message={pendingBulk ? BULK_CONFIRM[pendingBulk].message(selectedIds.size) : ''}
          confirmText={pendingBulk ? BULK_CONFIRM[pendingBulk].confirm : 'Xác nhận'}
          cancelText="Hủy"
          isLoading={busy}
          type="warning"
        />
      </div>
    </PermissionGuard>
  );
}
