"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
const CART_STORAGE_KEY = "ettee_cart";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  color: string;
  size: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CustomerCheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM",
  });

  useEffect(() => {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      try {
        setItems(JSON.parse(raw));
      } catch {
        setItems([]);
      }
    }

    const profileRaw = window.localStorage.getItem("ettee_user");
    if (profileRaw) {
      try {
        const profile = JSON.parse(profileRaw);
        setCustomer((prev) => ({
          ...prev,
          fullName: profile.fullName || prev.fullName,
          email: profile.email || prev.email,
          phone: profile.phone || prev.phone,
        }));
      } catch {
        // noop
      }
    }
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const shippingFee = subtotal >= 20000000 ? 0 : 350000;
  const discount = 0;
  const total = subtotal + shippingFee - discount;

  const submitOrder = async () => {
    if (!items.length) {
      setMessage("Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = await apiClient.post<{ orderCode?: string }>("/api/orders/checkout", {
          customerName: customer.fullName || "Khách hàng ET.TEE",
          customerPhone: customer.phone || "0901234567",
          customerEmail: customer.email || "customer@example.com",
          shippingAddress: {
            province: "Hồ Chí Minh",
            district: "Quận 1",
            ward: "Phường Bến Nghé",
            street_address: customer.address,
          },
          paymentMethod: "cod",
          items: items.map((item) => ({ variantId: item.id, quantity: item.quantity })),
      });
      const orderCode = payload.orderCode || "ET-ORDER";
      window.localStorage.removeItem(CART_STORAGE_KEY);
      window.location.href = `/checkout/success?orderCode=${encodeURIComponent(orderCode)}`;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo đơn hàng");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-violet-400 font-bold">Checkout</p>
            <h1 className="text-3xl font-black text-white">Thanh toán & giao hàng</h1>
          </div>
          <Link href="/cart" className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm">
            ← Quay lại giỏ hàng
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Thông tin khách hàng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={customer.fullName}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                  placeholder="Họ và tên"
                />
                <input
                  value={customer.phone}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                  placeholder="Số điện thoại"
                />
                <div className="md:col-span-2">
                  <input
                    value={customer.email}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                    placeholder="Email"
                  />
                </div>
                <div className="md:col-span-2">
                  <textarea
                    value={customer.address}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                    placeholder="Địa chỉ giao hàng chi tiết"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Phương thức thanh toán</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "Thanh toán khi nhận hàng", value: "cod", active: true },
                  { label: "Ví điện tử", value: "e_wallet", active: false },
                  { label: "Chuyển khoản ngân hàng", value: "bank_transfer", active: false },
                ].map((method) => (
                  <label key={method.value} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-slate-200">
                    <input type="radio" name="payment-method" defaultChecked={method.active} />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Tóm tắt đơn hàng</h2>

              {items.length === 0 ? (
                <p className="text-slate-400 text-sm">Không có sản phẩm trong giỏ hàng.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.color} · Size {item.size} · x{item.quantity}</p>
                      </div>
                      <span className="font-bold text-amber-300">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4">
              <h2 className="text-xl font-bold text-white">Thanh toán</h2>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí ship</span>
                  <span>{shippingFee === 0 ? "Miễn phí" : formatCurrency(shippingFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giảm giá</span>
                  <span className="text-emerald-400">- {formatCurrency(discount)}</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-between text-xl font-black text-white">
                <span>Tổng cộng</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <button
                type="button"
                onClick={submitOrder}
                disabled={saving || !items.length}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold transition"
              >
                {saving ? "Đang xử lý..." : "Xác nhận đặt hàng"}
              </button>

              {message ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {message}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
