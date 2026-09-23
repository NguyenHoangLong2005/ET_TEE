"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage, staffList } from "@/lib/staff-api";

type Order = {
  orderId: number;
  id?: string;
  orderCode: string;
  customerName: string;
  phone: string;
  shippingAddress: string;
  status: string;
  paymentMethod: string;
  total: number;
};

export default function ShippingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true); setError("");
    try {
      const result = await staffList<Order>("/api/staff/shipping/orders");
      setOrders(result);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping">Tổng quan</Link>
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

      {error && <p className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">{error}</p>}
      {loading && <p className="mb-4 text-sm text-slate-400">Đang tải...</p>}

      <div className="overflow-x-auto rounded-xl border bg-slate-900">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-3 text-left text-slate-300">Mã đơn</th>
              <th className="p-3 text-left text-slate-300">Khách hàng</th>
              <th className="p-3 text-left text-slate-300">SĐT</th>
              <th className="p-3 text-left text-slate-300">Địa chỉ</th>
              <th className="p-3 text-left text-slate-300">Trạng thái</th>
              <th className="p-3 text-right text-slate-300">COD / Tổng</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderId} className="border-t align-top">
                <td className="p-3 font-semibold">{order.orderCode}</td>
                <td className="p-3">{order.customerName ?? "-"}</td>
                <td className="p-3">{order.phone ?? "-"}</td>
                <td className="p-3 max-w-xs text-sm">{order.shippingAddress ?? "Chưa có địa chỉ"}</td>
                <td className="p-3 text-xs font-semibold">{order.status}</td>
                <td className="p-3 text-right">{Number(order.total ?? 0).toLocaleString("vi-VN")} ₫</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Không có đơn nào chờ vận chuyển
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Tạo kiện hàng cho các đơn đã bàn giao tại mục "Kiện hàng".
      </p>
    </main>
  );
}