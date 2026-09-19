"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { errorMessage, staffList, staffAction } from "@/lib/staff-api";

type Shipment = {
  id: string;
  carrier?: string;
  trackingCode: string;
  status: string;
  codAmount: number;
  codReconciled: boolean;
  order?: {
    orderCode?: string;
    id?: string;
    customerName: string;
    phone: string;
    shippingAddress: string;
  };
};

export default function ShippingShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ orderId: "", carrierName: "", trackingCode: "", codAmount: "" });

  const loadShipments = async () => {
    setLoading(true); setError("");
    try {
      const data = await staffList<Shipment>("/api/staff/shipping/shipments");
      setShipments(data);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadShipments(); }, []);

  const createShipment = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await staffAction("/api/staff/shipping/shipments", "POST", {
        orderId: form.orderId,
        carrierName: form.carrierName,
        trackingCode: form.trackingCode,
        codAmount: form.codAmount ? Number(form.codAmount) : 0,
      });
      setForm({ orderId: "", carrierName: "", trackingCode: "", codAmount: "" });
      await loadShipments();
    } catch (cause) {
      alert(errorMessage(cause));
    }
  };

  const runAction = async (id: string, path: string, method: "POST" | "PUT", body?: unknown) => {
    try {
      await staffAction(`/api/staff/shipping/shipments/${id}/${path}`, method, body);
      await loadShipments();
    } catch (cause) {
      alert(errorMessage(cause));
    }
  };

  const updateTrackingCode = (id: string, current: string) => {
    const next = window.prompt("Nhập mã vận đơn mới:", current ?? "");
    if (next) runAction(id, "tracking-code", "PUT", { trackingCode: next });
  };

  return (
    <main className="min-h-screen bg-[#0d1519] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/staff/dashboard/shipping" className="text-xs text-sky-300">← Về dữ liệu vận chuyển</Link>
        <nav className="flex flex-wrap gap-2 text-sm mt-3">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/orders">Đơn chờ giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/shipments">Kiện hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/exceptions">Ngoại lệ</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/cod">Đối soát COD</Link>
        </nav>

        <h1 className="text-3xl font-black text-white">Danh sách kiện hàng</h1>

        {error && <p className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
        {loading && <p className="text-sm text-slate-400">Đang tải kiện hàng...</p>}

        <form onSubmit={createShipment} className="grid gap-3 rounded-xl border-slate-800 bg-slate-900 p-5 md:grid-cols-5">
          <input required value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} placeholder="Mã đơn (orderId)" className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input required value={form.carrierName} onChange={(e) => setForm({ ...form, carrierName: e.target.value })} placeholder="Hãng vận chuyển" className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input required value={form.trackingCode} onChange={(e) => setForm({ ...form, trackingCode: e.target.value })} placeholder="Mã vận đơn" className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <input value={form.codAmount} onChange={(e) => setForm({ ...form, codAmount: e.target.value })} placeholder="Tiền COD" className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Tạo kiện hàng</button>
        </form>

        <div className="overflow-x-auto rounded-xl border-slate-800 bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/60 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="p-3">Mã đơn</th>
                <th className="p-3">Hãng / Vận đơn</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">COD</th>
                <th className="p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="border-t border-slate-800 align-top">
                  <td className="p-3">
                    <div className="font-semibold text-white">{shipment.order?.orderCode ?? `#${shipment.order?.id ?? shipment.id}`}</div>
                    <div className="text-xs text-slate-500">{shipment.order?.customerName ?? "-"}</div>
                  </td>
                  <td className="p-3"><div>{shipment.carrier ?? "-"}</div><div className="text-xs text-slate-500">{shipment.trackingCode ?? "Chưa có"}</div></td>
                  <td className="p-3 text-xs font-bold text-sky-300">{shipment.status}</td>
                  <td className="p-3 text-right">{Number(shipment.codAmount ?? 0).toLocaleString("vi-VN")} ₫ {shipment.codReconciled && <div className="text-xs text-emerald-400">Đã đối soát</div>}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {(shipment.status === "pending" || shipment.status === "handed_over") && (
                        <button onClick={() => updateTrackingCode(shipment.id, shipment.trackingCode)} className="rounded border-sky-500/40 px-3 py-1 text-xs text-sky-200">Sửa vận đơn</button>
                      )}
                      {shipment.status === "pending" && (
                        <button onClick={() => runAction(shipment.id, "handover", "POST")} className="rounded bg-sky-600 px-3 py-1 text-xs text-white">Bàn giao</button>
                      )}
                      {shipment.status === "handed_over" && (
                        <button onClick={() => runAction(shipment.id, "shipping", "POST")} className="rounded bg-indigo-600 px-3 py-1 text-xs text-white">Bắt đầu giao</button>
                      )}
                      {["handed_over", "in_transit"].includes(shipment.status) && (
                        <button onClick={() => {
                          const receiverName = window.prompt("Tên người nhận:") ?? "";
                          const imageUrl = window.prompt("URL ảnh bằng chứng đã lưu:") ?? undefined;
                          if (receiverName) runAction(shipment.id, "proof", "POST", { receiverName, imageUrl, note: window.prompt("Ghi chú giao hàng:") ?? "" });
                        }} className="rounded bg-emerald-600 px-3 py-1 text-xs text-white">Giao thành công</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Chưa có kiện hàng nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}