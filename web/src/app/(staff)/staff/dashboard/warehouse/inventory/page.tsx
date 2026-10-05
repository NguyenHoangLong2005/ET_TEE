"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";
import { MapPin, Sliders, X, Save, RefreshCw, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

type Inventory = {
  id: number;
  productId: number;
  productName: string;
  warehouseLocation: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
};

type StockState = "OUT" | "LOW" | "OK";

const stockState = (i: Inventory): StockState => {
  const available = i.quantityOnHand - i.quantityReserved;
  return available <= 0 ? "OUT" : available <= i.reorderLevel ? "LOW" : "OK";
};

const STATE_UI: Record<StockState, { label: string; badge: string; bar: string }> = {
  OUT: { label: "Hết hàng", badge: "bg-rose-100 text-rose-700 border-rose-200", bar: "bg-rose-500" },
  LOW: { label: "Sắp hết", badge: "bg-amber-100 text-amber-800 border-amber-200", bar: "bg-amber-500" },
  OK: { label: "Còn hàng", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
};

const actionBtn =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50";

type Adjustment = {
  id: number;
  inventory: { id: number; productName: string };
  difference: number;
  reason: string;
  status: string;
};

export default function WarehouseInventoryPage() {
  const [tab, setTab] = useState<"stock" | "adjustments">("stock");
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "OUT">("ALL");

  // Modals
  const [activeModal, setActiveModal] = useState<"location" | "adjustment" | null>(null);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [adjustmentInput, setAdjustmentInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");

  const filteredItems = useMemo(() => {
    const base = stockFilter === "ALL" ? items : items.filter(i => stockState(i) === stockFilter);
    if (!searchQuery.trim()) return base;
    const lowerQ = searchQuery.toLowerCase();
    return base.filter(item => 
      (item.productName || "").toLowerCase().includes(lowerQ) ||
      (item.productId?.toString() || "").includes(lowerQ) ||
      (item.warehouseLocation || "").toLowerCase().includes(lowerQ)
    );
  }, [items, searchQuery, stockFilter]);

  const load = useCallback(async (signal?: AbortSignal, silent?: unknown) => {
    setError(""); if (silent !== true) setLoading(true);
    try {
      const [inv, adj] = await Promise.all([
        staffList<Inventory>("/api/staff/warehouse/inventory", signal),
        staffList<Adjustment>("/api/staff/warehouse/adjustments", signal),
      ]);
      setItems(inv);
      setAdjustments([...adj].sort((a, b) => b.id - a.id));
    }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  const adjustmentColumns: Column<Adjustment>[] = [
    { key: "id", header: "Mã phiếu", render: (a) => <span className="font-mono font-bold text-slate-900">#{a.id}</span> },
    { key: "product", header: "Sản phẩm", render: (a) => <span className="font-semibold text-slate-800">{a.inventory?.productName ?? `Tồn #${a.inventory?.id}`}</span> },
    {
      key: "difference",
      header: "Chênh lệch",
      render: (a) => (
        <span className={`font-mono font-bold ${a.difference > 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {a.difference > 0 ? `+${a.difference}` : a.difference}
        </span>
      ),
    },
    { key: "reason", header: "Lý do", render: (a) => <span className="text-xs text-slate-600">{a.reason}</span> },
    {
      key: "status",
      header: "Trạng thái",
      render: (a) => <StatusBadge status={a.status} label={a.status === "APPROVED" ? "Đã duyệt" : "Chờ duyệt"} />,
    },
  ];

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const openLocationModal = (item: Inventory) => {
    setSelectedItem(item);
    setLocationInput(item.warehouseLocation || "");
    setActiveModal("location");
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !locationInput.trim()) return;
    setBusy(selectedItem.id); setError("");
    try {
      await staffAction(`/api/staff/warehouse/inventory/${selectedItem.id}/location`, "PUT", { location: locationInput.trim() });
      toast.success(`Đã cập nhật vị trí kho cho ${selectedItem.productName}`);
      setActiveModal(null);
      await load(undefined, true);
    } catch (cause) { 
      const msg = errorMessage(cause);
      toast.error(msg);
      setError(msg); 
    }
    finally { setBusy(null); }
  };

  const openAdjustmentModal = (item: Inventory) => {
    setSelectedItem(item);
    setAdjustmentInput("0");
    setReasonInput("");
    setActiveModal("adjustment");
  };

  const handleRequestAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const difference = Number(adjustmentInput);
    if (!Number.isInteger(difference) || difference === 0) { 
      toast.error("Chênh lệch phải là số nguyên khác 0");
      return; 
    }
    if (selectedItem.quantityOnHand + difference < 0) {
      toast.error(`Không thể giảm quá tồn hiện tại (${selectedItem.quantityOnHand})`);
      return;
    }
    if (!reasonInput.trim()) {
      toast.error("Vui lòng nhập lý do điều chỉnh");
      return;
    }

    setBusy(selectedItem.id); setError("");
    try {
      await staffAction(`/api/staff/warehouse/inventory/${selectedItem.id}/adjustments`, "POST", {
        difference, reason: reasonInput.trim(),
      });
      toast.success("Đã gửi đề nghị điều chỉnh. Tồn kho chỉ thay đổi sau khi chủ cửa hàng duyệt.");
      setActiveModal(null);
      setTab("adjustments");
      await load(undefined, true);
    } catch (cause) { 
      const msg = errorMessage(cause);
      toast.error(msg);
      setError(msg); 
    }
    finally { setBusy(null); }
  };

  const columns: Column<Inventory>[] = [
    {
      key: "product",
      header: "Sản phẩm",
      render: (item) => (
        <div className="max-w-[18rem]">
          <div className="font-semibold text-slate-900 line-clamp-2" title={item.productName}>{item.productName}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">SP #{item.productId}</div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Vị trí",
      render: (item) =>
        item.warehouseLocation ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-700">
            <MapPin className="h-3 w-3 text-slate-400" />{item.warehouseLocation}
          </span>
        ) : (
          <span className="whitespace-nowrap text-xs italic text-slate-400">Chưa gán</span>
        ),
    },
    {
      key: "stock",
      header: "Tồn kho",
      render: (item) => {
        const available = item.quantityOnHand - item.quantityReserved;
        const st = stockState(item);
        // Thanh mức tồn: đầy = gấp 3 lần ngưỡng nhập lại.
        const pct = Math.max(4, Math.min(100, (Math.max(0, available) / Math.max(1, item.reorderLevel * 3)) * 100));
        return (
          <div className="min-w-[9rem]">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-black text-slate-900">{Math.max(0, available)}</span>
              <span className="text-[11px] text-slate-400">khả dụng</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${STATE_UI[st].bar}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 whitespace-nowrap text-[11px] text-slate-400">
              Thực tế {item.quantityOnHand} · giữ {item.quantityReserved} · ngưỡng {item.reorderLevel}
            </div>
          </div>
        );
      },
    },
    {
      key: "state",
      header: "Tình trạng",
      render: (item) => {
        const ui = STATE_UI[stockState(item)];
        return <span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${ui.badge}`}>{ui.label}</span>;
      },
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/staff/dashboard/warehouse/receiving?productId=${item.productId}`}
            className={`${actionBtn} border-primary-600 bg-primary-600 text-white hover:bg-primary-700`}
          >
            <PackagePlus className="h-3.5 w-3.5" /> Nhập thêm
          </Link>
          <button
            disabled={busy === item.id}
            onClick={() => openLocationModal(item)}
            className={`${actionBtn} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            title="Đổi vị trí kệ"
          >
            <MapPin className="h-3.5 w-3.5" /> Vị trí
          </button>
          <button
            disabled={busy === item.id}
            onClick={() => openAdjustmentModal(item)}
            className={`${actionBtn} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            title="Đề nghị điều chỉnh số lượng (cần chủ cửa hàng duyệt)"
          >
            <Sliders className="h-3.5 w-3.5" /> Điều chỉnh
          </button>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Tồn Kho & Vị Trí Hàng"
          subtitle="Quản lý chi tiết vị trí lưu trữ và số lượng hàng hóa thực tế trong kho"
          badge={<span className="bg-primary-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
          breadcrumbs={[
            { label: "Kho hàng", href: "/staff/dashboard/warehouse/dashboard" },
            { label: "Tồn kho" },
          ]}

          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            >
              Làm mới
            </Button>
          }
        />


        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{error}</p>}

        <div className="flex gap-1 rounded-xl bg-white border border-slate-200 p-1 w-fit shadow-sm">
          {([["stock", "Danh sách tồn kho"], ["adjustments", `Đề nghị điều chỉnh (${adjustments.length})`]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                tab === key ? "bg-primary-600 text-white shadow" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "stock" ? (
          <DataTable<Inventory>
            columns={columns}
            data={filteredItems}
            rowKey={(item) => item.id}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterSlot={
              <div className="flex items-center gap-1.5">
                {([
                  ["ALL", "Tất cả", items.length],
                  ["LOW", "Sắp hết", items.filter((i) => stockState(i) === "LOW").length],
                  ["OUT", "Hết hàng", items.filter((i) => stockState(i) === "OUT").length],
                ] as const).map(([key, label, count]) => (
                  <button
                    key={key}
                    onClick={() => setStockFilter(key)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      stockFilter === key
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>
            }
            searchPlaceholder="Tìm tên sản phẩm, ID, vị trí kho..."
            emptyTitle="Không có dữ liệu tồn kho"
            emptyMessage="Không tìm thấy bản ghi tồn kho nào khớp với tìm kiếm."
          />
        ) : (
          <>
            <p className="text-sm text-slate-600 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
              Đề nghị được tạo bằng nút &quot;Đề nghị điều chỉnh&quot; ở tab Danh sách tồn kho. Tồn kho chỉ thay đổi sau khi chủ cửa hàng duyệt.
            </p>
            <DataTable<Adjustment>
              columns={adjustmentColumns}
              data={adjustments}
              rowKey={(a) => a.id}
              loading={loading}
              emptyTitle="Chưa có đề nghị điều chỉnh"
              emptyMessage="Các đề nghị đã gửi sẽ hiển thị tại đây."
            />
          </>
        )}
      </div>

      {/* Location Modal */}
      {activeModal === "location" && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl text-slate-900">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-base flex items-center gap-2 text-sky-700">
                <MapPin className="w-5 h-5 text-sky-600" />
                <span>Cập nhật vị trí ({selectedItem.productName})</span>
              </h2>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateLocation} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã vị trí kho (Kệ / Tầng / Ô)</label>
                <input
                  type="text"
                  required
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Ví dụ: KHO-A-01, TANG-2-O-14"
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm uppercase font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setActiveModal(null)}>
                  Hủy
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={busy === selectedItem.id} icon={<Save className="w-3.5 h-3.5" />}>
                  Lưu vị trí
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {activeModal === "adjustment" && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl text-slate-900">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-base flex items-center gap-2 text-primary-700">
                <Sliders className="w-5 h-5 text-primary-600" />
                <span>Đề nghị điều chỉnh tồn kho</span>
              </h2>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRequestAdjustment} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl space-y-1 text-primary-800">
                <p><strong>Sản phẩm:</strong> {selectedItem.productName} (ID: #{selectedItem.productId})</p>
                <p><strong>Tồn kho hiện tại:</strong> {selectedItem.quantityOnHand}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chênh lệch số lượng (+ tăng, - giảm) *</label>
                <input
                  type="number"
                  required
                  value={adjustmentInput}
                  onChange={(e) => setAdjustmentInput(e.target.value)}
                  placeholder="Ví dụ: -2 hoặc +5"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary-600"
                />
                {Number.isInteger(Number(adjustmentInput)) && Number(adjustmentInput) !== 0 && (
                  <p className={`mt-1.5 ${selectedItem.quantityOnHand + Number(adjustmentInput) < 0 ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                    Tồn sau điều chỉnh (nếu được duyệt):{" "}
                    <b className="font-mono">{selectedItem.quantityOnHand + Number(adjustmentInput)}</b>
                    {selectedItem.quantityOnHand + Number(adjustmentInput) < 0 && " — không thể âm"}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý do điều chỉnh *</label>
                <textarea
                  rows={3}
                  required
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Ví dụ: Hàng rách bao bì, thất thoát trong kho, kiểm đếm lại..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setActiveModal(null)}>
                  Hủy
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={busy === selectedItem.id} icon={<Save className="w-3.5 h-3.5" />}>
                  Gửi đề nghị
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
