"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ClipboardCheck, Plus, X, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

type Stocktake = {
  id: number;
  warehouseLocation: string;
  actualQuantity: number;
  status: string;
};

export default function WarehouseStockCountPage() {
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState("MAIN");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [targetStocktake, setTargetStocktake] = useState<Stocktake | null>(null);
  const [actualQuantityInput, setActualQuantityInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStocktakes = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${getApiBaseUrl()}/api/staff/warehouse/stocktakes`, {
        headers: getAuthHeaders() as Record<string, string>,
        cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) throw new Error("Không thể tải phiếu kiểm kê");
      setStocktakes(Array.isArray(result) ? result : result.data ?? []);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Không thể kết nối backend";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStocktakes();
  }, []);

  const createStocktake = async (event: FormEvent) => {
    event.preventDefault();
    if (!location.trim()) {
      toast.error("Vui lòng nhập vị trí kho cần kiểm kê");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${getApiBaseUrl()}/api/staff/warehouse/stocktakes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() as Record<string, string> },
        body: JSON.stringify({ warehouseLocation: location.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Tạo phiếu kiểm kê thất bại");
      }

      toast.success(`Đã tạo phiếu kiểm kê cho vị trí ${location}`);
      loadStocktakes();
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRecordModal = (stocktake: Stocktake) => {
    setTargetStocktake(stocktake);
    setActualQuantityInput(stocktake.actualQuantity != null ? stocktake.actualQuantity.toString() : "");
    setModalOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStocktake) return;
    const qty = Number(actualQuantityInput);
    if (isNaN(qty) || qty < 0) {
      toast.error("Số lượng kiểm đếm phải là số nguyên lớn hơn hoặc bằng 0");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${getApiBaseUrl()}/api/staff/warehouse/stocktakes/${targetStocktake.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() as Record<string, string> },
        body: JSON.stringify({ actualQuantity: qty }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Ghi nhận kiểm kê thất bại");
      }

      toast.success(`Đã ghi nhận số lượng thực tế: ${qty} cho phiếu #${targetStocktake.id}`);
      setModalOpen(false);
      loadStocktakes();
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStocktakes = stocktakes.filter(s => {
    if (!searchQuery.trim()) return true;
    const lower = searchQuery.toLowerCase();
    return (
      `#${s.id}`.includes(lower) ||
      (s.warehouseLocation || "").toLowerCase().includes(lower) ||
      s.status.toLowerCase().includes(lower)
    );
  });

  const columns: Column<Stocktake>[] = [
    {
      key: "id",
      header: "Mã phiếu",
      render: (s) => (
        <span className="font-mono font-bold text-slate-900">Phiếu #{s.id}</span>
      ),
    },
    {
      key: "location",
      header: "Vị trí kho",
      render: (s) => (
        <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
          {s.warehouseLocation ?? "MAIN"}
        </span>
      ),
    },
    {
      key: "actualQuantity",
      header: "Số lượng thực tế",
      render: (s) => (
        <span className="font-mono font-bold text-slate-900 text-sm">
          {s.actualQuantity != null ? s.actualQuantity : <span className="text-slate-400 italic font-normal">Chưa ghi nhận</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (s) => (
        <StatusBadge
          status={s.status}
          label={s.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang kiểm đếm'}
        />
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (s) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openRecordModal(s)}
          icon={<Save className="w-3.5 h-3.5" />}
        >
          Ghi nhận kiểm đếm
        </Button>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-900 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Kiểm Kê Kho Định Kỳ (Kho Hàng)"
          subtitle="Lập phiếu kiểm đếm số lượng thực tế tại từng khu vực kho để đối chiếu sai lệch tồn kho"
          badge={<span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
          breadcrumbs={[
            { label: "Kho hàng", href: "/staff/dashboard/warehouse/dashboard" },
            { label: "Kiểm kê" },
          ]}

          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={loadStocktakes}
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
          <Link className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-bold px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{error}</p>}

        {/* Create form */}
        <form onSubmit={createStocktake} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Vị trí kho cần kiểm kê *</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Vị trí kho (vd: MAIN, SEC-A)"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="self-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              icon={<Plus className="w-4 h-4" />}
            >
              Tạo phiếu kiểm kê
            </Button>
          </div>
        </form>

        <DataTable<Stocktake>
          columns={columns}
          data={filteredStocktakes}
          rowKey={(s) => s.id}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm mã phiếu, vị trí kho..."
          emptyTitle="Chưa có phiếu kiểm kê nào"
          emptyMessage="Không tìm thấy phiếu kiểm kê nào trong hệ thống."
        />

        {/* Record Count Modal */}
        {modalOpen && targetStocktake && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl text-slate-900">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  <span>Ghi nhận kiểm đếm (Phiếu #{targetStocktake.id})</span>
                </h2>
                <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleRecordSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Số lượng kiểm đếm thực tế *
                  </label>
                  <input 
                    type="number"
                    required
                    min="0"
                    value={actualQuantityInput}
                    onChange={(e) => setActualQuantityInput(e.target.value)}
                    placeholder="Nhập số lượng đếm được..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>Hủy</Button>
                  <Button type="submit" variant="primary" size="sm" loading={isSubmitting} icon={<Save className="w-3.5 h-3.5" />}>Lưu kết quả</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
