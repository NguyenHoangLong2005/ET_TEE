"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const API_URL = "";

// confirmed -> picking -> packed: các bước kho cần thao tác.
const STATUS_ACTIONS: Record<string, { label: string; path: string }> = {
  CONFIRMED: { label: "Bắt đầu lấy hàng", path: "picking" },
  PICKING: { label: "Hoàn tất lấy hàng", path: "picking/complete" },
  PACKED: { label: "Bàn giao vận chuyển", path: "handover" },
};

export default function WarehouseOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  const loadOrders = () => {
    fetch(`${API_URL}/api/staff/warehouse/orders`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Không thể tải đơn kho");
        // Backend trả về mảng Order trực tiếp.
        setOrders((Array.isArray(result) ? result : result.data ?? []).map((o: Order) => ({ ...o, orderId: o.orderId ?? o.id })));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Không thể kết nối backend"));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const runAction = async (orderId: number, path: string) => {
    try {
      const response = await fetch(`${API_URL}/api/staff/warehouse/orders/${orderId}/${path}`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Thao tác thất bại");
      }

      loadOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/dashboard">Tổng quan</Link>
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

      {error && <p className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</p>}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Mã đơn</th>
              <th className="p-3 text-left">Khách hàng</th>
              <th className="p-3 text-left">SĐT</th>
              <th className="p-3 text-left">Địa chỉ</th>
              <th className="p-3 text-left">Trạng thái</th>
              <th className="p-3 text-right">Tổng tiền</th>
              <th className="p-3 text-left">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => {
              const action = STATUS_ACTIONS[order.status];

              return (
                <tr key={order.orderId} className="border-t align-top">
                  <td className="p-3 font-semibold">{order.orderCode ?? `#${order.orderId}`}</td>
                  <td className="p-3">{order.customerName ?? "-"}</td>
                  <td className="p-3">{order.phone ?? "-"}</td>
                  <td className="p-3 max-w-xs text-sm">{order.shippingAddress ?? "Chưa có địa chỉ"}</td>
                  <td className="p-3 text-xs font-semibold">{order.status}</td>
                  <td className="p-3 text-right">{Number(order.total ?? 0).toLocaleString("vi-VN")} ₫</td>
                  <td className="p-3">
                    {action ? (
                      <button
                        onClick={() => runAction(order.orderId, action.path)}
                        className="rounded bg-orange-600 px-3 py-1 text-white"
                      >
                        {action.label}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Không có thao tác</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
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