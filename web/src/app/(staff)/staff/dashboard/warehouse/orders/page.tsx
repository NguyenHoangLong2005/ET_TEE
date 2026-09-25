"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage, staffList, staffAction } from "@/lib/staff-api";

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

const STATUS_ACTIONS: Record<string, { label: string; path: string }> = {
  CONFIRMED: { label: "Bat dau lay hang", path: "picking" },
  PICKING: { label: "Hoan tat lay hang", path: "picking/complete" },
  PACKED: { label: "Ban giao van chuyen", path: "handover" },
};

export default function WarehouseOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true); setError("");
    try {
        const result = await staffList<Order>("/api/staff/warehouse/orders");
      setOrders(result.map((o) => ({ ...o })));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  const runAction = async (orderId: number, path: string) => {
    try {
      await staffAction(`/api/staff/warehouse/orders/${orderId}/${path}`, "POST");
      await loadOrders();
    } catch (cause) {
      alert(errorMessage(cause));
    }
  };

  return (
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
      </div>
    </main>
  );
}