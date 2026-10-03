"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useMemo } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";
import { PackageCheck, CheckCircle2, XCircle, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Reservation = {
  id: number;
  order?: { id?: number; orderId?: number; orderCode?: string };
  productId: number;
  quantity: number;
  status: string;
};

export default function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Approve Confirm Modal
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveItem, setApproveItem] = useState<Reservation | null>(null);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Reservation | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(""); setLoading(true);
    try { setItems(await staffList<Reservation>("/api/staff/warehouse/reservations", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => { 
    const controller = new AbortController(); 
    void load(controller.signal); 
    return () => controller.abort(); 
  }, [load]);

  const openApproveModal = (item: Reservation) => {
    setApproveItem(item);
    setApproveModalOpen(true);
  };

  const handleApproveExecute = async () => {
    if (!approveItem) return;
    const item = approveItem;
    setBusy(item.id); setError("");
    try {
      await staffAction(`/api/staff/warehouse/reservations/${item.id}/approve`, "POST");
      toast.success(`Đã duyệt giữ hàng cho yêu cầu #${item.id}`);
      setApproveModalOpen(false);
      setApproveItem(null);
      await load();
    } catch (cause) { 
      const msg = errorMessage(cause);
      toast.error(msg);
      setError(msg); 
    }
    finally { setBusy(null); }
  };

  const openRejectModal = (item: Reservation) => {
    setSelectedItem(item);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    setBusy(selectedItem.id); setError("");
    try {
      await staffAction(`/api/staff/warehouse/reservations/${selectedItem.id}/reject`, "POST", { reason: rejectReason.trim() });
      toast.success(`Đã từ chối giữ hàng cho yêu cầu #${selectedItem.id}`);
      setRejectModalOpen(false);
      setSelectedItem(null);
      await load();
    } catch (cause) { 
      const msg = errorMessage(cause);
      toast.error(msg);
      setError(msg); 
    }
    finally { setBusy(null); }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const lower = searchQuery.toLowerCase();
    return items.filter(item =>
      `#${item.id}`.includes(lower) ||
      (item.order?.orderCode || "").toLowerCase().includes(lower) ||
      `#${item.productId}`.includes(lower) ||
      item.status.toLowerCase().includes(lower)
    );
  }, [items, searchQuery]);

  const columns: Column<Reservation>[] = [
    {
      key: "id",
      header: "Mã yêu cầu",
      render: (item) => (
        <span className="font-mono font-bold text-slate-900">#{item.id}</span>
      ),
    },
    {
      key: "order",
      header: "Đơn hàng",
      render: (item) => (
        <span className="font-mono font-semibold text-primary">
          {item.order?.orderCode ?? `#${item.order?.id ?? item.order?.orderId ?? "?"}`}
        </span>
      ),
    },
    {
      key: "productId",
      header: "Sản phẩm",
      render: (item) => (
        <span className="font-mono text-slate-700">SP #{item.productId}</span>
      ),
    },
    {
      key: "quantity",
      header: "Số lượng giữ",
      render: (item) => (
        <span className="font-mono font-bold text-amber-700 text-sm">{item.quantity}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item) => (
        <StatusBadge
          status={item.status}
          label={item.status}
        />
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={busy !== null}
            onClick={() => openApproveModal(item)}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Duyệt
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={busy !== null}
            onClick={() => openRejectModal(item)}
            icon={<XCircle className="w-3.5 h-3.5" />}
          >
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-900 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Duyệt Yêu Cầu Giữ Hàng (Kho Hàng)"
          subtitle="Xác nhận giữ tồn kho tạm thời cho đơn hàng đã xác nhận, tránh tình trạng bán vượt tồn kho"
          badge={<span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
          breadcrumbs={[
            { label: "Kho hàng", href: "/staff/dashboard/warehouse/dashboard" },
            { label: "Giữ hàng" },
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
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-bold px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{error}</p>}

        <DataTable<Reservation>
          columns={columns}
          data={filteredItems}
          rowKey={(item) => item.id}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm mã yêu cầu, mã đơn, mã sản phẩm..."
          emptyTitle="Không có yêu cầu giữ hàng"
          emptyMessage="Không có yêu cầu giữ hàng nào đang chờ xử lý."
        />

        {/* Approve Confirm Modal */}
        <ConfirmModal
          isOpen={approveModalOpen}
          onClose={() => {
            setApproveModalOpen(false);
            setApproveItem(null);
          }}
          onConfirm={handleApproveExecute}
          title="Xác nhận duyệt giữ hàng"
          message={`Bạn có chắc chắn muốn duyệt yêu cầu giữ ${approveItem?.quantity} sản phẩm (SP #${approveItem?.productId}) cho đơn ${approveItem?.order?.orderCode ?? `#${approveItem?.order?.id ?? "?"}`}?`}
          confirmText="Xác nhận duyệt"
          type="info"
          isLoading={busy !== null}
        />

        {/* Reject Modal */}
        {rejectModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl text-slate-900">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h2 className="font-bold text-base flex items-center gap-2 text-rose-600">
                  <XCircle className="w-5 h-5 text-rose-600" />
                  <span>Từ Chối Yêu Cầu Giữ Hàng #{selectedItem.id}</span>
                </h2>
                <button onClick={() => setRejectModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleRejectSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Lý do từ chối *
                  </label>
                  <textarea 
                    rows={3}
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do không đủ hàng hoặc đơn bị hủy..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>Hủy</Button>
                  <Button type="submit" variant="danger" size="sm" loading={busy === selectedItem.id}>Xác nhận từ chối</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
