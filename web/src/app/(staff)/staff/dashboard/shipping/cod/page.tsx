"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Shipment {
  id: number;
  trackingCode: string;
  carrierName: string;
  status: string;
  codAmount: number;
  codReconciled: boolean;

  order?: {
    orderId?: number;
    id?: number;
    orderCode: string;
    customerName: string;
    customerEmail: string;
  };
}

const API_URL = "";

export default function CodPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState("");

  const loadCod = async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/api/staff/shipping/cod`, { cache: "no-store" });

      if (!response.ok) throw new Error("Không thể tải danh sách đối soát COD");

      const data = await response.json();

      setShipments(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  useEffect(() => {
    loadCod();
  }, []);

  const reconcile = async (shipmentId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/staff/shipping/cod/${shipmentId}/reconcile`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Đối soát thất bại");
      }

      await loadCod();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  return (
    <div className="p-6">
      <nav className="flex flex-wrap gap-2 text-sm mb-4">
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/dashboard">Tổng quan</Link>
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/orders">Đơn chờ giao</Link>
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/shipments">Kiện hàng</Link>
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/exceptions">Ngoại lệ</Link>
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/cod">Đối soát COD</Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold">
        Đối soát COD
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">
                Mã vận đơn
              </th>

              <th className="p-3 text-left">
                Đơn hàng
              </th>

              <th className="p-3 text-left">
                Hãng vận chuyển
              </th>

              <th className="p-3 text-right">
                COD
              </th>

              <th className="p-3">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody>
            {shipments.map((shipment) => (
              <tr
                key={shipment.id}
                className="border-t"
              >
                <td className="p-3">
                  {shipment.trackingCode ?? "-"}
                </td>
                <td className="p-3">
                  <div className="font-semibold">
                    {shipment.order?.orderCode ?? `#${shipment.order?.orderId ?? shipment.order?.id ?? shipment.id}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {shipment.order?.customerName ?? shipment.order?.customerEmail ?? "-"}
                  </div>
                </td>

                <td className="p-3 text-xs">{shipment.carrierName ?? "-"}</td>

                <td className="p-3 text-right">
                  {Number(shipment.codAmount ?? 0).toLocaleString("vi-VN")} ₫
                </td>

                <td className="p-3 text-center">
                  <button
                    onClick={() => reconcile(shipment.id)}
                    className="rounded bg-green-600 px-3 py-2 text-white"
                  >
                    Xác nhận đối soát
                  </button>
                </td>
              </tr>
            ))}

            {shipments.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  Không có kiện hàng chờ đối soát COD
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}