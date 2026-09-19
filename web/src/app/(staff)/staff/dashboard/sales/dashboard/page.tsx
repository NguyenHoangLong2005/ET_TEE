"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage, staffList } from "@/lib/staff-api";

interface Order {
  id?: string; status: string;
}

const NEW_STATUSES = ["pending_payment", "pending_confirmation"];
const DONE_STATUSES = ["delivered", "returned", "refunded"];

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
        const result = await staffList<Order>("/api/staff/sales/orders");
        if (!controller.signal.aborted) {
          setOrders(result);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          errorMessage(cause)
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadOrders();
    return () => controller.abort();
  }, [refreshKey]);

  const newOrders = orders.filter((order) => NEW_STATUSES.includes(order.status)).length;
  const confirmed = orders.filter((order) => order.status === "confirmed").length;
  const processing = orders.filter((order) => !NEW_STATUSES.includes(order.status) && order.status !== "confirmed" && order.status !== "cancelled" && !DONE_STATUSES.includes(order.status)).length;
  const cancelled = orders.filter((order) => order.status === "cancelled").length;
  const showValue = (value: number) => (loading || error ? "—" : value);

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard bán hàng</h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/sales/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/sales/orders">Đơn cần xử lý</Link>
        </nav>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{loading ? "Đang tải..." : "Tải lại"}</button>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-800 bg-red-950 p-4 text-sm text-red-200">
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
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
