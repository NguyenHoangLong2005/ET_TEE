"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, ArrowDownToLine, Search, MapPin, X, ArrowRight, History, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { staffAction, staffList, staffRequest, errorMessage } from "@/lib/staff-api";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

type InventoryItem = {
  id: number;
  productId: number;
  productName: string;
  quantityOnHand: number;
  warehouseLocation?: string | null;
};

type CatalogProduct = { id: number; name: string };

/** Sản phẩm chọn được: mọi sản phẩm trong danh mục, kèm tồn nếu đã có dòng tồn kho (chưa có = 0). */
type PickProduct = { productId: number; productName: string; quantityOnHand: number; warehouseLocation?: string | null };

type Supplier = { id: number; name: string };

type VariantOption = { id: number; sku: string; color?: string | null; size?: string | null; availableQuantity?: number | null };

const variantLabel = (v: VariantOption) => [v.color, v.size].filter(Boolean).join(" / ") || v.sku;

type Receipt = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  location?: string | null;
  supplier?: string | null;
  note?: string | null;
  createdAt?: string;
};

const inputCls =
  "w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

const fmtTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";

function Field({ label, required, hint, children, className = "" }: { label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="text-primary-600"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export default function WarehouseReceivingPage() {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [products, setProducts] = useState<PickProduct[]>([]);
  const [history, setHistory] = useState<Receipt[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [selected, setSelected] = useState<PickProduct | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [formQty, setFormQty] = useState("10");
  const [formLocation, setFormLocation] = useState("");
  const [formSupplierId, setFormSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formNote, setFormNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // The storefront sells per variant, so a receipt must say which colour / size it restocks.
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [formVariantId, setFormVariantId] = useState("");

  useEffect(() => {
    setVariants([]);
    setFormVariantId("");
    if (!selected) return;
    let cancelled = false;
    setVariantsLoading(true);
    staffList<VariantOption>(`/api/staff/warehouse/products/${selected.productId}/variants`)
      .then((list) => {
        if (cancelled) return;
        setVariants(list);
        if (list.length === 1) setFormVariantId(String(list[0].id));
      })
      .catch(() => { if (!cancelled) setVariants([]); })
      .finally(() => { if (!cancelled) setVariantsLoading(false); });
    return () => { cancelled = true; };
  }, [selected]);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [inventory, catalog] = await Promise.all([
        staffList<InventoryItem>("/api/staff/warehouse/inventory"),
        staffList<CatalogProduct>("/api/staff/warehouse/products"),
      ]);
      const stock = new Map(inventory.map((i) => [i.productId, i] as const));
      const merged = new Map<number, PickProduct>();
      for (const c of catalog) {
        const inv = stock.get(c.id);
        merged.set(c.id, { productId: c.id, productName: c.name, quantityOnHand: inv?.quantityOnHand ?? 0, warehouseLocation: inv?.warehouseLocation });
      }
      // Dòng tồn kho có mà danh mục không trả (hiếm): vẫn cho chọn.
      for (const i of inventory) {
        if (!merged.has(i.productId)) merged.set(i.productId, { productId: i.productId, productName: i.productName, quantityOnHand: i.quantityOnHand, warehouseLocation: i.warehouseLocation });
      }
      setProducts([...merged.values()].sort((a, b) => a.productName.localeCompare(b.productName, "vi")));
    } catch (e) {
      setError(errorMessage(e));
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await staffList<Receipt>("/api/staff/warehouse/inbound"));
    } catch (e) {
      setError(errorMessage(e));
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Danh sách nhà cung cấp do chủ cửa hàng tạo (dùng chung + của chi nhánh).
  const loadSuppliers = useCallback(async () => {
    try {
      const page = await staffRequest<{ items?: Supplier[] }>("/api/suppliers?size=200");
      setSuppliers((page?.items ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, "vi")));
    } catch {
      setSuppliers([]); // không chặn nhập kho; nhà cung cấp là tùy chọn
    }
  }, []);

  const reload = useCallback(() => {
    setError("");
    void loadSuppliers();
    void loadProducts();
    void loadHistory();
  }, [loadProducts, loadHistory, loadSuppliers]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Liên kết từ trang Đề xuất nhập / Tồn kho: /receiving?productId=12&qty=30 điền sẵn form.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || products.length === 0) return;
    setPrefilled(true);
    const params = new URLSearchParams(window.location.search);
    const pid = Number(params.get("productId"));
    const match = products.find((p) => p.productId === pid);
    if (match) {
      setSelected(match);
      setFormLocation(match.warehouseLocation ?? "");
      const qty = Number(params.get("qty"));
      if (Number.isInteger(qty) && qty > 0) setFormQty(String(qty));
    }
  }, [products, prefilled]);

  const pickerResults = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products
      .filter((p) => !q || p.productName.toLowerCase().includes(q) || String(p.productId) === q)
      .slice(0, 50);
  }, [products, productSearch]);

  const selectProduct = (p: PickProduct) => {
    setSelected(p);
    setProductSearch("");
    setFormLocation(p.warehouseLocation ?? "");
    setShowPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.error("Vui lòng chọn sản phẩm từ danh sách");
      return;
    }
    const qty = Number(formQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Số lượng phải là số nguyên lớn hơn 0");
      return;
    }
    if (variants.length > 0 && !formVariantId) {
      toast.error("Vui lòng chọn màu / size cần nhập");
      return;
    }
    const chosen = variants.find((v) => String(v.id) === formVariantId);
    setIsSubmitting(true);
    try {
      await staffAction("/api/staff/warehouse/inbound", "POST", {
        productId: selected.productId,
        variantId: chosen ? chosen.id : undefined,
        quantity: qty,
        location: formLocation.trim() || undefined,
        supplierId: formSupplierId ? Number(formSupplierId) : undefined,
        note: formNote.trim() || undefined,
      });
      toast.success(`Đã nhập ${qty} × "${selected.productName}${chosen ? ` (${variantLabel(chosen)})` : ""}" vào kho`);
      setSelected(null);
      setFormQty("10");
      setFormLocation("");
      setFormSupplierId("");
      setFormNote("");
      window.history.replaceState(null, "", window.location.pathname); // bỏ productId/qty đã dùng
      setTab("history");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (r) => (r.productName ?? "").toLowerCase().includes(q) || (r.supplier ?? "").toLowerCase().includes(q) || (r.location ?? "").toLowerCase().includes(q),
    );
  }, [history, searchQuery]);

  const todayStr = new Date().toDateString();
  const todayCount = history.filter((r) => r.createdAt && new Date(r.createdAt).toDateString() === todayStr).length;
  const totalQty = history.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const qtyNum = Number(formQty);
  const validQty = Number.isInteger(qtyNum) && qtyNum > 0;
  const supplierName = suppliers.find((s) => String(s.id) === formSupplierId)?.name;

  const historyColumns: Column<Receipt>[] = [
    { key: "id", header: "Phiếu", render: (r) => <span className="font-mono font-bold text-slate-700">#{r.id}</span> },
    {
      key: "product",
      header: "Sản phẩm",
      render: (r) => (
        <div className="max-w-[20rem]">
          <p className="font-semibold text-slate-900 line-clamp-2">{r.productName}</p>
          {r.note && <p className="mt-0.5 text-[11px] italic text-slate-400">{r.note}</p>}
        </div>
      ),
    },
    { key: "quantity", header: "SL nhập", render: (r) => <span className="font-mono text-base font-black text-emerald-600">+{r.quantity}</span> },
    {
      key: "location",
      header: "Vị trí",
      render: (r) =>
        r.location ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-700">
            <MapPin className="h-3 w-3 text-slate-400" />{r.location}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    { key: "supplier", header: "Nhà cung cấp", render: (r) => <span className="text-xs text-slate-600">{r.supplier || "—"}</span> },
    { key: "createdAt", header: "Thời gian", render: (r) => <span className="whitespace-nowrap font-mono text-[11px] text-slate-400">{fmtTime(r.createdAt)}</span> },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Nhập Kho"
          subtitle="Ghi nhận hàng nhập về kho. Tồn kho được cộng ngay khi tạo phiếu."
          badge={<span className="bg-primary-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
          actions={
            <Button variant="outline" size="sm" onClick={reload} icon={<RefreshCw className={`w-3.5 h-3.5 ${loadingProducts || historyLoading ? "animate-spin" : ""}`} />}>
              Làm mới
            </Button>
          }
        />

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {([["new", "Tạo phiếu mới", PackagePlus], ["history", "Lịch sử nhập", History]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                  tab === key ? "bg-primary-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Hôm nay <b className="text-slate-800">{todayCount}</b> phiếu · tổng nhập gần đây <b className="text-slate-800">{totalQty.toLocaleString("vi-VN")}</b> sản phẩm
          </p>
        </div>

        {tab === "new" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4">
                <ArrowDownToLine className="h-5 w-5 text-primary-600" />
                <h2 className="text-sm font-bold text-slate-900">Thông tin phiếu nhập</h2>
              </div>

              <div className="grid grid-cols-1 gap-x-5 gap-y-5 p-5 md:grid-cols-2">
                <Field label="Sản phẩm" required className="md:col-span-2">
                  {selected ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{selected.productName}</p>
                        <p className="font-mono text-[11px] text-slate-500">SP #{selected.productId} · đang có {selected.quantityOnHand}</p>
                      </div>
                      <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Chọn sản phẩm khác">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); setShowPicker(true); }}
                        onFocus={() => setShowPicker(true)}
                        placeholder={loadingProducts ? "Đang tải danh sách sản phẩm..." : "Tìm sản phẩm theo tên hoặc mã..."}
                        className={`${inputCls} pl-10`}
                      />
                      {showPicker && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
                          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                            {pickerResults.map((p) => (
                              <button
                                type="button"
                                key={p.productId}
                                onClick={() => selectProduct(p)}
                                className="flex w-full items-center justify-between gap-3 border-b border-slate-50 px-4 py-2.5 text-left transition last:border-0 hover:bg-slate-50"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">{p.productName}</p>
                                  <p className="font-mono text-[11px] text-slate-400">SP #{p.productId} · {p.warehouseLocation || "chưa gán vị trí"}</p>
                                </div>
                                <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700">{p.quantityOnHand}</span>
                              </button>
                            ))}
                            {pickerResults.length === 50 && (
                              <p className="px-4 py-2 text-[11px] text-slate-400">Chỉ hiện 50 kết quả đầu. Gõ thêm để thu hẹp.</p>
                            )}
                            {!loadingProducts && pickerResults.length === 0 && (
                              <p className="px-4 py-3 text-xs text-slate-400">Không tìm thấy sản phẩm nào.</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Field>

                {selected && (variantsLoading || variants.length > 0) && (
                  <Field label="Màu / Size" required className="md:col-span-2" hint="Số lượng nhập được cộng vào tồn bán của đúng phân loại này.">
                    <select
                      value={formVariantId}
                      onChange={(e) => setFormVariantId(e.target.value)}
                      disabled={variantsLoading}
                      className={inputCls}
                    >
                      <option value="">{variantsLoading ? "Đang tải phân loại..." : "— Chọn màu / size —"}</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {variantLabel(v)} · SKU {v.sku} · đang bán được {v.availableQuantity ?? 0}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Số lượng nhập" required>
                  <input type="number" required min={1} step={1} value={formQty} onChange={(e) => setFormQty(e.target.value)} className={`${inputCls} font-mono`} />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[10, 20, 50, 100].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFormQty(String((Number(formQty) || 0) + n))}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                      >
                        +{n}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Vị trí kho" hint="Để trống để giữ vị trí hiện tại">
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value.toUpperCase())}
                    placeholder="VD: KHO-A1"
                    className={`${inputCls} font-mono uppercase`}
                  />
                </Field>

                <Field label="Nhà cung cấp" hint={suppliers.length === 0 ? "Chưa có nhà cung cấp. Chủ cửa hàng cần tạo ở mục Nhà cung cấp." : undefined}>
                  <select value={formSupplierId} onChange={(e) => setFormSupplierId(e.target.value)} className={inputCls}>
                    <option value="">— Không chọn —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Ghi chú">
                  <input type="text" value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="Tình trạng hàng, thiếu hụt..." className={inputCls} />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
                <Button type="submit" variant="primary" loading={isSubmitting} disabled={!selected || !validQty || (variants.length > 0 && !formVariantId)} icon={<Plus className="h-4 w-4" />}>
                  Tạo phiếu nhập kho
                </Button>
              </div>
            </form>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold text-slate-900">Tóm tắt phiếu</h2>
                {selected ? (
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Tồn kho</dt>
                      <dd className="flex items-center gap-2 font-mono font-bold">
                        <span className="text-slate-500">{selected.quantityOnHand}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-lg font-black text-emerald-600">{validQty ? selected.quantityOnHand + qtyNum : "—"}</span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Vị trí</dt>
                      <dd className="font-mono font-semibold text-slate-800">{formLocation || selected.warehouseLocation || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Nhà cung cấp</dt>
                      <dd className="truncate font-semibold text-slate-800">{supplierName ?? "—"}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-slate-400">Chọn sản phẩm để xem tồn kho trước và sau khi nhập.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Vừa nhập gần đây</h2>
                  {history.length > 0 && (
                    <button onClick={() => setTab("history")} className="text-xs font-semibold text-primary-600 hover:underline">Xem tất cả</button>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-slate-400">Chưa có phiếu nhập nào.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {history.slice(0, 5).map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{r.productName}</p>
                          <p className="text-[11px] text-slate-400">{fmtTime(r.createdAt)}{r.supplier ? ` · ${r.supplier}` : ""}</p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-black text-emerald-600">+{r.quantity}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        )}

        {tab === "history" && (
          <DataTable<Receipt>
            columns={historyColumns}
            data={filteredHistory}
            rowKey={(r) => r.id}
            loading={historyLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Tìm sản phẩm, nhà cung cấp, vị trí..."
            emptyTitle="Chưa có phiếu nhập kho"
            emptyMessage="Các phiếu nhập được tạo sẽ hiển thị tại đây."
          />
        )}
      </div>
    </main>
  );
}
