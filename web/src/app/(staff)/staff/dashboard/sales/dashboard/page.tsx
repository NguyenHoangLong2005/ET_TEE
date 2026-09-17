"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Order {
  orderId: number;
  status: string;
}

const API_URL = "";

const NEW_STATUSES = ["PENDING_PAYMENT", "PENDING_CONFIRMATION"];
const DONE_STATUSES = ["DELIVERED", "RETURNED", "REFUNDED"];

export default function SalesDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      setOrders([]);

      try {
        const response = await fetch(`${API_URL}/api/staff/sales/orders`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API trả về HTTP ${response.status}. Kiểm tra log backend.`);
        }

        const payload: unknown = await response.json();
        const result =
          Array.isArray(payload)
            ? payload
            : payload !== null && typeof payload === "object" && "data" in payload
              ? (payload as { data: unknown }).data
              : null;

        if (!Array.isArray(result)) {
          throw new Error("API không trả về danh sách đơn hàng hợp lệ.");
        }

        if (!controller.signal.aborted) {
          setOrders(result as Order[]);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof TypeError
            ? `Không kết nối được API. Kiểm tra backend cổng 8080 và cấu hình BACKEND_URL của Next.js.`
            : err instanceof Error
              ? err.message
              : "Không thể tải danh sách đơn hàng."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadOrders();
    return () => controller.abort();
  }, [refreshKey]);

  const newOrders = orders.filter((order) =>
    NEW_STATUSES.includes(order.status)
  ).length;
  const confirmed = orders.filter((order) => order.status === "CONFIRMED").length;
  const processing = orders.filter(
    (order) =>
      !NEW_STATUSES.includes(order.status) &&
      order.status !== "CONFIRMED" &&
      order.status !== "CANCELLED" &&
      !DONE_STATUSES.includes(order.status)
  ).length;
  const cancelled = orders.filter((order) => order.status === "CANCELLED").length;

  const showValue = (value: number) => (loading || error ? "—" : value);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard bán hàng</h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/sales/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/sales/orders">Đơn cần xử lý</Link>
        </nav>
        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Đang tải..." : "Tải lại"}
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Không thể tải số liệu bán hàng</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2">Kiểm tra /api/staff/sales/orders cùng host với Next.js và log Spring Boot.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card title="Tổng đơn" value={showValue(orders.length)} />
        <Card title="Chờ xử lý" value={showValue(newOrders)} />
        <Card title="Đã xác nhận" value={showValue(confirmed)} />
        <Card title="Đang xử lý" value={showValue(processing)} />
        <Card title="Đã hủy" value={showValue(cancelled)} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
