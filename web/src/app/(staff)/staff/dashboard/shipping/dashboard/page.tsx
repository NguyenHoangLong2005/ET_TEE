"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, staffList } from "@/lib/staff-api";

type Shipment = {
  shipmentId: number;
  id?: string;
  carrier?: string;
  trackingCode?: string;
  status: string;
  codAmount?: number;
  codReconciled?: boolean;
  order?: {
    orderCode?: string;
    orderId?: number;
    id?: string;
    customerName?: string;
  };
};

type ShipmentException = {
  exceptionId: number;
  id?: string;
  exceptionType?: string;
  description?: string;
  status: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ nhận",
  handed_over: "Đã bàn giao",
  in_transit: "Đang giao",
  delivered: "Đã giao",
  exception: "Giao thất bại",
  returned: "Hoàn trả",
  cancelled: "Đã hủy",
};

export default function ShippingDashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [exceptions, setExceptions] = useState<ShipmentException[]>([]);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async (signal: AbortSignal) => {
    setError("");
    const results = await Promise.allSettled([
      staffList<Shipment>("/api/staff/shipping/shipments", signal),
      staffList<ShipmentException>("/api/staff/shipping/exceptions", signal),
    ]);
    if (signal.aborted) return;
    setShipments(results[0].status === "fulfilled" ? results[0].value : []);
    setExceptions(results[1].status === "fulfilled" ? results[1].value : []);
    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );
    if (failures.length) setError(failures.map((r) => errorMessage(r.reason)).join(" · "));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refresh]);

    const pending = shipments.filter(
    (s) => s.status === "pending" || s.status === "handed_over"
  ).length;
  const inTransit = shipments.filter((s) => s.status === "in_transit").length;
  const openExceptions = exceptions.filter((e) => e.status === "open").length;
const pendingCod = shipments.filter(
    (s) => s.status === "delivered" && Number(s.codAmount ?? 0) > 0 && !s.codReconciled
  ).length;

  const distribution = Object.entries(
    shipments.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([status, count]) => ({ status, count, label: STATUS_LABELS[status] ?? status }))
    .sort((a, b) => b.count - a.count);

  const maxCount = distribution[0]?.count ?? 0;

  return (
    <main className="min-h-screen bg-[#0d1519] px-5 py-8 text-slate-100 md:px-10">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-6">
          <div>
            <Link href="/staff/dashboard/shipping" className="text-xs text-sky-300">
              ET.TEE / SHIPPING DESK
            </Link>
            <h1 className="mt-4 text-3xl font-black text-white">Tổng quan vận chuyển</h1>
          </div>
          <button
            type="button"
            onClick={() => setRefresh((r) => r + 1)}
            disabled={!!error && shipments.length === 0}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            Tải lại
          </button>
        </header>

        {error && (
          <p role="alert" className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Chờ xử lý" value={shipments.length ? pending : "—"} />
          <Metric label="Đang giao" value={shipments.length ? inTransit : "—"} />
          <Metric label="Ngoại lệ mở" value={exceptions.length ? openExceptions : "—"} />
          <Metric label="Chờ đối soát COD" value={shipments.length ? pendingCod : "—"} />
        </section>

        <section className="border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-bold text-white">Phân bố trạng thái kiện hàng</h2>
          <div className="mt-5 space-y-3">
            {distribution.map(({ status, count, label }) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-28 truncate text-xs text-slate-400" title={status}>
                  {label}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded bg-slate-800">
                  <div
                    className="absolute inset-y-0 left-0 bg-sky-500/80 transition-all"
                    style={{ width: `${maxCount ? (count / maxCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-white">{count}</span>
              </div>
            ))}
            {distribution.length === 0 && (
              <p className="py-3 text-sm text-slate-500">Chưa có dữ kiện hàng.</p>
            )}
          </div>
        </section>

        <section className="border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-bold text-white">Kiện hàng gần đây</h2>
          <div className="mt-4 divide-y divide-slate-800">
             {shipments.slice(0, 10).map((shipment) => (
              <div key={shipment.shipmentId} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-white">
                  {shipment.order?.orderCode ?? `#${shipment.order?.orderId ?? shipment.shipmentId}`}
                  {" · "}
                  {shipment.trackingCode ?? "chưa có vận đơn"}
                </span>
                <span className="text-xs font-bold text-sky-300">
                  {STATUS_LABELS[shipment.status] ?? shipment.status}
                </span>
              </div>
            ))}
            {shipments.length === 0 && (
              <p className="py-3 text-sm text-slate-500">Chưa có kiện hàng.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}