"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

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
    orderId?: number;
    id?: number;
    orderCode: string;
    customerName: string;
    phone: string;
    shippingAddress: string;
  };
};

// shipment_status:
// pending -> handed_over -> in_transit -> delivered | exception | returned

export default function ShippingShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    orderId: "",
    carrierName: "",
    trackingCode: "",
    codAmount: "",
  });

  const loadShipments = () => {
    fetch(`${API_URL}/api/staff/shipping/shipments`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ??
              "Không thể tải danh sách kiện hàng"
          );
        }

        setShipments(
          Array.isArray(result)
            ? result
            : result.data ?? []
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
    loadShipments();
  }, []);

  const createShipment = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `${API_URL}/api/staff/shipping/shipments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: Number(form.orderId),
            carrierName: form.carrierName,
            trackingCode: form.trackingCode,
            codAmount: form.codAmount
              ? Number(form.codAmount)
              : 0,
          }),
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          data.message ?? "Tạo kiện hàng thất bại"
        );
      }

      setForm({
        orderId: "",
        carrierName: "",
        trackingCode: "",
        codAmount: "",
      });

      loadShipments();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra"
      );
    }
  };

  const runAction = async (
    id: number,
    path: string,
    body?: unknown
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/api/staff/shipping/shipments/${id}/${path}`,
        {
          method:
            path === "tracking-code" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: body
            ? JSON.stringify(body)
            : undefined,
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

      loadShipments();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra"
      );
    }
  };

  const updateTrackingCode = (
    id: number,
    current: string
  ) => {
    const next = window.prompt(
      "Nhập mã vận đơn mới:",
      current ?? ""
    );

    if (next) {
      runAction(id, "tracking-code", {
        trackingCode: next,
      });
    }
  };

  return (
    <main className="min-h-screen bg-[#0d1519] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">

        <Link
          href="/staff/dashboard/shipping"
          className="text-xs text-sky-300"
        >
          ← Về dữ liệu vận chuyển
        </Link>
        <nav className="flex flex-wrap gap-2 text-sm mt-3">
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/dashboard">Tổng quan</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/orders">Đơn chờ giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/shipments">Kiện hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/exceptions">Ngoại lệ</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/shipping/cod">Đối soát COD</Link>
        </nav>

        <h1 className="text-3xl font-black text-white">
          Danh sách kiện hàng
        </h1>

        {error && (
          <p className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <form
          onSubmit={createShipment}
          className="grid gap-3 rounded-xl border-slate-800 bg-slate-900 p-5 md:grid-cols-5"
        >
          <input
            required
            value={form.orderId}
            onChange={(e) =>
              setForm({
                ...form,
                orderId: e.target.value,
              })
            }
            placeholder="Mã đơn (orderId)"
            className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />

          <input
            required
            value={form.carrierName}
            onChange={(e) =>
              setForm({
                ...form,
                carrierName: e.target.value,
              })
            }
            placeholder="Hãng vận chuyển"
            className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />

          <input
            required
            value={form.trackingCode}
            onChange={(e) =>
              setForm({
                ...form,
                trackingCode: e.target.value,
              })
            }
            placeholder="Mã vận đơn"
            className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />

          <input
            value={form.codAmount}
            onChange={(e) =>
              setForm({
                ...form,
                codAmount: e.target.value,
              })
            }
            placeholder="Tiền COD"
            className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />

          <button
            type="submit"
            className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Tạo kiện hàng
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border-slate-800 bg-slate-900">
          <table className="w-full text-sm">

            <thead className="bg-slate-950/60 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="p-3">
                  Mã đơn
                </th>

                <th className="p-3">
                  Hãng / Vận đơn
                </th>

                <th className="p-3">
                  Trạng thái
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
                  className="border-t border-slate-800 align-top"
                >
                  <td className="p-3">
                    <div className="font-semibold text-white">
                      {shipment.order?.orderCode ??
                        `#${shipment.order?.orderId ?? shipment.order?.id ?? shipment.id}`}
                    </div>

                    <div className="text-xs text-slate-500">
                      {shipment.order?.customerName ?? "-"}
                    </div>
                  </td>

                  <td className="p-3">
                    <div>
                      {shipment.carrierName ?? "-"}
                    </div>

                    <div className="text-xs text-slate-500">
                      {shipment.trackingCode ??
                        "Chưa có"}
                    </div>
                  </td>

                  <td className="p-3 text-xs font-bold text-sky-300">
                    {shipment.status}
                  </td>

                  <td className="p-3 text-right">
                    {Number(
                      shipment.codAmount ?? 0
                    ).toLocaleString("vi-VN")}{" "}
                    ₫

                    {shipment.codReconciled && (
                      <div className="text-xs text-emerald-400">
                        Đã đối soát
                      </div>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">

                      {(shipment.status === "PENDING" ||
                        shipment.status === "HANDED_OVER") && (
                        <button
                          onClick={() =>
                            updateTrackingCode(
                              shipment.id,
                              shipment.trackingCode
                            )
                          }
                          className="rounded border-sky-500/40 px-3 py-1 text-xs text-sky-200"
                        >
                          Sửa vận đơn
                        </button>
                      )}

                      {shipment.status === "PENDING" && (
                        <button
                          onClick={() =>
                            runAction(
                              shipment.id,
                              "handover"
                            )
                          }
                          className="rounded bg-sky-600 px-3 py-1 text-xs text-white"
                        >
                          Bàn giao
                        </button>
                      )}

                      {shipment.status === "HANDED_OVER" && (
                        <button
                          onClick={() =>
                            runAction(
                              shipment.id,
                              "shipping"
                            )
                          }
                          className="rounded bg-indigo-600 px-3 py-1 text-xs text-white"
                        >
                          Bắt đầu giao
                        </button>
                      )}

                      {[
                        "HANDED_OVER",
                        "IN_TRANSIT",
                      ].includes(shipment.status) && (
                        <button
                          onClick={() => {
                            const receiverName =
                              window.prompt(
                                "Tên người nhận:"
                              ) ?? "";

                            const imageUrl =
                              window.prompt(
                                "URL ảnh bằng chứng đã lưu (không phải upload file, có thể bỏ trống):"
                              ) ?? undefined;

                            if (receiverName) {
                              runAction(
                                shipment.id,
                                "proof",
                                {
                                  receiverName,
                                  imageUrl,
                                  note: window.prompt("Ghi chú giao hàng (không bắt buộc):") ?? "",
                                }
                              );
                            }
                          }}
                          className="rounded bg-emerald-600 px-3 py-1 text-xs text-white"
                        >
                          Giao thành công
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              ))}

              {shipments.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-400"
                  >
                    Chưa có kiện hàng nào.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </main>
  );
}