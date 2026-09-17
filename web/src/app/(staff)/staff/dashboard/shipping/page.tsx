"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = "";

type Shipment = {
  id?: number;
  status?: string;
  trackingCode?: string;
  codAmount?: number;
  codReconciled?: boolean;
};

type ShippingException = { exceptionId?: number; status?: string };

export default function StaffShippingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [exceptions, setExceptions] = useState<ShippingException[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/staff/shipping/shipments`, { cache: "no-store" }).then(async (response) => {
        const payload = await response.json();
        return Array.isArray(payload) ? payload : payload.data ?? [];
      }),
      fetch(`${API_URL}/api/staff/shipping/exceptions`, { cache: "no-store" }).then(async (response) => {
        const payload = await response.json();
        return Array.isArray(payload) ? payload : payload.data ?? [];
      }),
    ])
      .then(([shipmentData, exceptionData]) => {
        setShipments(shipmentData);
        setExceptions(exceptionData);
      })
      .catch((requestError: unknown) =>
        setError(requestError instanceof Error ? requestError.message : "Không thể kết nối backend.")
      );
  }, []);

  const pendingShipments = shipments.filter(
    (item) => item.status === "PENDING" || item.status === "HANDED_OVER"
  ).length;
  const openExceptions = exceptions.filter((item) => item.status === "OPEN").length;
  const pendingCod = shipments.filter(
    (item) => item.status === "DELIVERED" && Number(item.codAmount ?? 0) > 0 && !item.codReconciled
  ).length;

  const tasks = [
    "Nhận danh sách kiện đã đóng gói",
    "Tạo hoặc gắn mã vận đơn",
    "Xác nhận bàn giao",
    "Cập nhật ngoại lệ giao hàng",
    "Đính kèm bằng chứng giao hàng",
    "Đối soát COD nếu có",
  ];

  return (
    <main className="min-h-screen bg-[#0d1519] px-5 py-8 text-slate-100 md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="relative overflow-hidden rounded-3xl border-sky-300/20 bg-gradient-to-br from-sky-400/15 via-slate-900 to-[#0d1519] p-7 md:p-10">
          <div className="relative z-10">
            <header className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">
                ET.TEE / KHU VỰC GIAO HÀNG
              </p>
              <Link
                href="/staff/dashboard"
                className="rounded-lg bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-300/20"
              >
                Ve trang tong quan
              </Link>
            </header>
            <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight text-white md:text-6xl">
              Điều phối giao hàng
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Nhận kiện đã đóng gói, cập nhật mã vận đơn, xác nhận bàn giao và xử lý các trường hợp phát sinh.
            </p>
            <nav className="mt-7 flex flex-wrap gap-3">
              {["dashboard", "orders", "shipments", "exceptions", "cod"].map((item) => (
                <Link
                  key={item}
                  href={`/staff/dashboard/shipping/${item}`}
                  className="border border-sky-300/30 bg-sky-300/10 px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-300/20"
                >
                  {item === "dashboard"
                    ? "Tổng quan"
                    : item === "orders"
                      ? "Đơn chờ giao"
                      : item === "shipments"
                      ? "Kiện hàng"
                      : item === "exceptions"
                        ? "Ngoại lệ"
                        : "Đối soát thu hộ"}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Stat label="Kiện chờ xử lý" value={String(pendingShipments)} note="PENDING / HANDED_OVER" />
          <Stat label="Ngoại lệ giao hàng" value={String(openExceptions)} note="Đang mở" />
          <Stat label="Chờ đối soát thu hộ" value={String(pendingCod)} note="Kiện COD đã giao" />
        </section>

        {error && (
          <section className="rounded-2xl border-red-900 bg-red-950/30 p-5">
            <p className="text-sm text-red-300">{error}</p>
          </section>
        )}

        <section className="rounded-2xl border-slate-800 bg-slate-900/80 p-6">
          <h2 className="text-xl font-bold text-white">Việc cần xử lý</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {tasks.map((task, index) => (
              <div key={task} className="rounded-xl border-slate-800 bg-[#111b20] p-4">
                <span className="text-xs font-bold text-sky-300">{String(index + 1).padStart(2, "0")}</span>
                <p className="mt-3 text-sm font-semibold text-slate-200">{task}</p>
                <p className="mt-2 text-xs text-slate-500">Theo shipment_status và sự kiện giao hàng</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border-slate-800 bg-slate-900/80 p-6">
          <p className="text-sm text-slate-400">
            Dữ liệu lấy từ bảng shipments, shipment_events, shipping_exceptions và cod_settlement_items.
          </p>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border-slate-800 bg-slate-900/80 p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-3 text-xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-sky-300">{note}</p>
    </div>
  );
}
