"use client";

import Link from "next/link";
<<<<<<< HEAD
import { useEffect, useState, type FormEvent } from "react";
import { errorMessage, staffList, staffAction } from "@/lib/staff-api";

type Inventory = {
  id: string;
  variantId: string;
  locationId: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
};

export default function WarehouseReceivingPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ productId: "", productName: "", quantity: "", location: "MAIN" });

  const loadInventory = async () => {
    try {
      const data = await staffList<Inventory>("/api/staff/warehouse/inventory");
      setItems(data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
=======
import { useCallback, useEffect, useState } from "react";
import {
  Package, Plus, RefreshCw, ArrowDownToLine, CheckCircle2,
  Clock, Truck, FileText, Search, MapPin, Hash
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";
import { DataTable, Column } from "@/components/ui/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────
type InventoryItem = {
  id: number;
  productId?: number;
  productName?: string;
  sku?: string;
  quantityOnHand?: number;
  quantity?: number;
  warehouseLocation?: string;
  location?: string;
};

type InboundRecord = {
  id: number;
  productName?: string;
  sku?: string;
  quantity: number;
  location?: string;
  supplier?: string;
  note?: string;
  status: "PENDING" | "RECEIVED" | "CONFIRMED";
  createdAt?: string;
  receivedAt?: string;
};

// ─── Nav component ─────────────────────────────────────────────────────────
function WarehouseNav({ active }: { active: string }) {
  const links = [
    { href: "/staff/dashboard/warehouse", label: "Tổng quan" },
    { href: "/staff/dashboard/warehouse/orders", label: "Đơn cần xử lý" },
    { href: "/staff/dashboard/warehouse/receiving", label: "Nhập kho" },
    { href: "/staff/dashboard/warehouse/inventory", label: "Tồn kho" },
    { href: "/staff/dashboard/warehouse/adjustments", label: "Duyệt chênh lệch" },
    { href: "/staff/dashboard/warehouse/reservations", label: "Giữ hàng" },
    { href: "/staff/dashboard/warehouse/stock-count", label: "Kiểm kê" },
    { href: "/staff/dashboard/warehouse/picking", label: "Lấy hàng" },
    { href: "/staff/dashboard/warehouse/packing", label: "Đóng gói" },
    { href: "/staff/dashboard/warehouse/shipments", label: "Bàn giao" },
    { href: "/staff/dashboard/warehouse/replenishment", label: "Đề xuất nhập thêm" },
  ];
  return (
    <nav className="flex flex-wrap gap-2 text-xs font-semibold">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg border px-3 py-2 transition ${
            l.href === active
              ? "border-amber-300 bg-amber-50 text-amber-800 font-bold"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: InboundRecord["status"] }) {
  const map: Record<InboundRecord["status"], { label: string; cls: string }> = {
    PENDING:   { label: "Chờ nhận",    cls: "bg-amber-100 text-amber-800 border-amber-200" },
    RECEIVED:  { label: "Đã nhận",     cls: "bg-sky-100 text-sky-800 border-sky-200" },
    CONFIRMED: { label: "Đã xác nhận", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
>>>>>>> main
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {label}
    </span>
  );
}

<<<<<<< HEAD
  useEffect(() => { void loadInventory(); }, []);

  const submitInbound = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await staffAction("/api/staff/warehouse/inbound", "POST", {
        variantId: form.productId,
        quantity: Number(form.quantity),
        location: form.location,
      });
      setForm({ productId: "", productName: "", quantity: "", location: "MAIN" });
      await loadInventory();
    } catch (cause) {
      alert(errorMessage(cause));
    }
  };

  return (
    <main className="min-h-screen bg-[#15100f] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/staff/dashboard/warehouse" className="text-xs text-orange-300">← Về dữ liệu kho</Link>

        <nav className="flex flex-wrap gap-2 text-sm mt-3">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        <h1 className="text-3xl font-black text-white">Nhập kho</h1>

        {error && <p className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        {notice && <p role="status" className="rounded border border-emerald-700 bg-emerald-950/40 p-3 text-sm text-emerald-200">{notice}</p>}
        {loading && <p className="text-sm text-slate-400">Đang tải tồn kho...</p>}

        <form onSubmit={submitInbound} className="grid gap-3 rounded-xl border-slate-800 bg-slate-900 p-5 md:grid-cols-5">
          <input required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} placeholder="Mã sản phẩm" className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Tên sản phẩm" className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input required type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Số lượng" className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Vị trí (vd: MAIN)" className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Nhập kho</button>
        </form>

        <div className="overflow-x-auto rounded-xl border-slate-800 bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/60 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="p-3">Sản phẩm</th>
                <th className="p-3">Vị trí</th>
                <th className="p-3 text-right">Tồn kho</th>
                <th className="p-3 text-right">Khả dụng</th>
                <th className="p-3">Đối chiếu</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="p-3 text-white">{item.variantId ?? "-"}</td>
                  <td className="p-3">{item.locationId ?? "-"}</td>
                  <td className="p-3 text-right">{item.quantityOnHand}</td>
                  <td className="p-3 text-right font-semibold">{item.quantityOnHand - item.quantityReserved}</td>
                  <td className="p-3"><button type="button" className="rounded bg-sky-700 px-3 py-1 text-xs" onClick={async () => {
                    const input = window.prompt(`Kiểm đếm thực tế: ${item.variantId}`);
                    if (input === null) return;
                    const actualQuantity = Number(input);
                    if (!Number.isSafeInteger(actualQuantity) || actualQuantity < 0) { setError("Số lượng kiểm đếm phải là số nguyên không âm."); return; }
                    try {
                      await staffAction(`/api/staff/warehouse/inbound/${item.id}/count`, "POST", { actualQuantity });
                      setError(""); setNotice(`Kiểm đếm ${item.variantId}: thực tế ${actualQuantity}, chênh lệch thành công.`);
                    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể kiểm đếm."); }
                  }}>Kiểm đếm</button></td>
                </tr>
              ))}
              {items.length === 0 && !loading && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Chưa có dữ liệu tồn kho.</td></tr>}
            </tbody>
          </table>
=======
// ─── Main Component ─────────────────────────────────────────────────────────
export default function WarehouseReceivingPage() {
  const [tab, setTab] = useState<"new" | "history">("new");
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<InboundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Form state
  const [formProduct, setFormProduct] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formQty, setFormQty] = useState("10");
  const [formLocation, setFormLocation] = useState("KHO-A1");
  const [formSupplier, setFormSupplier] = useState("");
  const [formNote, setFormNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const baseUrl = getApiBaseUrl();
  const authHeaders = getAuthHeaders() as Record<string, string>;

  // Load products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/warehouse/inventory`, { headers: authHeaders, cache: "no-store" });
      if (!res.ok) throw new Error("api_err");
      const data = await res.json();
      const arr: InventoryItem[] = Array.isArray(data) ? data : data?.data ?? data?.content ?? [];
      setProducts(arr);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/warehouse/inbound`, { headers: authHeaders, cache: "no-store" });
      if (!res.ok) throw new Error("api_err");
      const data = await res.json();
      const arr: InboundRecord[] = Array.isArray(data) ? data : data?.data ?? data?.content ?? [];
      setHistory(arr);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => { if (tab === "history") void loadHistory(); }, [tab, loadHistory]);

  const handleSelectProduct = (item: InventoryItem) => {
    setFormProduct(item.productName || `Sản phẩm #${item.productId || item.id}`);
    setFormSku(item.sku || "");
    setFormLocation(item.warehouseLocation || item.location || "KHO-A1");
    setShowProductPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduct.trim()) { toast.error("Vui lòng chọn sản phẩm"); return; }
    const qty = parseInt(formQty, 10);
    if (isNaN(qty) || qty <= 0) { toast.error("Số lượng phải là số nguyên lớn hơn 0"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/warehouse/inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          productName: formProduct.trim(),
          sku: formSku.trim() || undefined,
          quantity: qty,
          location: formLocation.trim() || "KHO-A1",
          supplier: formSupplier.trim() || undefined,
          note: formNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? "Tạo phiếu nhập thất bại");
      }
      toast.success(`✅ Đã tạo phiếu nhập ${qty} × "${formProduct}" thành công`);
      setFormProduct(""); setFormSku(""); setFormQty("10");
      setFormLocation("KHO-A1"); setFormSupplier(""); setFormNote("");
      setTab("history");
    } catch (err: any) {
      toast.error(err?.message ?? "Không thể tạo phiếu nhập kho");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered history
  const filteredHistory = history.filter(r => {
    const matchSearch = !searchQuery.trim() ||
      (r.productName ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.sku ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.supplier ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const todayStr = new Date().toDateString();
  const todayCount = history.filter(r => new Date(r.createdAt || "").toDateString() === todayStr).length;
  const pendingCount = history.filter(r => r.status === "PENDING").length;
  const totalQty = history.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const historyColumns: Column<InboundRecord>[] = [
    {
      key: "id",
      header: "Phiếu #",
      render: (r) => <span className="font-mono font-bold text-slate-700">#{r.id}</span>,
    },
    {
      key: "product",
      header: "Sản phẩm / SKU",
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.productName ?? "—"}</p>
          {r.sku && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{r.sku}</p>}
          {r.note && <p className="text-[10px] text-slate-400 mt-0.5 italic">{r.note}</p>}
        </div>
      ),
    },
    {
      key: "quantity",
      header: "SL nhập",
      render: (r) => <span className="font-mono font-bold text-amber-700">{r.quantity}</span>,
    },
    {
      key: "location",
      header: "Vị trí",
      render: (r) => (
        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono">{r.location ?? "—"}</span>
      ),
    },
    {
      key: "supplier",
      header: "Nhà cung cấp",
      render: (r) => <span className="text-slate-500 text-xs">{r.supplier ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (r) => (
        <span className="text-slate-400 font-mono text-[11px]">
          {r.createdAt
            ? new Date(r.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8 space-y-6 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/staff/dashboard/warehouse" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:underline">
          ← Bộ phận kho
        </Link>

        <WarehouseNav active="/staff/dashboard/warehouse/receiving" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <ArrowDownToLine className="w-7 h-7 text-amber-600" />
                <span>Nhập Kho</span>
              </h1>
              <span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                KHO HÀNG
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Tạo phiếu nhập hàng và theo dõi lịch sử nhận hàng về kho</p>
          </div>

          <button
            onClick={() => { void loadProducts(); if (tab === "history") void loadHistory(); }}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
>>>>>>> main
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Phiếu hôm nay", value: todayCount, icon: FileText, color: "text-sky-700", bg: "bg-sky-50 border-sky-100" },
            { label: "Đang chờ nhận", value: pendingCount, icon: Clock, color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
            { label: "Tổng phiếu", value: history.length, icon: Package, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
            { label: "Tổng SL nhập", value: totalQty.toLocaleString(), icon: Truck, color: "text-purple-700", bg: "bg-purple-50 border-purple-100" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-2xl border p-4 ${bg} bg-white shadow-sm`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-slate-500 font-medium">{label}</span>
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-white border border-slate-200 p-1 w-fit shadow-sm">
          {(["new", "history"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                tab === t
                  ? "bg-amber-600 text-white shadow"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {t === "new" ? "➕ Tạo phiếu mới" : "📋 Lịch sử nhập"}
            </button>
          ))}
        </div>

        {/* ── Tab: New ─────────────────────────────────────────────── */}
        {tab === "new" && (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
              <ArrowDownToLine className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">Phiếu Nhập Hàng Mới</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Product picker */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Sản phẩm *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formProduct}
                    onChange={e => { setFormProduct(e.target.value); setShowProductPicker(true); }}
                    onFocus={() => setShowProductPicker(true)}
                    placeholder="Tìm hoặc nhập tên sản phẩm..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-10"
                  />
                  <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
                  {showProductPicker && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                      {products
                        .filter(p => !formProduct || (p.productName ?? "").toLowerCase().includes(formProduct.toLowerCase()))
                        .slice(0, 8)
                        .map(p => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-center justify-between gap-2"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{p.productName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{p.sku} · {p.warehouseLocation || p.location}</p>
                            </div>
                            <span className="text-xs text-emerald-700 font-mono font-bold shrink-0">{p.quantityOnHand ?? p.quantity ?? 0} đang có</span>
                          </button>
                        ))}
                      {!loading && (products.filter(p => !formProduct || (p.productName ?? "").toLowerCase().includes(formProduct.toLowerCase())).length === 0) && (
                        <p className="px-4 py-3 text-xs text-slate-400">Không tìm thấy - nhập tay tên sản phẩm</p>
                      )}
                    </div>
                  )}
                </div>
                {showProductPicker && <div className="fixed inset-0 z-10" onClick={() => setShowProductPicker(false)} />}
              </div>

              {/* SKU */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" /> SKU / Mã hàng</span>
                </label>
                <input
                  type="text"
                  value={formSku}
                  onChange={e => setFormSku(e.target.value)}
                  placeholder="Ví dụ: AT-BW-M-001"
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Số lượng nhập *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formQty}
                  onChange={e => setFormQty(e.target.value)}
                  placeholder="Ví dụ: 50"
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> Vị trí kho *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: KHO-A1, SEC-B2"
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nhà cung cấp</label>
                <input
                  type="text"
                  value={formSupplier}
                  onChange={e => setFormSupplier(e.target.value)}
                  placeholder="Tên nhà cung cấp..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Note */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Ghi chú</label>
                <textarea
                  rows={2}
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Ghi chú về tình trạng hàng, thiếu hụt, v.v..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow transition disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isSubmitting ? "Đang tạo phiếu..." : "Tạo Phiếu Nhập Kho"}
              </button>
            </div>
          </form>
        )}

        {/* ── Tab: History ─────────────────────────────────────────── */}
        {tab === "history" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm sản phẩm, SKU, NCC..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ nhận</option>
                <option value="RECEIVED">Đã nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
              </select>
            </div>

            <DataTable<InboundRecord>
              columns={historyColumns}
              data={filteredHistory}
              rowKey={(r) => r.id}
              loading={historyLoading}
              emptyTitle="Không tìm thấy phiếu nhập kho nào"
              emptyMessage="Chưa có phiếu nhập hoặc dữ liệu không phù hợp bộ lọc."
            />
          </div>
        )}
      </div>
    </main>
  );
}
