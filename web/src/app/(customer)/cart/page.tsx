"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";
const CART_STORAGE_KEY = "ettee_cart";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  image: string;
  color: string;
  size: string;
};

const recommendations = [
  { name: "Everyday Knit Polo", price: 4590000, tag: "Phù hợp với áo khoác" },
  { name: "Street Runner Sneakers", price: 3290000, tag: "Phù hợp với jeans" },
  { name: "Canvas Crossbody Bag", price: 2190000, tag: "Bổ sung outfit" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CustomerCartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{ fullName?: string; email?: string; phone?: string } | null>(null);
  const [orderHistory, setOrderHistory] = useState<Array<{ orderCode: string; status: string; total: number; placedAt: string }>>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      try {
        setCartItems(JSON.parse(raw));
      } catch {
        setCartItems([]);
      }
    }

    const savedUser = window.localStorage.getItem("ettee_user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCustomerProfile({
          fullName: parsedUser.fullName,
          email: parsedUser.email || parsedUser.username,
          phone: parsedUser.phone,
        });
      } catch {
        // ignore malformed stored profile
      }
    }

    const token = window.localStorage.getItem("ettee_access_token");
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((payload) => {
          if (payload.success) {
            setCustomerProfile(payload.data);
          }
        })
        .catch(() => undefined);

      fetch(`${API_BASE}/api/orders/my-orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((payload) => {
          if (payload.success) {
            setOrderHistory(payload.data ?? []);
          }
        })
        .catch(() => undefined);
    }
  }, []);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );
  const shipping = subtotal > 20000000 ? 0 : 350000;
  const discount = 1500000;
  const total = subtotal + shipping - discount;

  const updateQuantity = (id: string, nextQuantity: number) => {
    const normalized = Math.max(0, nextQuantity);
    setCartItems((current) => {
      const next = current
        .map((item) => (item.id === id ? { ...item, quantity: normalized } : item))
        .filter((item) => item.quantity > 0);
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleCheckout = async () => {
    if (!cartItems.length) {
      setCheckoutMessage("Giỏ hàng đang trống");
      return;
    }

    setCheckoutMessage(null);
    setCheckingOut(true);

    try {
      const token = localStorage.getItem("ettee_access_token");
      const profile = customerProfile ?? {
        fullName: "Khách hàng ET.TEE",
        email: "customer@example.com",
        phone: "0901234567",
      };

      const payload = {
        customerName: profile.fullName || "Khách hàng ET.TEE",
        customerPhone: profile.phone || "0901234567",
        customerEmail: profile.email || "customer@example.com",
        shippingAddress: {
          province: "Hồ Chí Minh",
          district: "Quận 1",
          ward: "Phường Bến Nghé",
          streetAddress: "123 Lê Lợi",
        },
        paymentMethod: "cod",
        items: cartItems.map((item) => ({
          variantId: item.id,
          quantity: item.quantity,
        })),
      };

      const response = await fetch(`${API_BASE}/api/orders/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Thanh toán thất bại");
      }

      const orderCode = result.data.orderCode;
      setCheckoutMessage(`Đặt hàng thành công. Mã đơn: ${orderCode}`);
      setCartItems([]);
      window.localStorage.removeItem(CART_STORAGE_KEY);
      window.localStorage.setItem("ettee_last_order_code", orderCode);
      window.location.href = `/checkout/success?orderCode=${encodeURIComponent(orderCode)}`;
    } catch (error) {
      setCheckoutMessage(error instanceof Error ? error.message : "Thanh toán thất bại");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              ET.TEE FASHION
            </Link>
            <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
              Giỏ hàng
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="/" className="hover:text-violet-400 transition-colors">Trang chủ</Link>
            <Link href="/products" className="hover:text-violet-400 transition-colors">Sản phẩm</Link>
            <Link href="/cart" className="text-white font-semibold">Giỏ hàng</Link>
            <Link href="/profile" className="hover:text-violet-400 transition-colors">Profile</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-violet-400 font-semibold">Shopping bag</p>
            <h1 className="text-3xl font-extrabold text-white">Giỏ hàng của bạn</h1>
          </div>
          <Link href="/products" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700">
            ← Tiếp tục mua sắm
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_0.9fr] gap-8">
          <section className="space-y-4">
            {cartItems.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-300">
                Giỏ hàng của bạn đang trống.
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-950 border border-slate-800 p-4 flex gap-4">
                  <div className="w-28 h-28 rounded-xl border border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-xs font-bold text-slate-400">
                    {item.image}
                  </div>

                  <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">{item.brand}</p>
                      <h3 className="text-lg font-bold text-white">{item.name}</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                        <span>Màu: {item.color}</span>
                        <span>•</span>
                        <span>Size: {item.size}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-2 text-lg text-slate-300 hover:bg-slate-800"
                        >
                          -
                        </button>
                        <span className="min-w-10 text-center text-sm font-semibold text-white">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-3 py-2 text-lg text-slate-300 hover:bg-slate-800"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right min-w-[120px]">
                        <p className="text-xs text-slate-500">Đơn giá</p>
                        <p className="font-bold text-amber-300">{formatCurrency(item.price)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 space-y-4">
              <h2 className="text-lg font-bold text-white">Tóm tắt đơn hàng</h2>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <span>{shipping === 0 ? "Miễn phí" : formatCurrency(shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Khuyến mãi</span>
                  <span className="text-emerald-400">- {formatCurrency(discount)}</span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-between text-base font-bold text-white">
                <span>Tổng cộng</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <button
                type="button"
                disabled={checkingOut || cartItems.length === 0}
                onClick={handleCheckout}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold text-sm transition"
              >
                {checkingOut ? "Đang đặt hàng..." : "Tiến hành thanh toán"}
              </button>

              {customerProfile ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-white">Thông tin khách hàng</p>
                  <p>{customerProfile.fullName}</p>
                  <p>{customerProfile.phone}</p>
                  <p>{customerProfile.email}</p>
                </div>
              ) : null}

              {checkoutMessage ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
                  {checkoutMessage}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5">
              <h3 className="text-md font-bold text-white mb-3">Mã giảm giá</h3>
              <div className="flex gap-2">
                <input
                  value="ETTEE10"
                  readOnly
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                />
                <button className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold">
                  Áp dụng
                </button>
              </div>
            </div>
          </aside>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Lịch sử đơn hàng</h2>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            {orderHistory.length === 0 ? (
              <p className="text-sm text-slate-400">Bạn chưa có đơn hàng nào.</p>
            ) : (
              orderHistory.map((order) => (
                <div key={order.orderCode} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3">
                  <div>
                    <p className="font-semibold text-white">{order.orderCode}</p>
                    <p className="text-xs text-slate-400">{new Date(order.placedAt).toLocaleString("vi-VN")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-amber-300">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-violet-300">{order.status}</p>
                    </div>
                    <Link
                      href={`/orders/${order.orderCode}`}
                      className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Có thể bạn còn thích</h2>
            <Link href="/products" className="text-sm text-violet-400 hover:text-violet-300">
              Xem thêm →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((item) => (
              <div key={item.name} className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-4">
                <div className="h-40 rounded-xl border border-slate-800 bg-gradient-to-br from-violet-900/40 via-slate-900 to-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                  PRODUCT
                </div>
                <div>
                  <p className="text-xs text-violet-400 font-semibold">Recommended</p>
                  <h3 className="text-lg font-bold text-white">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{item.tag}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-bold">{formatCurrency(item.price)}</span>
                  <button className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-white">
                    Thêm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
