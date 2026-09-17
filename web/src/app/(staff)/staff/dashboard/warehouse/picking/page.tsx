"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL =
  "";

type Order = {
  orderId: number;
  id?: number;
  orderCode: string;
  customerName: string;
  shippingAddress: string;
  status: string;
};

export default function WarehousePickingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  const loadOrders = () => {
    fetch(`${API_URL}/api/staff/warehouse/orders`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ??
              "Không thể tải danh sách lấy hàng"
          );
        }

        const all: Order[] = (Array.isArray(result) ? result : result.data ?? []).map((o: Order) => ({ ...o, orderId: o.orderId ?? o.id }));

        setOrders(
          all.filter(
            (order) =>
              order.status === "CONFIRMED" ||
              order.status === "PICKING"
          )
        );
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : "Không thể kết nối backend"
        )
      );
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const run = async (
    orderId: number,
    path: string
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/api/staff/warehouse/orders/${orderId}/${path}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          data.message ?? "Thao tác thất bại"
        );
      }

      loadOrders();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra"
      );
    }
  };

  return (
    <PickingView
      orders={orders}
      error={error}
      onRun={run}
    />
  );
}

function PickingView({
  orders,
  error,
  onRun,
}: {
  orders: Order[];
  error: string;
  onRun: (
    orderId: number,
    path: string
  ) => void;
}) {
  return (
    <main className="min-h-screen bg-[#15100f] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">

        <Link
          href="/staff/dashboard/warehouse"
          className="text-xs text-orange-300"
        >
          ← Về dữ liệu kho
        </Link>
        <nav className="flex flex-wrap gap-2 text-sm mt-3">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/orders">Đơn cần xử lý</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/receiving">Nhập kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        <h1 className="text-3xl font-black text-white">
          Lấy hàng
        </h1>

        {error && (
          <p className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <article
              key={order.orderId}
              className="flex flex-col gap-3 rounded-xl border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-xs text-slate-500">
                  {order.orderCode ??
                    `#${order.orderId}`}
                </p>

                <p className="mt-1 font-semibold text-white">
                  {order.customerName ??
                    "Khách chưa đặt tên"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {order.shippingAddress ??
                    "Chưa có địa chỉ"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-orange-300">
                  {order.status}
                </span>

                {order.status === "CONFIRMED" && (
                  <button
                    onClick={() =>
                      onRun(
                        order.orderId,
                        "picking"
                      )
                    }
                    className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Bắt đầu lấy hàng
                  </button>
                )}

                {order.status === "PICKING" && (
                  <button
                    onClick={() =>
                      onRun(
                        order.orderId,
                        "picking/complete"
                      )
                    }
                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Hoàn tất lấy hàng
                  </button>
                )}
              </div>
            </article>
          ))}

          {orders.length === 0 && (
            <p className="rounded-xl border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              Không có đơn nào cần lấy hàng.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}