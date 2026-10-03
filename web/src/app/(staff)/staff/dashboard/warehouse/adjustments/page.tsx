"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useMemo } from "react";
import { errorMessage, staffAction, staffList } from "@/lib/staff-api";
import { Sliders, CheckCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Adjustment = {
  id: number;
  inventory: { id: number; productName: string };
  difference: number;
  reason: string;
  status: string;
  requestedBy: number | null;
  approvedBy: number | null;
};

export default function WarehouseAdjustmentsPage() {
  const [items, setItems] = useState<Adjustment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Confirm Modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToApprove, setItemToApprove] = useState<Adjustment | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(""); setLoading(true);
    try { setItems(await staffList<Adjustment>("/api/staff/warehouse/adjustments", signal)); }
    catch (cause) { if (!signal?.aborted) setError(errorMessage(cause)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => { 
    const controller = new AbortController(); 
    void load(controller.signal); 
    return () => controller.abort(); 
  }, [load]);

  const handleApprove = async () => {
    if (!itemToApprove) return;
    setBusy(itemToApprove.id); 
    setError(""); 
    try {
      await staffAction(`/api/staff/warehouse/adjustments/${itemToApprove.id}/approve`, "POST", { approvedBy: 1 });
      toast.success(`Đã phê duyệt phiếu điều chỉnh #${itemToApprove.id}`);
      setIsConfirmOpen(false);
      setItemToApprove(null);
      await load();
    } catch (cause) { 
      const msg = errorMessage(cause);
      toast.error(msg);
      setError(msg); 
    } finally { 
      setBusy(null); 
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const lower = searchQuery.toLowerCase();
    return items.filter(item =>
      `#${item.id}`.includes(lower) ||
      (item.inventory?.productName || "").toLowerCase().includes(lower) ||
      (item.reason || "").toLowerCase().includes(lower) ||
      item.status.toLowerCase().includes(lower)
    );
  }, [items, searchQuery]);

  const columns: Column<Adjustment>[] = [
    {
      key: "id",
      header: "Mã phiếu",
      render: (item) => (
        <span className="font-mono font-bold text-slate-900">#{item.id}</span>
      ),
    },
    {
      key: "product",
      header: "Sản phẩm",
      render: (item) => (
        <span className="font-semibold text-slate-800">
          {item.inventory?.productName ?? `Tồn #${item.inventory?.id}`}
        </span>
      ),
    },
    {
      key: "difference",
      header: "Chênh lệch",
      render: (item) => (
        <span className={`font-mono font-bold ${item.difference > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {item.difference > 0 ? `+${item.difference}` : item.difference}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Lý do điều chỉnh",
      render: (item) => (
        <span className="text-xs text-slate-600 max-w-xs line-clamp-2">{item.reason}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item) => (
        <StatusBadge
          status={item.status}
          label={item.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}
        />
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (item) => {
        if (item.status !== "PENDING") {
          return <span className="text-xs text-slate-400 italic">Đã xử lý</span>;
        }

        return (
          <Button
            variant="primary"
            size="sm"
            disabled={busy !== null}
            onClick={() => {
              setItemToApprove(item);
              setIsConfirmOpen(true);
            }}
            icon={<CheckCircle className="w-3.5 h-3.5" />}
          >
            Duyệt
          </Button>
        );
      },
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-900 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Duyệt Phiếu Điều Chỉnh Tồn Kho"
          subtitle="Phê duyệt chênh lệch số lượng tồn thực tế từ yêu cầu của nhân viên kiểm kho"
          breadcrumbs={[
            { label: "Kho hàng", href: "/staff/dashboard/warehouse" },
            { label: "Duyệt chênh lệch" },
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
          <Link className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-bold px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{error}</p>}

        <DataTable<Adjustment>
          columns={columns}
          data={filteredItems}
          rowKey={(item) => item.id}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm mã phiếu, sản phẩm, lý do..."
          emptyTitle="Chưa có phiếu điều chỉnh"
          emptyMessage="Không có yêu cầu điều chỉnh tồn kho nào cần phê duyệt."
        />

        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setItemToApprove(null);
          }}
          onConfirm={handleApprove}
          title="Xác nhận phê duyệt điều chỉnh tồn kho"
          message={`Bạn có chắc chắn muốn phê duyệt phiếu điều chỉnh #${itemToApprove?.id} (${itemToApprove?.difference && itemToApprove.difference > 0 ? `+${itemToApprove.difference}` : itemToApprove?.difference} đơn vị cho "${itemToApprove?.inventory?.productName}")? Số lượng tồn kho thực tế sẽ được cập nhật ngay.`}
          confirmText="Xác nhận duyệt"
          type="info"
          isLoading={busy !== null}
        />
      </div>
    </main>
  );
}
