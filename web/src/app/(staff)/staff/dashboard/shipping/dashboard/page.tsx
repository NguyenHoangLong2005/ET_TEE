"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL =
  "";

type Shipment = {
  id: number;
  carrierName: string;
  trackingCode: string;
  status: string;
  codAmount: number;
  codReconciled: boolean;
  order?: {
    orderCode: string;
    customerName: string;
  };
};

type ShipmentException = {
  exceptionId: number;
  exceptionType: string;
  description: string;
  status: string;
};

export default function ShippingDashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [exceptions, setExceptions] = useState<ShipmentException[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/staff/shipping/shipments`, {
        cache: "no-store",
      }).then((r) => r.json()),

      fetch(`${API_URL}/api/staff/shipping/exceptions`, {
        cache: "no-store",
      }).then((r) => r.json()),
    ])
      .then(([shipmentData, exceptionData]) => {
        setShipments(
          Array.isArray(shipmentData)
            ? shipmentData
            : shipmentData.data ?? []
        );

        setExceptions(
          Array.isArray(exceptionData)
            ? exceptionData
            : exceptionData.data ?? []
        );
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : "Không thể kết nối backend"
        )
      );
  }, []);

  const pending = shipments.filter(
    (s) =>
      s.status === "PENDING" ||
      s.status === "HANDED_OVER"
  ).length;

  const inTransit = shipments.filter(
    (s) => s.status === "IN_TRANSIT"
  ).length;

  const openExceptions = exceptions.filter(
    (e) => e.status === "OPEN"
  ).length;

  const pendingCod = shipments.filter(
    (s) =>
      s.status === "DELIVERED" &&
      Number(s.codAmount ?? 0) > 0 &&
      !s.codReconciled
  ).length;

  return (
    <main className="min-h-screen bg-[#0d1519] px-5 py-8 text-slate-100 md:px-10">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="border-b border-slate-800 pb-6">
          <Link
            href="/staff/dashboard/shipping"
            className="text-xs text-sky-300"
          >
            ET.TEE / SHIPPING DESK
          </Link>

          <h1 className="mt-4 text-3xl font-black text-white">
            Tổng quan vận chuyển
          </h1>
        </header>

        {error && (
          <p className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Chờ xử lý" value={pending} />

          <Metric label="Đang giao" value={inTransit} />

          <Metric
            label="Ngoại lệ mở"
            value={openExceptions}
          />

          <Metric
            label="Chờ đối soát COD"
            value={pendingCod}
          />
        </section>

        <section className="border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-bold text-white">
            Kiện hàng gần đây
          </h2>

          <div className="mt-4 divide-y divide-slate-800">
            {shipments.slice(0, 8).map((shipment) => (
              <div
                key={shipment.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <span className="text-sm text-white">
                  {shipment.order?.orderCode ?? `#${shipment.id}`}
                  {" · "}
                  {shipment.trackingCode ??
                    "chưa có vận đơn"}
                </span>

                <span className="text-xs font-bold text-sky-300">
                  {shipment.status}
                </span>
              </div>
            ))}

            {shipments.length === 0 && (
              <p className="py-3 text-sm text-slate-500">
                Chưa có kiện hàng.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}