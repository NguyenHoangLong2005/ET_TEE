"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { staffList } from "@/lib/staff-api";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";
import { toast } from "sonner";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import {
  AlertTriangle, TrendingDown, RefreshCw,
  Send, X, CheckCircle2, Filter, Search, Info
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type InventoryItem = {
  id: number;
  productId: number;
  productName: string;
  sku?: string;
  warehouseLocation: string;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
};

type Priority = "CRITICAL" | "LOW" | "NORMAL";
type EnrichedItem = InventoryItem & { priority: Priority; available: number; shortage: number };

// ─── Nav ─────────────────────────────────────────────────────────────────────
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

// ─── Helper ───────────────────────────────────────────────────────────────────
function getPriority(item: InventoryItem): Priority {
  const available = (item.quantityOnHand ?? 0) - (item.quantityReserved ?? 0);
  if (available <= 0) return "CRITICAL";
  if (available < (item.reorderLevel ?? 10) * 0.5) return "CRITICAL";
  if (available <= (item.reorderLevel ?? 10)) return "LOW";
  return "NORMAL";
}

const PRIORITY_CONFIG: Record<Priority, { label: string; row: string; badge: string; icon: string }> = {
  CRITICAL: { label: "🔴 Nguy cấp", row: "bg-rose-50/50 border-l-4 border-l-rose-500", badge: "bg-rose-100 text-rose-800 border-rose-200", icon: "🔴" },
  LOW:      { label: "🟡 Cần chú ý", row: "bg-amber-50/50 border-l-4 border-l-amber-500", badge: "bg-amber-100 text-amber-800 border-amber-200", icon: "🟡" },
  NORMAL:   { label: "🟢 Bình thường", row: "", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "🟢" },
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ReplenishmentPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | Priority>("ALL");

  // Propose modal
  const [proposeItem, setProposeItem] = useState<EnrichedItem | null>(null);
  const [proposeQty, setProposeQty] = useState("50");
  const [proposeNote, setProposeNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseUrl = getApiBaseUrl();
  const authHeaders = getAuthHeaders() as Record<string, string>;

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await staffList<InventoryItem>("/api/staff/warehouse/replenishment", signal);
      setItems(data);
    } catch {
      if (!signal?.aborted) {
        setItems([]);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeItem) return;
    const qty = parseInt(proposeQty, 10);
    if (isNaN(qty) || qty <= 0) { toast.error("Số lượng đề xuất phải lớn hơn 0"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/warehouse/replenishment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          inventoryId: proposeItem.id,
          productId: proposeItem.productId,
          productName: proposeItem.productName,
          quantity: qty,
          note: proposeNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message ?? "Gửi đề xuất thất bại");
      }
      toast.success(`📦 Đã gửi đề xuất nhập ${qty} × "${proposeItem.productName}" đến quản lý`);
    } catch (err: any) {
      toast.error(err?.message ?? "Không thể gửi đề xuất nhập hàng");
    } finally {
      setIsSubmitting(false);
      setProposeItem(null);
      setProposeQty("50");
      setProposeNote("");
    }
  };

  // Enrich with priority
  const enriched = items.map(i => {
    const onHand = i.quantityOnHand ?? 0;
    const reserved = i.quantityReserved ?? 0;
    const reorder = i.reorderLevel ?? 10;
    const available = onHand - reserved;
    return {
      ...i,
      priority: getPriority(i),
      available,
      shortage: Math.max(0, reorder - available),
    };
  });

  // Filter
  const filtered = enriched.filter(i => {
    const matchSearch = !searchQuery.trim() ||
      (i.productName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.sku ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.warehouseLocation || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchPriority = priorityFilter === "ALL" || i.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  // Sorted: CRITICAL first
  const sorted = [...filtered].sort((a, b) => {
    const rank = { CRITICAL: 0, LOW: 1, NORMAL: 2 };
    return rank[a.priority] - rank[b.priority];
  });

  // Stats
  const criticalCount = enriched.filter(i => i.priority === "CRITICAL").length;
  const lowCount = enriched.filter(i => i.priority === "LOW").length;
  const totalShortage = enriched.reduce((s, i) => s + i.shortage, 0);

  const columns: Column<EnrichedItem>[] = [
    {
      key: "priority",
      header: "Ưu tiên",
      render: (item) => {
        const cfg = PRIORITY_CONFIG[item.priority];
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.badge}`}>
            {cfg.icon} {item.priority === "CRITICAL" ? "Nguy cấp" : item.priority === "LOW" ? "Thấp" : "OK"}
          </span>
        );
      },
    },
    {
      key: "product",
      header: "Sản phẩm / SKU",
      render: (item) => (
        <div>
          <p className="font-semibold text-slate-900">{item.productName}</p>
          {item.sku && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.sku} · SP#{item.productId}</p>}
        </div>
      ),
    },
    {
      key: "location",
      header: "Vị trí",
      render: (item) => (
        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono">{item.warehouseLocation || "—"}</span>
      ),
    },
    {
      key: "quantityOnHand",
      header: "Tồn thực tế",
      render: (item) => <span className="font-mono font-bold text-slate-900">{item.quantityOnHand}</span>,
    },
    {
      key: "quantityReserved",
      header: "Đã giữ",
      render: (item) => <span className="font-mono text-amber-700">{item.quantityReserved}</span>,
    },
    {
      key: "available",
      header: "Khả dụng",
      render: (item) => (
        <span className={`font-mono font-bold ${item.available <= 0 ? "text-rose-600" : item.available < item.reorderLevel ? "text-amber-600" : "text-emerald-600"}`}>
          {item.available}
        </span>
      ),
    },
    {
      key: "reorderLevel",
      header: "Ngưỡng",
      render: (item) => <span className="font-mono text-slate-400">{item.reorderLevel}</span>,
    },
    {
      key: "shortage",
      header: "Còn thiếu",
      render: (item) => (
        <span className={`font-mono font-black ${item.shortage > 0 ? "text-rose-600" : "text-emerald-600"}`}>
          {item.shortage > 0 ? `−${item.shortage}` : "✓"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        item.priority !== "NORMAL" ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setProposeItem(item);
              setProposeQty(String(Math.max(item.shortage, item.reorderLevel)));
            }}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Đề xuất nhập
          </Button>
        ) : (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Đủ hàng
          </span>
        )
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8 space-y-6 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/staff/dashboard/warehouse" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:underline">
          ← Bộ phận kho
        </Link>

        <WarehouseNav active="/staff/dashboard/warehouse/replenishment" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-7 h-7 text-amber-600" />
              Đề Xuất Nhập Thêm Hàng
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Danh sách sản phẩm có tồn kho khả dụng thấp hơn ngưỡng nhập lại. Gửi đề xuất cho quản lý phê duyệt.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "🔴 Nguy cấp (hết hàng)", value: criticalCount, bg: "bg-rose-50 border-rose-100", val: "text-rose-700" },
            { label: "🟡 Cần chú ý", value: lowCount, bg: "bg-amber-50 border-amber-100", val: "text-amber-700" },
            { label: "📦 Tổng SP cần nhập", value: enriched.filter(i => i.priority !== "NORMAL").length, bg: "bg-slate-50 border-slate-200", val: "text-slate-900" },
            { label: "🔢 Tổng SL còn thiếu", value: totalShortage.toLocaleString(), bg: "bg-orange-50 border-orange-100", val: "text-orange-700" },
          ].map(({ label, value, bg, val }) => (
            <div key={label} className={`rounded-2xl border p-4 ${bg} bg-white shadow-sm`}>
              <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
              <p className={`text-2xl font-black ${val}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Alert banner if critical */}
        {criticalCount > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-800 text-xs">⚠️ {criticalCount} sản phẩm đang HẾT HÀNG hoặc sắp hết!</p>
              <p className="text-[11px] text-rose-600 mt-0.5">Cần đề xuất nhập ngay để tránh ảnh hưởng đến đơn hàng đang chờ.</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm sản phẩm, SKU, vị trí..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            {(["ALL", "CRITICAL", "LOW", "NORMAL"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  priorityFilter === p
                    ? "bg-amber-600 border-amber-600 text-white shadow"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p === "ALL" ? "Tất cả" : PRIORITY_CONFIG[p].label}
              </button>
            ))}
          </div>
        </div>

        <DataTable<EnrichedItem>
          columns={columns}
          data={sorted}
          rowKey={(item) => item.id}
          loading={loading}
          emptyTitle="Không có sản phẩm nào cần nhập thêm"
          emptyMessage="Tất cả tồn kho đang ở mức an toàn."
        />

        {/* Legend */}
        {!loading && (
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span>🔴 Nguy cấp: khả dụng ≤ 0 hoặc &lt; 50% ngưỡng</span>
            <span>🟡 Cần chú ý: khả dụng ≤ ngưỡng nhập lại</span>
            <span>🟢 Bình thường: khả dụng &gt; ngưỡng</span>
          </div>
        )}
      </div>

      {/* Propose Modal */}
      {proposeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-amber-700 flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-600" />
                Đề Xuất Nhập Thêm Hàng
              </h3>
              <button onClick={() => setProposeItem(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePropose} className="p-5 space-y-4">
              {/* Product info */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
                <p className="font-bold text-slate-900">{proposeItem.productName}</p>
                <p className="text-[11px] text-slate-500 font-mono">{proposeItem.sku} · {proposeItem.warehouseLocation}</p>
                <div className="flex gap-4 pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-500">Khả dụng: <span className={`font-bold ${proposeItem.available <= 0 ? "text-rose-600" : "text-amber-600"}`}>{proposeItem.available}</span></span>
                  <span className="text-slate-500">Ngưỡng: <span className="font-bold text-slate-700">{proposeItem.reorderLevel}</span></span>
                  <span className="text-slate-500">Còn thiếu: <span className="font-bold text-rose-600">{proposeItem.shortage}</span></span>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Số lượng đề xuất nhập *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={proposeQty}
                  onChange={e => setProposeQty(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Đề xuất: nhập tối thiểu {proposeItem.reorderLevel} để đạt ngưỡng an toàn</p>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Ghi chú cho quản lý</label>
                <textarea
                  rows={3}
                  value={proposeNote}
                  onChange={e => setProposeNote(e.target.value)}
                  placeholder="Lý do đề xuất, mức độ khẩn cấp, v.v..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProposeItem(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold text-xs text-white disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? "Đang gửi..." : "Gửi đề xuất"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}


