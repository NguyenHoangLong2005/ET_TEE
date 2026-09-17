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

export default function ShippingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  const loadOrders = () => {
    fetch(`${API_URL}/api/staff/shipping/orders`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Không thể tải đơn vận chuyển");
        setOrders((Array.isArray(result) ? result : result.data ?? []).map((o: Order) => ({ ...o, orderId: o.orderId ?? o.id })));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Không thể kết nối backend"));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/orders">Đơn chờ giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/shipments">Kiện hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/exceptions">Ngoại lệ</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/cod">Đối soát COD</Link>
        </nav>
        <h1 className="text-3xl font-bold">Đơn cần xử lý</h1>
        <button onClick={loadOrders} className="rounded-lg bg-sky-600 px-4 py-2 text-white">
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
              <th className="p-3 text-right">COD / Tổng</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.orderId} className="border-t align-top">
                <td className="p-3 font-semibold">{order.orderCode ?? `#${order.orderId}`}</td>
                <td className="p-3">{order.customerName ?? "-"}</td>
                <td className="p-3">{order.phone ?? "-"}</td>
                <td className="p-3 max-w-xs text-sm">{order.shippingAddress ?? "Chưa có địa chỉ"}</td>
                <td className="p-3 text-xs font-semibold">{order.status}</td>
                <td className="p-3 text-right">{Number(order.total ?? 0).toLocaleString("vi-VN")} ₫</td>
              </tr>
            ))}

            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Không có đơn nào chờ vận chuyển
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Tạo kiện hàng cho các đơn đã bàn giao tại mục “Kiện hàng”.
      </p>
    </main>
  );
}