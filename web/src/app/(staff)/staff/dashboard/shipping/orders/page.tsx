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
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/staff/dashboard/shipping" className="text-sm text-sky-300">← Về dữ liệu vận chuyển</Link>

        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/orders">Đơn chờ giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/shipments">Kiện hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/exceptions">Ngoại lệ</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/cod">Đối soát COD</Link>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Đơn cần bàn giao</h1>
            <p className="mt-2 text-sm text-slate-400">Danh sách đơn hàng đã bàn giao, đang vận chuyển hoặc đã giao.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
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
                  <th scope="col" className="p-3 text-right">COD / Tổng</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderId} className="border-t border-slate-800 align-top">
                    <td className="p-3 font-semibold text-white">{order.orderCode}</td>
                    <td className="p-3">{order.customerName ?? "-"}</td>
                    <td className="p-3">{order.phone ?? "-"}</td>
                    <td className="p-3 max-w-xs text-sm text-slate-400">{order.shippingAddress ?? "Chưa có địa chỉ"}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-white">{Number(order.total ?? 0).toLocaleString("vi-VN")} ₫</td>
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
        )}

        <p className="text-sm text-slate-500">
          Tạo kiện hàng cho các đơn đã bàn giao tại mục "Kiện hàng".
        </p>
      </div>
    </main>
  );
}