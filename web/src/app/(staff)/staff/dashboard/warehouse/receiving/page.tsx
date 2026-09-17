"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

const API_URL =
  "";

type Inventory = {
  id: number;
  productId: number;
  productName: string;
  warehouseLocation: string;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
};

export default function WarehouseReceivingPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    productId: "",
    productName: "",
    quantity: "",
    location: "MAIN",
  });

  const loadInventory = () => {
    fetch(`${API_URL}/api/staff/warehouse/inventory`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error("Không thể tải tồn kho");
        }

        setItems(
          Array.isArray(data)
            ? data
            : data.data ?? []
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
    loadInventory();
  }, []);

  const submitInbound = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `${API_URL}/api/staff/warehouse/inbound`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: Number(form.productId),
            productName: form.productName,
            quantity: Number(form.quantity),
            location: form.location,
          }),
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          data.message ?? "Nhập kho thất bại"
        );
      }

      setForm({
        productId: "",
        productName: "",
        quantity: "",
        location: "MAIN",
      });

      loadInventory();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra"
      );
    }
  };

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
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/stock-count">Kiểm kê</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/inventory">Tồn kho</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/adjustments">Duyệt chênh lệch</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/reservations">Giữ hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/picking">Lấy hàng</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/packing">Đóng gói</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/shipments">Bàn giao</Link>
          <Link className="rounded-lg border border-slate-700 px-3 py-2" href="/staff/dashboard/warehouse/replenishment">Đề xuất nhập thêm</Link>
        </nav>

        <h1 className="text-3xl font-black text-white">
          Nhập kho
        </h1>

        {error && (
          <p className="rounded border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {notice && <p role="status" className="rounded border border-emerald-700 bg-emerald-950/40 p-3 text-sm text-emerald-200">{notice}</p>}

        <form
          onSubmit={submitInbound}
          className="grid gap-3 rounded-xl border-slate-800 bg-slate-900 p-5 md:grid-cols-5"
        >
          <input
            required
            value={form.productId}
            onChange={(e) =>
              setForm({
                ...form,
                productId: e.target.value,
              })
            }
            placeholder="Mã sản phẩm"
            className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />

          <input
            required
            value={form.productName}
            onChange={(e) =>
              setForm({
                ...form,
                productName: e.target.value,
              })
            }
            placeholder="Tên sản phẩm"
            className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />

          <input
            required
            type="number"
            min={1}
            value={form.quantity}
            onChange={(e) =>
              setForm({
                ...form,
                quantity: e.target.value,
              })
            }
            placeholder="Số lượng"
            className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />

          <input
            value={form.location}
            onChange={(e) =>
              setForm({
                ...form,
                location: e.target.value,
              })
            }
            placeholder="Vị trí (vd: MAIN)"
            className="rounded border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />

          <button
            type="submit"
            className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Nhập kho
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border-slate-800 bg-slate-900">
          <table className="w-full text-sm">

            <thead className="bg-slate-950/60 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="p-3">
                  Sản phẩm
                </th>

                <th className="p-3">
                  Vị trí
                </th>

                <th className="p-3 text-right">
                  Tồn kho
                </th>

                <th className="p-3 text-right">Khả dụng</th>
                <th className="p-3">Đối chiếu</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-800"
                >
                  <td className="p-3 text-white">
                    {item.productName ?? "-"}
                  </td>

                  <td className="p-3">
                    {item.warehouseLocation ?? "-"}
                  </td>

                  <td className="p-3 text-right">
                    {item.quantityOnHand}
                  </td>

                  <td className="p-3 text-right font-semibold">
                    {item.quantityOnHand -
                      item.quantityReserved}
                  </td>
                  <td className="p-3"><button type="button" className="rounded bg-sky-700 px-3 py-1 text-xs" onClick={async () => {
                    const input = window.prompt(`Kiểm đếm thực tế: ${item.productName}`);
                    if (input === null) return;
                    const actualQuantity = Number(input);
                    if (!Number.isSafeInteger(actualQuantity) || actualQuantity < 0) { setError("Số lượng kiểm đếm phải là số nguyên không âm."); return; }
                    try {
                      const response = await fetch(`/api/staff/warehouse/inbound/${item.id}/count`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ actualQuantity }),
                      });
                      const result = await response.json();
                      if (!response.ok) throw new Error(result.message || "Không thể kiểm đếm.");
                      setError(""); setNotice(`Kiểm đếm ${item.productName}: thực tế ${actualQuantity}, chênh lệch ${result.difference}. Đây chỉ là đối chiếu, chưa cập nhật tồn. Nếu có chênh lệch, hãy tạo phiếu điều chỉnh.`);
                    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể kiểm đếm."); }
                  }}>Kiểm đếm</button></td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-400"
                  >
                    Chưa có dữ liệu tồn kho.
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