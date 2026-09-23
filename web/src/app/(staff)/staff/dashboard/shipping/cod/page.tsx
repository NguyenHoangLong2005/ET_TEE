"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { errorMessage, staffList, staffAction } from "@/lib/staff-api";

interface Shipment {
  shipmentId: number;
  id?: string;
  trackingCode: string;
  carrier?: string;
  status: string;
  codAmount: number;
  codReconciled: boolean;
  order?: {
    orderCode?: string;
    orderId?: number;
    id?: string;
    customerName: string;
    customerEmail?: string;
  };
}

export default function CodPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState("");

  const loadCod = async () => {
    try {
      setError("");
      const data = await staffList<Shipment>("/api/staff/shipping/cod");
      setShipments(data);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  useEffect(() => { void loadCod(); }, []);

  const reconcile = async (shipmentId: number) => {
    try {
      await staffAction(`/api/staff/shipping/cod/${shipmentId}/reconcile`, "POST");
      await loadCod();
    } catch (cause) {
      alert(errorMessage(cause));
    }
  };

  return (
    <div className="p-6">
      <nav className="flex flex-wrap gap-2 text-sm mb-4">
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping">Tổng quan</Link>
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/orders">Đơn chờ giao</Link>
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/shipments">Kiện hàng</Link>
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/exceptions">Ngoại lệ</Link>
        <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/cod">Đối soát COD</Link>
      </nav>
      <h1 className="mb-6 text-2xl font-bold">Đối soát COD</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-950 p-4 text-red-300">{error}</div>
      )}
      <p className="mb-4 text-sm text-slate-400">Tải danh sách kiện hàng có COD từ backend Spring Boot.</p>

      <div className="overflow-x-auto rounded-xl border bg-slate-900">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="p-3 text-left text-slate-300">Mã vận đơn</th>
              <th className="p-3 text-left text-slate-300">Đơn hàng</th>
              <th className="p-3 text-left text-slate-300">Hãng vận chuyển</th>
              <th className="p-3 text-right text-slate-300">COD</th>
              <th className="p-3 text-slate-300">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => (
              <tr key={shipment.shipmentId} className="border-t">
                <td className="p-3">{shipment.trackingCode ?? "-"}</td>
                <td className="p-3">
                  <div className="font-semibold">{shipment.order?.orderCode ?? `#${shipment.order?.orderId ?? shipment.shipmentId}`}</div>
                  <div className="text-xs text-slate-400">{shipment.order?.customerName ?? shipment.order?.customerEmail ?? "-"}</div>
                </td>
                <td className="p-3 text-xs">{shipment.carrier ?? "-"}</td>
                <td className="p-3 text-right">{Number(shipment.codAmount ?? 0).toLocaleString("vi-VN")} ₫</td>
                <td className="p-3 text-center">
                  <button onClick={() => reconcile(shipment.shipmentId)} className="rounded bg-green-600 px-3 py-2 text-white">Xác nhận đối soát</button>
                </td>
              </tr>
            ))}
            {shipments.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Không có kiện hàng chờ đối soát COD</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
