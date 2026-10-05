"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, PackagePlus, RefreshCw, Send, X, CheckCircle2 } from "lucide-react";
import { staffAction, staffList, errorMessage } from "@/lib/staff-api";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

type InventoryItem = {
  id: number;
  productId: number;
  productName: string;
  warehouseLocation: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
};

type RestockRequest = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  status: string;
  createdAt?: string;
  reviewNote?: string | null;
};

// Backend chỉ trả các mặt hàng có khả dụng <= ngưỡng nhập lại, nên chỉ có 2 mức.
type Priority = "CRITICAL" | "LOW";
type Row = InventoryItem & { priority: Priority; available: number; suggested: number };

const PRIORITY: Record<Priority, { label: string; hint: string; badge: string }> = {
  CRITICAL: { label: "Nguy cấp", hint: "Hết hàng hoặc dưới 50% ngưỡng", badge: "bg-rose-100 text-rose-800 border-rose-200" },
  LOW: { label: "Cần chú ý", hint: "Đã chạm ngưỡng nhập lại", badge: "bg-amber-100 text-amber-800 border-amber-200" },
};

const REQUEST_LABEL: Record<string, string> = { PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối" };

/** Gợi ý nhập để tồn khả dụng đạt gấp đôi ngưỡng (đưa về đúng ngưỡng thì hàng vẫn "sắp hết"). */
const suggestQty = (available: number, reorder: number) => Math.max(1, reorder * 2 - Math.max(0, available));

export default function ReplenishmentPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | Priority>("ALL");

  const [proposeItem, setProposeItem] = useState<Row | null>(null);
  const [proposeQty, setProposeQty] = useState("");
  const [proposeNote, setProposeNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    setError("");
    const [itemsRes, reqRes] = await Promise.allSettled([
      staffList<InventoryItem>("/api/staff/warehouse/replenishment"),
      staffList<RestockRequest>("/api/staff/warehouse/replenishment/requests"),
    ]);
    if (itemsRes.status === "fulfilled") {
      setItems(itemsRes.value);
    } else {
      setItems([]);
      setError(errorMessage(itemsRes.reason));
    }
    setRequests(reqRes.status === "fulfilled" ? reqRes.value : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: Row[] = useMemo(
    () =>
      items
        .map((i) => {
          const available = (i.quantityOnHand ?? 0) - (i.quantityReserved ?? 0);
          const reorder = i.reorderLevel ?? 10;
          const priority: Priority = available <= 0 || available < reorder * 0.5 ? "CRITICAL" : "LOW";
          return { ...i, available, priority, suggested: suggestQty(available, reorder) };
        })
        .sort((a, b) => (a.priority === b.priority ? a.available - b.available : a.priority === "CRITICAL" ? -1 : 1)),
    [items],
  );

  const pendingByProduct = useMemo(
    () => new Map(requests.filter((r) => r.status === "PENDING").map((r) => [r.productId, r.quantity] as const)),
    [requests],
  );

  const criticalCount = rows.filter((r) => r.priority === "CRITICAL").length;
  const visible = filter === "ALL" ? rows : rows.filter((r) => r.priority === filter);

  const openPropose = (row: Row) => {
    setProposeItem(row);
    setProposeQty(String(row.suggested));
    setProposeNote("");
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeItem) return;
    const qty = Number(proposeQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Số lượng đề xuất phải là số nguyên lớn hơn 0");
      return;
    }
    setIsSubmitting(true);
    try {
      await staffAction("/api/staff/warehouse/replenishment", "POST", {
        inventoryId: proposeItem.id,
        quantity: qty,
        note: proposeNote.trim() || undefined,
      });
      toast.success(`Đã gửi đề xuất nhập ${qty} × "${proposeItem.productName}" đến quản lý`);
      setProposeItem(null);
      await load(true);
    } catch (err) {
      toast.error(errorMessage(err)); // giữ modal mở để sửa và gửi lại
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Row>[] = [
    {
      key: "priority",
      header: "Mức độ",
      render: (r) => (
        <span title={PRIORITY[r.priority].hint} className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${PRIORITY[r.priority].badge}`}>
          {PRIORITY[r.priority].label}
        </span>
      ),
    },
    {
      key: "product",
      header: "Sản phẩm",
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.productName}</p>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">SP #{r.productId} · {r.warehouseLocation || "chưa gán vị trí"}</p>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Tồn kho",
      render: (r) => (
        <div className="text-xs font-mono leading-relaxed">
          <div>
            Khả dụng: <span className={`font-bold ${r.available <= 0 ? "text-rose-600" : "text-amber-600"}`}>{Math.max(0, r.available)}</span>
            <span className="text-slate-400"> / ngưỡng {r.reorderLevel}</span>
          </div>
          <div className="text-slate-400">Thực tế {r.quantityOnHand} · đang giữ {r.quantityReserved}</div>
        </div>
      ),
    },
    {
      key: "suggested",
      header: "Gợi ý nhập",
      render: (r) => <span className="font-mono font-black text-slate-900">+{r.suggested}</span>,
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/staff/dashboard/warehouse/receiving?productId=${r.productId}&qty=${r.suggested}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <PackagePlus className="w-3.5 h-3.5" /> Nhập kho
          </Link>
          {pendingByProduct.has(r.productId) ? (
            <span className="text-xs font-semibold text-sky-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã đề xuất {pendingByProduct.get(r.productId)}
            </span>
          ) : (
            <Button variant="primary" size="sm" onClick={() => openPropose(r)} icon={<Send className="w-3.5 h-3.5" />}>
              Đề xuất
            </Button>
          )}
        </div>
      ),
    },
  ];

  const requestColumns: Column<RestockRequest>[] = [
    { key: "product", header: "Sản phẩm", render: (r) => <span className="font-semibold text-slate-800">{r.productName}</span> },
    { key: "qty", header: "SL đề xuất", render: (r) => <span className="font-mono font-bold">+{r.quantity}</span> },
    {
      key: "status",
      header: "Trạng thái",
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={r.status} label={REQUEST_LABEL[r.status] ?? r.status} />
          {/* Store owner's note from the approvals queue (e.g. reason for rejection). */}
          {r.status !== "PENDING" && r.reviewNote && (
            <span className="max-w-[220px] truncate text-[11px] text-slate-500" title={r.reviewNote}>{r.reviewNote}</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Gửi lúc",
      render: (r) => <span className="text-xs text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"}</span>,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Đề Xuất Nhập Thêm"
          subtitle="Các mặt hàng khả dụng đã chạm ngưỡng nhập lại. Nhập kho ngay nếu hàng đã về, hoặc gửi đề xuất cho quản lý."
          badge={<span className="bg-primary-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
          actions={
            <Button variant="outline" size="sm" onClick={() => void load()} icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}>
              Làm mới
            </Button>
          }
        />

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{error}</p>}

        {criticalCount > 0 && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-rose-800">
              {criticalCount} mặt hàng đã hết hoặc gần hết. Nên xử lý trước để không ảnh hưởng đơn đang chờ.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {([["ALL", "Tất cả", rows.length], ["CRITICAL", "Nguy cấp", criticalCount], ["LOW", "Cần chú ý", rows.length - criticalCount]] as const).map(
            ([key, label, count]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  filter === key ? "bg-primary-600 border-primary-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label} ({count})
              </button>
            ),
          )}
        </div>

        <DataTable<Row>
          columns={columns}
          data={visible}
          rowKey={(r) => r.id}
          loading={loading}
          emptyTitle="Không có mặt hàng nào cần nhập thêm"
          emptyMessage="Tất cả tồn kho đang ở mức an toàn."
        />

        {requests.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Đề xuất đã gửi</h2>
            <DataTable<RestockRequest> columns={requestColumns} data={requests.slice(0, 10)} rowKey={(r) => r.id} loading={false} />
          </section>
        )}
      </div>

      {proposeItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Đề xuất nhập thêm hàng"
          onKeyDown={(e) => e.key === "Escape" && setProposeItem(null)}
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-sm text-primary-700 flex items-center gap-2">
                <Send className="w-4 h-4" /> Đề xuất nhập thêm hàng
              </h3>
              <button onClick={() => setProposeItem(null)} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePropose} className="p-5 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                <p className="font-bold text-slate-900">{proposeItem.productName}</p>
                <p className="text-slate-500">
                  Khả dụng <b className="text-rose-600">{Math.max(0, proposeItem.available)}</b> · ngưỡng <b>{proposeItem.reorderLevel}</b>
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Số lượng đề xuất *</label>
                <input
                  type="number"
                  required
                  min={1}
                  step={1}
                  autoFocus
                  value={proposeQty}
                  onChange={(e) => setProposeQty(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Gợi ý +{proposeItem.suggested} để tồn khả dụng đạt {proposeItem.reorderLevel * 2} (gấp đôi ngưỡng).
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Ghi chú cho quản lý</label>
                <textarea
                  rows={3}
                  value={proposeNote}
                  onChange={(e) => setProposeNote(e.target.value)}
                  placeholder="Lý do, mức độ khẩn cấp..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setProposeItem(null)}>Hủy</Button>
                <Button type="submit" variant="primary" size="sm" loading={isSubmitting} icon={<Send className="w-3.5 h-3.5" />}>
                  Gửi đề xuất
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
