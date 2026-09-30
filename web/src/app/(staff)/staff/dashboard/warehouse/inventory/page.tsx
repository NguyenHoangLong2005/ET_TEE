"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useMemo } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";
import { MapPin, Sliders, X, Save, RefreshCw, Box } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

type Inventory = {
  id: string;
  variantId: string;
  locationId: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
};

export default function WarehouseInventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
<<<<<<< HEAD
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
=======
  const [busy, setBusy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [activeModal, setActiveModal] = useState<"location" | "adjustment" | null>(null);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [adjustmentInput, setAdjustmentInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const lowerQ = searchQuery.toLowerCase();
    return items.filter(item => 
      (item.productName || "").toLowerCase().includes(lowerQ) ||
      (item.productId?.toString() || "").includes(lowerQ) ||
      (item.warehouseLocation || "").toLowerCase().includes(lowerQ)
    );
  }, [items, searchQuery]);

>>>>>>> main
  const load = useCallback(async (signal?: AbortSignal) => {
    setError(""); setLoading(true);
    try { setItems(await staffList<Inventory>("/api/staff/warehouse/inventory", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

<<<<<<< HEAD
  const updateLocation = async (item: Inventory) => {
    const location = window.prompt("Vị trí kho mới:", item.locationId || "");
    if (location === null || !location.trim()) return;
    setBusy(item.id); setNotice(""); setError("");
    try {
      await staffAction(`/api/staff/warehouse/inventory/${item.id}/location`, "PUT", { location: location.trim() });
      setNotice(`Đã cập nhật vị trí cho ${item.variantId}.`);
      await load();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); }
  };
  const requestAdjustment = async (item: Inventory) => {
    const raw = window.prompt(`Chênh lệch cần điều chỉnh cho ${item.variantId} (ví dụ -2 hoặc 5):`);
    if (raw === null) return;
    const difference = Number(raw);
    if (!raw.trim() || !Number.isInteger(difference) || difference === 0) { setError("Chênh lệch phải là số nguyên khác 0."); return; }
    const reason = window.prompt("Lý do điều chỉnh (bắt buộc):");
    if (reason === null) return;
    if (!reason.trim()) { setError("Vui lòng nhập lý do."); return; }
    setBusy(item.id); setNotice(""); setError("");
=======
  const openLocationModal = (item: Inventory) => {
    setSelectedItem(item);
    setLocationInput(item.warehouseLocation || "");
    setActiveModal("location");
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !locationInput.trim()) return;
    setBusy(selectedItem.id); setError("");
>>>>>>> main
    try {
      await staffAction(`/api/staff/warehouse/inventory/${selectedItem.id}/location`, "PUT", { location: locationInput.trim() });
      toast.success(`Đã cập nhật vị trí kho cho ${selectedItem.productName}`);
      setActiveModal(null);
      await load();
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
    if (!reasonInput.trim()) { 
      toast.error("Vui lòng nhập lý do điều chỉnh");
      return; 
    }

    setBusy(selectedItem.id); setError("");
    try {
      await staffAction(`/api/staff/warehouse/inventory/${selectedItem.id}/adjustments`, "POST", {
        difference, reason: reasonInput.trim(), requestedBy: null,
      });
      toast.success("Đã gửi yêu cầu điều chỉnh tồn kho.");
      setActiveModal(null);
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
      header: "Sản phẩm / ID",
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900">{item.productName}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">SP #{item.productId} · tồn #{item.id}</div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Vị trí",
      render: (item) => (
        item.warehouseLocation ? (
          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs">{item.warehouseLocation}</span>
        ) : (
          <span className="text-slate-400 italic text-xs">Chưa gán</span>
        )
      ),
    },
    {
      key: "quantityOnHand",
      header: "Tồn thực tế",
      render: (item) => (
        <span className="font-mono font-bold text-slate-900">{item.quantityOnHand}</span>
      ),
    },
    {
      key: "quantityReserved",
      header: "Đã giữ",
      render: (item) => (
        <span className="font-mono text-amber-700">{item.quantityReserved}</span>
      ),
    },
    {
      key: "available",
      header: "Khả dụng",
      render: (item) => (
        <span className="font-mono font-bold text-emerald-600">{item.quantityOnHand - item.quantityReserved}</span>
      ),
    },
    {
      key: "reorderLevel",
      header: "Mức nhập lại",
      render: (item) => (
        <span className="font-mono text-slate-500">{item.reorderLevel}</span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy === item.id}
            onClick={() => openLocationModal(item)}
            icon={<MapPin className="w-3.5 h-3.5" />}
          >
            Sửa vị trí
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busy === item.id}
            onClick={() => openAdjustmentModal(item)}
            icon={<Sliders className="w-3.5 h-3.5" />}
          >
            Đề nghị điều chỉnh
          </Button>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
<<<<<<< HEAD
        <Link href="/staff/dashboard/warehouse" className="text-sm text-orange-300">← Về trang kho</Link>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold text-white">Tồn kho và vị trí hàng</h1><p className="mt-2 text-sm text-slate-400">Dữ liệu từ kho, không phải số liệu minh họa.</p></div>
          <button type="button" onClick={() => void load()} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Làm mới</button>
        </header>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>
        {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-200">{notice}</p>}
        {loading ? <p role="status">Đang tải tồn kho...</p> : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-slate-800 text-left text-slate-300"><tr>{["Sản phẩm / ID", "Vị trí", "Tồn thực tế", "Đã giữ", "Khả dụng", "Mức nhập lại", "Thao tác"].map((label) => <th scope="col" key={label} className="p-3">{label}</th>)}</tr></thead>
              <tbody>
                {items.map((item) => <tr key={item.id} className="border-t border-slate-800 align-top">
                  <td className="p-3 font-medium">{item.variantId}<div className="text-xs text-slate-500">SP #{item.variantId} · tồn #{item.id}</div></td>
                  <td className="p-3">{item.locationId || "Chưa gán"}</td>
                  <td className="p-3">{item.quantityOnHand}</td>
                  <td className="p-3">{item.quantityReserved}</td>
                  <td className="p-3">{item.quantityOnHand - item.quantityReserved}</td>
                  <td className="p-3">{item.reorderLevel}</td>
                  <td className="space-x-2 p-3"><button disabled={busy === item.id} onClick={() => void updateLocation(item)} className="rounded bg-sky-700 px-3 py-1.5 text-xs disabled:opacity-50">Sửa vị trí</button><button disabled={busy === item.id} onClick={() => void requestAdjustment(item)} className="rounded bg-orange-700 px-3 py-1.5 text-xs disabled:opacity-50">Đề nghị điều chỉnh</button></td>
                </tr>)}
                {items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Chưa có dữ liệu tồn kho.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
=======
        <PageHeader
          title="Tồn Kho & Vị Trí Hàng"
          subtitle="Quản lý chi tiết vị trí lưu trữ và số lượng hàng hóa thực tế trong kho"
          badge={<span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
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

        <nav className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
          <Link className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-bold px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{error}</p>}

        <DataTable<Inventory>
          columns={columns}
          data={filteredItems}
          rowKey={(item) => item.id}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm tên sản phẩm, ID, vị trí kho..."
          emptyTitle="Không có dữ liệu tồn kho"
          emptyMessage="Không tìm thấy bản ghi tồn kho nào khớp với tìm kiếm."
        />
>>>>>>> main
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
              <h2 className="font-bold text-base flex items-center gap-2 text-amber-700">
                <Sliders className="w-5 h-5 text-amber-600" />
                <span>Đề nghị điều chỉnh tồn kho</span>
              </h2>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRequestAdjustment} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
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
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý do điều chỉnh *</label>
                <textarea
                  rows={3}
                  required
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Ví dụ: Hàng rách bao bì, thất thoát trong kho, kiểm đếm lại..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
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
