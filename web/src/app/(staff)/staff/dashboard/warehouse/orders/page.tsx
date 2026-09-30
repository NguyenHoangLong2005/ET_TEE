"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
<<<<<<< HEAD
import { errorMessage, staffList, staffAction } from "@/lib/staff-api";
=======
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api-config";
import { RefreshCw, Play, CheckCircle2, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
>>>>>>> main

type Order = {
  orderId?: number;
  id?: string;
  orderCode: string;
  customerName: string;
  phone: string;
  shippingAddress: string;
  status: string;
  paymentMethod: string;
  total: number;
};

<<<<<<< HEAD
const STATUS_ACTIONS: Record<string, { label: string; path: string }> = {
  CONFIRMED: { label: "Bat dau lay hang", path: "picking" },
  PICKING: { label: "Hoan tat lay hang", path: "picking/complete" },
  PACKED: { label: "Ban giao van chuyen", path: "handover" },
=======
// confirmed -> picking -> packed: các bước kho cần thao tác.
const STATUS_ACTIONS: Record<string, { label: string; path: string; icon: React.ReactNode }> = {
  CONFIRMED: { label: "Bắt đầu lấy hàng", path: "picking", icon: <Play className="w-3.5 h-3.5" /> },
  PICKING: { label: "Hoàn tất lấy hàng", path: "picking/complete", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  PACKED: { label: "Bàn giao vận chuyển", path: "handover", icon: <Truck className="w-3.5 h-3.5" /> },
>>>>>>> main
};

export default function WarehouseOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
<<<<<<< HEAD
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true); setError("");
    try {
        const result = await staffList<Order>("/api/staff/warehouse/orders");
      setOrders(result.map((o) => ({ ...o })));
    } catch (cause) {
      setError(errorMessage(cause));
=======
  const [searchQuery, setSearchQuery] = useState("");
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/staff/warehouse/orders`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Không thể tải đơn kho");
      setOrders((Array.isArray(result) ? result : result.data ?? []).map((o: Order) => ({ ...o, orderId: o.orderId ?? o.id ?? 0 })));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể kết nối backend";
      setError(msg);
      toast.error(msg);
      setOrders([]);
>>>>>>> main
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  const runAction = async (orderId: number, path: string) => {
    setBusyOrderId(orderId);
    try {
<<<<<<< HEAD
      await staffAction(`/api/staff/warehouse/orders/${orderId}/${path}`, "POST");
      await loadOrders();
    } catch (cause) {
      alert(errorMessage(cause));
=======
      const response = await fetch(`${getApiBaseUrl()}/api/staff/warehouse/orders/${orderId}/${path}`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Thao tác thất bại");
      }

      toast.success("Cập nhật trạng thái đơn kho thành công");
      await loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusyOrderId(null);
>>>>>>> main
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
<<<<<<< HEAD
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/staff/dashboard/warehouse" className="text-sm text-orange-300">← Về trang kho</Link>

        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse">Tổng quan</Link>
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

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Đơn cần xử lý</h1>
            <p className="mt-2 text-sm text-slate-400">Danh sách đơn hàng đã xác nhận, đang lấy hàng hoặc đã đóng gói.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Làm mới
          </button>
        </div>

        {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
        {loading && <p role="status" className="text-sm text-slate-400">Đang tải đơn hàng...</p>}

        {!loading && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-800 text-left text-slate-300">
                <tr>
                  <th scope="col" className="p-3">Mã đơn</th>
                  <th scope="col" className="p-3">Khách hàng</th>
                  <th scope="col" className="p-3">SĐT</th>
                  <th scope="col" className="p-3">Địa chỉ</th>
                  <th scope="col" className="p-3">Trạng thái</th>
                  <th scope="col" className="p-3 text-right">Tổng tiền</th>
                  <th scope="col" className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const action = STATUS_ACTIONS[order.status.toUpperCase()];
                  return (
                    <tr key={order.orderId ?? order.orderCode} className="border-t border-slate-800 align-top">
                      <td className="p-3 font-semibold text-white">{order.orderCode ?? `#${order.orderId ?? order.id}`}</td>
                      <td className="p-3">{order.customerName ?? "-"}</td>
                      <td className="p-3">{order.phone ?? "-"}</td>
                      <td className="p-3 max-w-xs text-sm text-slate-400">{order.shippingAddress ?? "Chưa có địa chỉ"}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-white">{Number(order.total ?? 0).toLocaleString("vi-VN")} ₫</td>
                      <td className="p-3">
                        {action ? (
                          <button
                            type="button"
                            disabled={order.orderId == null}
                            onClick={() => order.orderId != null && runAction(order.orderId, action.path)}
                            className="rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {action.label}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Không có thao tác</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Không có đơn nào cần xử lý
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
=======
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
>>>>>>> main
      </div>
    </main>
  );
}
