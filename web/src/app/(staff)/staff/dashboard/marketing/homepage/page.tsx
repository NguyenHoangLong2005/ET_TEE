"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, EyeOff, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type Banner = {
  id: number;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  position: string;
  displayOrder?: number;
  status?: string;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
};

type Placement = {
  id: number;
  productId: number;
  section: string;
  displayOrder: number;
  product?: { id?: number; name?: string; imageUrl?: string; price?: number; salePrice?: number };
};

type ProductHit = { id: number; name: string; price?: number; images?: { imageUrl: string }[] };

// Keys must match what the storefront homepage reads (web/src/app/page.tsx).
const HERO_POSITION = "HOME_HERO";
const PRODUCT_SECTIONS = [
  { key: "HOME_SALE", label: "Ưu đãi đặc biệt", hint: "Sản phẩm đang giảm giá" },
  { key: "HOME_NEW", label: "Sản phẩm mới", hint: "Hàng mới về" },
  { key: "HOME_RECOMMENDED", label: "Được yêu thích nhất", hint: "Sản phẩm được nhiều người chọn" },
  { key: "HOME_BEST_SELLER", label: "Bán chạy nhất", hint: "Sản phẩm bán chạy" },
] as const;

// Static slides the storefront falls back to (web/src/components/home/HeroBanner.tsx)
// when no banner exists in the database.
const DEFAULT_SLIDES = [
  { title: "BỘ SƯU TẬP THU ĐÔNG", subtitle: "Đẳng cấp & phong cách xu hướng thời trang hiện đại", linkUrl: "/products" },
  { title: "BEST SELLERS 2026", subtitle: "Những trang phục được săn đón và lựa chọn nhiều nhất", linkUrl: "/products?sort=best-seller" },
  { title: "ĐỒNG PHỤC GIA ĐÌNH", subtitle: "Gắn kết tình thân với thiết kế mặc đồng điệu cả nhà", linkUrl: "/products?targetGroup=family" },
  { title: "THỜI TRANG NỮ CAO CẤP", subtitle: "Thanh lịch - Quyến rũ - Tinh tế trong từng đường nét", linkUrl: "/products?targetGroup=women" },
  { title: "THỜI TRANG NAM HIỆN ĐẠI", subtitle: "Phong cách nam tính, năng động và lịch lãm", linkUrl: "/products?targetGroup=men" },
  { title: "BỘ SƯU TẬP TRẺ EM", subtitle: "Chất liệu hữu cơ siêu mềm mại, an toàn tuyệt đối cho bé", linkUrl: "/products?targetGroup=kids" },
  { title: "ƯU ĐÃI ĐẶC BIỆT", subtitle: "Săn deal giảm giá trực tiếp - Số lượng sản phẩm có hạn", linkUrl: "/products?status=sale" },
  { title: "ĐỊNH HÌNH PHONG CÁCH", subtitle: "Phối đồ cá nhân hóa nâng tầm gu thời trang của riêng bạn", linkUrl: "/products" },
].map((d, i) => ({ ...d, imageUrl: `/images/banners/home/banner-${i + 1}.webp` }));

type Selected = { type: "hero" } | { type: "products"; key: string } | null;

const api = (path: string) => `${getApiBaseUrl()}/api/staff/marketing/${path}`;
const jsonHeaders = () => ({ ...(getAuthHeaders() as Record<string, string>), "Content-Type": "application/json" });
const authOnly = () => getAuthHeaders() as Record<string, string>;
const isBannerOn = (b: Banner) => (b.status ? b.status === "ACTIVE" : b.isActive !== false);
const fmt = (v?: number) => (v == null ? "" : `${v.toLocaleString("vi-VN")}₫`);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomepageBuilderPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Selected>(null);

  const load = useCallback(async () => {
    try {
      const [bRes, pRes] = await Promise.all([
        fetch(api("banners"), { headers: authOnly(), cache: "no-store" }),
        fetch(api("placements"), { headers: authOnly(), cache: "no-store" }),
      ]);
      if (bRes.ok) {
        const list: Banner[] = await bRes.json();
        setBanners(list.filter(b => b.position === HERO_POSITION).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
      }
      if (pRes.ok) {
        const list: Placement[] = await pRes.json();
        setPlacements(list.sort((a, b) => a.displayOrder - b.displayOrder));
      }
      if (!bRes.ok && !pRes.ok) toast.error("Không tải được dữ liệu trang chủ");
    } catch {
      toast.error("Không tải được dữ liệu trang chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const bySection = useMemo(() => {
    const m: Record<string, Placement[]> = {};
    placements.forEach(p => { (m[p.section] ??= []).push(p); });
    return m;
  }, [placements]);

  const activeHero = banners.filter(isBannerOn);
  const isSel = (s: Selected) => JSON.stringify(s) === JSON.stringify(selected);

  const blockClass = (s: Selected) =>
    `group relative w-full cursor-pointer rounded-lg border-2 text-left transition ${
      isSel(s) ? "border-red-600 ring-2 ring-red-100" : "border-transparent hover:border-red-400"
    }`;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mx-auto flex max-w-7xl gap-6">
        {/* Preview */}
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="border-l-4 border-red-600 pl-3 text-xl font-semibold">Trang chủ</h1>
            <p className="mt-1 pl-4 text-sm text-slate-500">Bấm vào một khối bên dưới để chỉnh sửa nội dung hiển thị trên trang chủ.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-24 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
              {/* Hero */}
              <button type="button" onClick={() => setSelected({ type: "hero" })} className={blockClass({ type: "hero" })}>
                <EditTag />
                <div className="relative aspect-[21/9] overflow-hidden rounded-md bg-slate-900">
                  {activeHero[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeHero[0].imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-300">Chưa có banner — trang chủ đang dùng ảnh mặc định</div>
                  )}
                  {activeHero[0] && (
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-5 text-white">
                      <p className="text-lg font-semibold">{activeHero[0].title}</p>
                      {activeHero[0].subtitle && <p className="text-sm text-white/80">{activeHero[0].subtitle}</p>}
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                    Banner đầu trang · {activeHero.length} đang hiển thị
                  </span>
                </div>
              </button>

              <Locked label="Cam kết dịch vụ" />
              <Locked label="Danh mục nổi bật" />

              {/* Product sections */}
              {PRODUCT_SECTIONS.map(sec => {
                const items = bySection[sec.key] ?? [];
                const s: Selected = { type: "products", key: sec.key };
                return (
                  <button key={sec.key} type="button" onClick={() => setSelected(s)} className={`${blockClass(s)} bg-white p-4`}>
                    <EditTag />
                    <div className="mb-3 flex items-baseline gap-2">
                      <h3 className="text-base font-semibold">{sec.label}</h3>
                      <span className="text-xs text-slate-400">{sec.hint}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="rounded-md bg-slate-50 py-6 text-center text-sm text-slate-500">
                        Chưa chọn sản phẩm — trang chủ đang hiển thị danh sách tự động
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
                        {items.slice(0, 6).map(p => (
                          <div key={p.id}>
                            <div className="aspect-[3/4] overflow-hidden rounded bg-slate-100">
                              {p.product?.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.product.imageUrl} alt="" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs">{p.product?.name ?? `#${p.productId}`}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}

              <Locked label="Phối đồ gia đình" />
              <Locked label="Đăng ký nhận tin" />
            </div>
          )}
        </div>

        {/* Editor drawer */}
        {/* Below lg the drawer used to be display:none, so selecting a block did nothing.
            It now opens as a full-height panel over the preview. */}
        {selected && (
          <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setSelected(null)} aria-hidden="true" />
        )}
        {selected && (
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col overflow-hidden bg-white shadow-xl lg:sticky lg:inset-auto lg:top-4 lg:z-auto lg:h-[calc(100vh-2rem)] lg:w-[400px] lg:shrink-0 lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-none">
            {selected.type === "hero" ? (
              <HeroEditor banners={banners} onChange={load} onClose={() => setSelected(null)} />
            ) : (
              <ProductEditor
                section={PRODUCT_SECTIONS.find(x => x.key === selected.key)!}
                items={bySection[selected.key] ?? []}
                onChange={load}
                onClose={() => setSelected(null)}
              />
            )}
          </aside>
        )}
      </div>
    </main>
  );
}

// Declared at module level: components created inside render remount on every render.
function EditTag() {
  return (
    // Touch screens have no hover, so the tag is always visible below lg.
    <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-medium text-white lg:hidden lg:group-hover:flex">
      <Pencil className="h-3 w-3" /> Chỉnh sửa
    </span>
  );
}

function Locked({ label }: { label: string }) {
  return (
    <div className="flex h-14 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 text-xs text-slate-500">
      {label} · tự động, không chỉnh sửa
    </div>
  );
}

// ─── Shared drawer chrome ─────────────────────────────────────────────────────
function DrawerHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-slate-200 p-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Đóng" className="rounded p-1 text-slate-500 hover:bg-slate-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

const iconBtn = "rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30";

// ─── Hero banner editor ───────────────────────────────────────────────────────
function HeroEditor({ banners, onChange, onClose }: { banners: Banner[]; onChange: () => Promise<void>; onClose: () => void }) {
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<Response | void>, okMsg?: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res && !res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Thao tác thất bại");
      }
      if (okMsg) toast.success(okMsg);
      await onChange();
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Thao tác thất bại");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!editing?.title?.trim() || !editing.imageUrl?.trim()) {
      toast.error("Cần nhập tiêu đề và link ảnh");
      return;
    }
    const isNew = !editing.id;
    const body = { status: "ACTIVE", ...editing, position: HERO_POSITION, displayOrder: editing.displayOrder ?? banners.length + 1 };
    const ok = await run(
      () => fetch(api(isNew ? "banners" : `banners/${editing.id}`), { method: isNew ? "POST" : "PUT", headers: jsonHeaders(), body: JSON.stringify(body) }),
      isNew ? "Đã thêm banner" : "Đã lưu banner",
    );
    if (ok) setEditing(null);
  };

  const missingDefaults = DEFAULT_SLIDES.filter(d => !banners.some(b => b.imageUrl === d.imageUrl));

  const importDefaults = () =>
    run(async () => {
      let order = banners.length;
      for (const d of missingDefaults) {
        order += 1;
        const res = await fetch(api("banners"), {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ ...d, position: HERO_POSITION, status: "ACTIVE", displayOrder: order }),
        });
        if (!res.ok) return res;
      }
    }, "Đã nhập ảnh banner có sẵn");

  const toggle = (b: Banner) =>
    run(() => fetch(api(`banners/${b.id}/status`), { method: "PATCH", headers: jsonHeaders(), body: JSON.stringify({ status: isBannerOn(b) ? "INACTIVE" : "ACTIVE" }) }));

  const remove = (b: Banner) => {
    if (!confirm(`Xóa banner "${b.title}"?`)) return;
    void run(() => fetch(api(`banners/${b.id}`), { method: "DELETE", headers: authOnly() }), "Đã xóa banner");
  };

  const move = (i: number, dir: -1 | 1) => {
    const a = banners[i], b = banners[i + dir];
    if (!a || !b) return;
    void run(async () => {
      const put = (x: Banner, order: number) =>
        fetch(api(`banners/${x.id}`), { method: "PUT", headers: jsonHeaders(), body: JSON.stringify({ ...x, displayOrder: order }) });
      const [r1, r2] = await Promise.all([put(a, i + dir + 1), put(b, i + 1)]);
      return r1.ok ? r2 : r1;
    });
  };

  if (editing) {
    const set = (patch: Partial<Banner>) => setEditing(prev => ({ ...prev, ...patch }));
    const field = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-600";
    return (
      <>
        <DrawerHeader title={editing.id ? "Sửa banner" : "Thêm banner"} subtitle="Banner đầu trang chủ" onClose={() => setEditing(null)} />
        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          {editing.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={editing.imageUrl} alt="" className="aspect-[21/9] w-full rounded-md object-cover bg-slate-100" />
          )}
          <label className="block">Link ảnh *
            <input className={field} value={editing.imageUrl ?? ""} onChange={e => set({ imageUrl: e.target.value })} placeholder="https://… hoặc /images/…" />
          </label>
          <label className="block">Tiêu đề *
            <input className={field} value={editing.title ?? ""} onChange={e => set({ title: e.target.value })} />
          </label>
          <label className="block">Mô tả ngắn
            <input className={field} value={editing.subtitle ?? ""} onChange={e => set({ subtitle: e.target.value })} />
          </label>
          <label className="block">Link khi bấm vào
            <input className={field} value={editing.linkUrl ?? ""} onChange={e => set({ linkUrl: e.target.value })} placeholder="/products?status=sale" />
          </label>
        </div>
        <div className="flex gap-2 border-t border-slate-200 p-4">
          <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-md border border-slate-300 py-2 text-sm hover:bg-slate-50">Hủy</button>
          <button type="button" disabled={busy} onClick={save} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <DrawerHeader title="Banner đầu trang" subtitle="Ảnh chạy luân phiên theo thứ tự từ trên xuống" onClose={onClose} />
      <div className="flex-1 overflow-y-auto">
        {banners.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Chưa có banner. Thêm banner đầu tiên bên dưới.</p>}
        <ul className="divide-y divide-slate-100">
          {banners.map((b, i) => (
            <li key={b.id} className={`flex items-center gap-3 p-3 ${isBannerOn(b) ? "" : "opacity-50"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt="" className="h-12 w-20 shrink-0 rounded object-cover bg-slate-100" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.title}</p>
                <p className="truncate text-xs text-slate-500">{isBannerOn(b) ? "Đang hiển thị" : "Đã ẩn"}</p>
              </div>
              <div className="flex shrink-0">
                <button type="button" className={iconBtn} disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Lên"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" className={iconBtn} disabled={busy || i === banners.length - 1} onClick={() => move(i, 1)} aria-label="Xuống"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" className={iconBtn} disabled={busy} onClick={() => toggle(b)} aria-label="Ẩn/hiện">{isBannerOn(b) ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                <button type="button" className={iconBtn} onClick={() => setEditing(b)} aria-label="Sửa"><Pencil className="h-4 w-4" /></button>
                <button type="button" className={`${iconBtn} hover:text-red-600`} disabled={busy} onClick={() => remove(b)} aria-label="Xóa"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-2 border-t border-slate-200 p-4">
        {missingDefaults.length > 0 && (
          <button type="button" disabled={busy} onClick={importDefaults} className="w-full rounded-md border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">
            Nhập {missingDefaults.length} ảnh banner có sẵn của website
          </button>
        )}
        <button type="button" onClick={() => setEditing({ status: "ACTIVE" })} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700">
          <Plus className="h-4 w-4" /> Thêm banner
        </button>
      </div>
    </>
  );
}

// ─── Product section editor ───────────────────────────────────────────────────
function ProductEditor({
  section, items, onChange, onClose,
}: {
  section: { key: string; label: string; hint: string };
  items: Placement[];
  onChange: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Map<number, ProductHit>>(new Map());
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery("");
    setHits([]);
    setPicked(new Map());
    setOpen(false);
  }, [section.key]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query.trim();
        const res = await fetch(`${getApiBaseUrl()}/api/products?${q ? `search=${encodeURIComponent(q)}&` : ""}size=30`);
        if (res.ok) {
          const d = await res.json();
          setHits(Array.isArray(d) ? d : d?.data?.items ?? d?.content ?? d?.data ?? []);
        }
      } catch { setHits([]); } finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const run = async (fn: () => Promise<Response | void>, okMsg?: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res && !res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Thao tác thất bại");
      }
      if (okMsg) toast.success(okMsg);
      await onChange();
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Thao tác thất bại");
      await onChange();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const existing = useMemo(() => new Set(items.map(i => i.productId)), [items]);

  const togglePick = (h: ProductHit) =>
    setPicked(prev => {
      const next = new Map(prev);
      if (next.has(h.id)) next.delete(h.id); else next.set(h.id, h);
      return next;
    });

  const addPicked = async () => {
    const list = [...picked.values()];
    const ok = await run(async () => {
      let order = items.length;
      for (const p of list) {
        order += 1;
        const res = await fetch(api("placements"), {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ productId: p.id, section: section.key, displayOrder: order }),
        });
        if (!res.ok) return res;
      }
    }, `Đã thêm ${list.length} sản phẩm`);
    if (ok) {
      setPicked(new Map());
      setOpen(false);
      setQuery("");
    }
  };

  const remove = (p: Placement) =>
    run(() => fetch(api(`placements/${p.id}`), { method: "DELETE", headers: authOnly() }), "Đã bỏ sản phẩm");

  const move = (i: number, dir: -1 | 1) => {
    const ids = items.map(x => x.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    void run(() => fetch(api("placements/reorder"), { method: "PUT", headers: jsonHeaders(), body: JSON.stringify({ section: section.key, orderedIds: ids }) }));
  };

  return (
    <>
      <DrawerHeader title={section.label} subtitle={items.length ? `${items.length} sản phẩm được chọn` : "Đang hiển thị danh sách tự động"} onClose={onClose} />
      <div className="border-b border-slate-200 p-4" ref={boxRef}>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Chọn hoặc tìm sản phẩm theo tên…"
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-9 text-sm outline-none focus:border-red-600"
          />
          <button type="button" onClick={() => setOpen(o => !o)} aria-label="Mở danh sách" className="absolute right-2 top-2 rounded p-0.5 text-slate-400 hover:text-slate-700">
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {searching && <li className="p-3 text-center text-xs text-slate-400">Đang tìm…</li>}
              {!searching && hits.length === 0 && <li className="p-3 text-center text-xs text-slate-400">Không tìm thấy sản phẩm</li>}
              {hits.map(h => {
                const already = existing.has(h.id);
                const checked = already || picked.has(h.id);
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => togglePick(h)}
                      className="flex w-full items-center gap-3 p-2 text-left hover:bg-red-50/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-red-600 bg-red-600 text-white" : "border-slate-300"}`}>
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.images?.[0]?.imageUrl} alt="" className="h-10 w-8 shrink-0 rounded bg-slate-100 object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{h.name}</span>
                        <span className="block text-xs text-slate-500">{already ? "Đã có trong khối này" : fmt(h.price)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {picked.size > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={addPicked}
            className="mt-3 w-full rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Đang thêm…" : `Thêm ${picked.size} sản phẩm đã chọn`}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Chưa chọn sản phẩm nào. Khi để trống, trang chủ tự lấy {section.hint.toLowerCase()}.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <span className="w-5 text-center text-xs text-slate-400">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.product?.imageUrl} alt="" className="h-12 w-9 shrink-0 rounded bg-slate-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{p.product?.name ?? `Sản phẩm #${p.productId}`}</p>
                  <p className="text-xs text-slate-500">{fmt(p.product?.salePrice ?? p.product?.price)}</p>
                </div>
                <div className="flex shrink-0">
                  <button type="button" className={iconBtn} disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Lên"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" className={iconBtn} disabled={busy || i === items.length - 1} onClick={() => move(i, 1)} aria-label="Xuống"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" className={`${iconBtn} hover:text-red-600`} disabled={busy} onClick={() => remove(p)} aria-label="Bỏ"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
