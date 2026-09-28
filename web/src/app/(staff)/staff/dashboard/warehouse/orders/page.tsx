"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { staffList, staffAction } from "@/lib/staff-api";
import { RefreshCw, Play, CheckCircle2, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

type Order = {
  orderId: number;
  id?: number;
  orderCode: string;
  customerName: string;
  phone: string;
  shippingAddress: string;
  status: string;
  paymentMethod: string;
  total: number;
};

// confirmed -> picking -> packed: các bước kho cần thao tác.
const STATUS_ACTIONS: Record<string, { label: string; path: string; icon: React.ReactNode }> = {
  CONFIRMED: { label: "Bắt đầu lấy hàng", path: "picking", icon: <Play className="w-3.5 h-3.5" /> },
  PICKING: { label: "Hoàn tất lấy hàng", path: "picking/complete", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  PACKED: { label: "Bàn giao vận chuyển", path: "handover", icon: <Truck className="w-3.5 h-3.5" /> },
};

export default function WarehouseOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await staffList<Order>("/api/staff/warehouse/orders");
      setOrders(result.map((o) => ({ ...o, orderId: o.orderId ?? o.id ?? 0 })));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể kết nối backend";
      setError(msg);
      toast.error(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const runAction = async (orderId: number, path: string) => {
    setBusyOrderId(orderId);
    try {
      await staffAction(`/api/staff/warehouse/orders/${orderId}/${path}`, "POST");
      toast.success("Cập nhật trạng thái đơn kho thành công");
      await loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusyOrderId(null);
    }
  };

  const columns: Column<Order>[] = [
    {
      key: "orderCode",
      header: "Mã đơn",
      render: (order) => (
        <span className="font-mono font-bold text-slate-900">{order.orderCode ?? `#${order.orderId}`}</span>
      ),
    },
    {
      key: "customer",
      header: "Khách hàng",
      render: (order) => (
        <div>
          <div className="font-semibold text-slate-800">{order.customerName ?? "—"}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{order.phone ?? ""}</div>
        </div>
      ),
    },
    {
      key: "shippingAddress",
      header: "Địa chỉ giao",
      render: (order) => (
        <span className="text-xs text-slate-600 line-clamp-2 max-w-xs">{order.shippingAddress || "Chưa có địa chỉ"}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (order) => (
        <StatusBadge status={order.status} />
      ),
    },
    {
      key: "total",
      header: "Tổng tiền",
      render: (order) => (
        <span className="font-mono font-bold text-emerald-600">
          {Number(order.total ?? 0).toLocaleString("vi-VN")} ₫
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (order) => {
        const action = STATUS_ACTIONS[order.status];
        if (!action) {
          return <span className="text-xs text-slate-400 italic">Không có thao tác</span>;
        }

        return (
          <Button
            variant="primary"
            size="sm"
            loading={busyOrderId === order.orderId}
            onClick={() => runAction(order.orderId, action.path)}
            icon={action.icon}
          >
            {action.label}
          </Button>
        );
      },
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-900 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Đơn Hàng Cần Xử Lý (Kho Hàng)"
          subtitle="Điều phối xuất kho: Xác nhận lấy hàng, đóng gói và sẵn sàng bàn giao vận chuyển"
          badge={<span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">KHO HÀNG</span>}
          breadcrumbs={[
            { label: "Kho hàng", href: "/staff/dashboard/warehouse/dashboard" },
            { label: "Đơn cần xử lý" },
          ]}

          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={loadOrders}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            >
              Làm mới
            </Button>
          }
        />

        <nav className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-bold px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">{error}</p>}

        <DataTable<Order>
          columns={columns}
          data={orders}
          rowKey={(order) => order.orderId}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Tìm mã đơn, tên khách, số điện thoại..."
          emptyTitle="Không có đơn nào cần xử lý"
          emptyMessage="Tất cả đơn hàng kho đã được xử lý hoàn tất."
        />
      </div>
    </main>
  );
}
