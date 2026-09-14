"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type OrderItem = {
  id: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
};

type OrderDetail = {
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: Record<string, unknown>;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  shippingDiscount: number;
  total: number;
  placedAt: string;
  items: OrderItem[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ orderCode: string }>();
  const orderCode = typeof params.orderCode === "string" ? params.orderCode : "";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderCode) {
        setError("Thiếu mã đơn hàng");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("ettee_access_token");
      try {
        const response = await fetch(`${API_BASE}/api/orders/my-orders/${orderCode}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Không thể tải chi tiết đơn hàng");
        }

        setOrder(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải chi tiết đơn hàng");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-300">
          Đang tải chi tiết đơn hàng...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-200">
          <h1 className="text-2xl font-black mb-2">Không thể xem đơn hàng</h1>
          <p>{error || "Đơn hàng không tồn tại hoặc bạn không có quyền truy cập."}</p>
          <Link href="/cart" className="mt-5 inline-block text-violet-300 hover:text-violet-200">
            ← Quay lại giỏ hàng
          </Link>
        </div>
      </div>
    );
  }

  const shippingAddress = order.shippingAddress as Record<string, string>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            ET.TEE FASHION
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <Link href="/products" className="hover:text-white">Sản phẩm</Link>
            <Link href="/cart" className="hover:text-white">Giỏ hàng</Link>
            <Link href="/profile" className="hover:text-white">Profile</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-violet-400 font-semibold">Order detail</p>
            <h1 className="text-3xl font-black text-white">{order.orderCode}</h1>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-[0.15em]">
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-xl font-bold text-white mb-4">Sản phẩm</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div>
                      <p className="font-bold text-white">{item.productNameSnapshot}</p>
                      <p className="text-xs text-slate-400">SKU: {item.skuSnapshot}</p>
                    </div>
                    <div className="text-right mt-2 md:mt-0">
                      <p className="text-sm text-slate-400">Số lượng: {item.quantity}</p>
                      <p className="font-bold text-amber-300">{formatCurrency(item.lineTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-xl font-bold text-white mb-4">Thông tin khách hàng</h2>
              <div className="space-y-2 text-sm text-slate-300">
                <p><span className="text-slate-500">Tên:</span> {order.customerName}</p>
                <p><span className="text-slate-500">SĐT:</span> {order.customerPhone}</p>
                <p><span className="text-slate-500">Email:</span> {order.customerEmail || "-"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-xl font-bold text-white mb-4">Địa chỉ giao hàng</h2>
              <div className="space-y-1 text-sm text-slate-300">
                <p>{shippingAddress.streetAddress || "-"}</p>
                <p>{shippingAddress.ward || ""} {shippingAddress.district || ""}</p>
                <p>{shippingAddress.province || ""}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-xl font-bold text-white mb-4">Tóm tắt thanh toán</h2>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between"><span>Tạm tính</span><span>{formatCurrency(order.subtotal)}</span></div>
                <div className="flex justify-between"><span>Phí vận chuyển</span><span>{formatCurrency(order.shippingFee)}</span></div>
                <div className="flex justify-between"><span>Giảm giá</span><span>- {formatCurrency(order.discountTotal)}</span></div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-base font-bold text-white">
                  <span>Tổng cộng</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
