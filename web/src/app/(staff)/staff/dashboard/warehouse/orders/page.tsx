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
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
        <h1 className="text-3xl font-bold">Đơn cần xử lý</h1>
        <button onClick={loadOrders} className="rounded-lg bg-orange-600 px-4 py-2 text-white">
          Làm mới
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">{error}</p>}
      {loading && <p className="mb-4 text-sm text-slate-400">Đang tải...</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-3 text-left text-slate-300">Mã đơn</th>
              <th className="p-3 text-left text-slate-300">Khách hàng</th>
              <th className="p-3 text-left text-slate-300">SĐT</th>
              <th className="p-3 text-left text-slate-300">Địa chỉ</th>
              <th className="p-3 text-left text-slate-300">Trạng thái</th>
              <th className="p-3 text-right text-slate-300">Tổng tiền</th>
              <th className="p-3 text-left text-slate-300">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const action = STATUS_ACTIONS[order.status.toUpperCase()];
              return (
                   <tr key={order.orderId ?? order.orderCode} className="border-t align-top">
                   <td className="p-3 font-semibold">{order.orderCode ?? `#${order.orderId ?? order.id}`}</td>
                   <td className="p-3">{order.customerName ?? "-"}</td>
                   <td className="p-3">{order.phone ?? "-"}</td>
                   <td className="p-3 max-w-xs text-sm">{order.shippingAddress ?? "Chưa có địa chỉ"}</td>
                   <td className="p-3">{order.status}</td>
                   <td className="p-3 text-right">{Number(order.total ?? 0).toLocaleString("vi-VN")} ₫</td>
                   <td className="p-3">
                     {action ? (
                       <button
                         onClick={() => order.orderId != null && runAction(order.orderId, action.path)}
                         className="rounded bg-orange-600 px-3 py-1 text-white"
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
    </main>
  );
}