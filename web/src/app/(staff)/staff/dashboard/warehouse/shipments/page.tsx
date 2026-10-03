"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { staffAction, staffList } from "@/lib/staff-api";
import { toast } from "sonner";
import {
  Truck, CheckCircle2, X, RefreshCw, Package, MapPin,
  Phone, Clock, ArrowRight, Search, Hash, User
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Order = {
  id?: number;
  orderId?: number;
  orderCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingProvider?: string;
  status: string;
  totalAmount?: number;
  itemCount?: number;
  packedAt?: string;
};

// ─── Nav ─────────────────────────────────────────────────────────────────────
function WarehouseNav({ active }: { active: string }) {
  const links = [
    { href: "/staff/dashboard/warehouse", label: "Tổng quan" },
    { href: "/staff/dashboard/warehouse/orders", label: "Đơn cần xử lý" },
    { href: "/staff/dashboard/warehouse/receiving", label: "Nhập kho" },
    { href: "/staff/dashboard/warehouse/inventory", label: "Tồn kho" },
    { href: "/staff/dashboard/warehouse/adjustments", label: "Duyệt chênh lệch" },
    { href: "/staff/dashboard/warehouse/reservations", label: "Giữ hàng" },
    { href: "/staff/dashboard/warehouse/stock-count", label: "Kiểm kê" },
    { href: "/staff/dashboard/warehouse/picking", label: "Lấy hàng" },
    { href: "/staff/dashboard/warehouse/packing", label: "Đóng gói" },
    { href: "/staff/dashboard/warehouse/shipments", label: "Bàn giao" },
    { href: "/staff/dashboard/warehouse/replenishment", label: "Đề xuất nhập thêm" },
  ];
  return (
    <nav className="flex flex-wrap gap-2 text-xs font-semibold">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg border px-3 py-2 transition ${
            l.href === active
              ? "border-amber-300 bg-amber-50 text-amber-800 font-bold"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const PROVIDER_COLORS: Record<string, string> = {
  GHN:  "bg-rose-100 text-rose-800 border-rose-200",
  GHTK: "bg-blue-100 text-blue-800 border-blue-200",
  "J&T": "bg-amber-100 text-amber-800 border-amber-200",
  VNPT: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function WarehouseHandoverPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await staffList<Order>("/api/staff/warehouse/orders", signal);
      setOrders(data);
    } catch {
      if (!signal?.aborted) {
        setOrders([]);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const openConfirmModal = (order: Order) => {
    setConfirmOrder(order);
    setTrackingCode("");
  };

  const executeHandover = async () => {
    if (!confirmOrder) return;
    const id = confirmOrder.id ?? confirmOrder.orderId;
    if (!id) return;

    setIsSubmitting(true); setBusy(id);
    try {
      await staffAction(`/api/staff/warehouse/orders/${id}/handover`, "POST", {
        trackingCode: trackingCode.trim() || undefined,
        shippingProvider: confirmOrder.shippingProvider,
      });
      toast.success(`✅ Đã bàn giao đơn ${confirmOrder.orderCode ?? `#${id}`} cho ${confirmOrder.shippingProvider || "hãng vận chuyển"}`);
      setConfirmOrder(null);
      setOrders(prev => prev.filter(o => (o.id ?? o.orderId) !== id));
    } catch (err: any) {
      toast.error(err?.message ?? `Không thể bàn giao đơn #${id}`);
    } finally {
      setBusy(null); setIsSubmitting(false);
    }
  };

  const packed = orders.filter(o => o.status === "PACKED" || o.status === "READY_TO_SHIP");

  const filtered = packed.filter(o =>
    !searchQuery.trim() ||
    (o.orderCode ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customerName ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.shippingProvider ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handedToday = orders.filter(o => o.status === "HANDED_TO_CARRIER").length;

  const fmt = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) +
        " " +
        new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
      : "—";

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8 space-y-6 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/staff/dashboard/warehouse" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:underline">
          ← Bộ phận kho
        </Link>

        <WarehouseNav active="/staff/dashboard/warehouse/shipments" />

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Truck className="w-7 h-7 text-amber-600" />
                <span>Bàn Giao Hãng Vận Chuyển</span>
              </h1>
              <span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                KHO HÀNG
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Đơn đã đóng gói (PACKED) sẵn sàng bàn giao. Xác nhận để chuyển trạng thái sang <span className="text-sky-700 font-mono font-bold">HANDED_TO_CARRIER</span>.
            </p>
          </div>

          <button
            onClick={() => void load()}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Chờ bàn giao", value: packed.length, color: "text-amber-800", bg: "bg-amber-50 border-amber-100", icon: Package },
            { label: "Đã bàn giao hôm nay", value: handedToday, color: "text-emerald-800", bg: "bg-emerald-50 border-emerald-100", icon: CheckCircle2 },
            { label: "Hãng GHN", value: packed.filter(o => o.shippingProvider === "GHN").length, color: "text-rose-800", bg: "bg-rose-50 border-rose-100", icon: Truck },
            { label: "Hãng khác", value: packed.filter(o => o.shippingProvider !== "GHN").length, color: "text-sky-800", bg: "bg-sky-50 border-sky-100", icon: ArrowRight },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className={`rounded-2xl border p-4 ${bg} bg-white shadow-sm`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-slate-500 font-medium">{label}</span>
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm mã đơn, tên KH, hãng..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
            <span className="text-xs font-medium">Đang tải danh sách đơn chờ bàn giao...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const id = order.id ?? order.orderId;
              const providerCls = PROVIDER_COLORS[order.shippingProvider ?? ""] ?? "bg-slate-100 text-slate-700 border-slate-200";
              return (
                <div
                  key={id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Left info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-black text-slate-900 text-base font-mono">
                          {order.orderCode ?? `#${id}`}
                        </span>
                        {order.shippingProvider && (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${providerCls}`}>
                            {order.shippingProvider}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          PACKED
                        </span>
                        {order.itemCount != null && (
                          <span className="text-xs text-slate-400">{order.itemCount} sản phẩm</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold">{order.customerName || "Khách hàng"}</span>
                        </div>
                        {order.customerPhone && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono">{order.customerPhone}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2 text-slate-500 sm:col-span-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-xs leading-relaxed">{order.shippingAddress || "Chưa có địa chỉ giao"}</span>
                        </div>
                        {order.packedAt && (
                          <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Đóng gói lúc {fmt(order.packedAt)}</span>
                          </div>
                        )}
                      </div>

                      {order.totalAmount != null && (
                        <p className="text-xs font-bold text-emerald-700 font-mono">
                          {order.totalAmount.toLocaleString("vi-VN")}₫
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        disabled={id == null || busy !== null}
                        onClick={() => id != null && openConfirmModal(order)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 transition flex items-center gap-2 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Xác nhận bàn giao
                      </button>
                      <Link
                        href="/staff/dashboard/shipping/orders"
                        className="text-xs text-sky-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        Xem theo dõi <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && !loading && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 text-base">Không có đơn chờ bàn giao</p>
                <p className="text-xs mt-1 text-slate-400">Tất cả đơn đã được bàn giao cho hãng vận chuyển.</p>
              </div>
            )}
          </div>
        )}

        {/* Handover Confirm Modal */}
        {confirmOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-sm text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Xác nhận bàn giao
                </h3>
                <button onClick={() => setConfirmOrder(null)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {/* Order summary */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Đơn hàng</span>
                    <span className="font-mono font-bold text-slate-900">{confirmOrder.orderCode ?? `#${confirmOrder.id}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Khách hàng</span>
                    <span className="font-semibold text-slate-900">{confirmOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hãng vận chuyển</span>
                    <span className="font-bold text-sky-700">{confirmOrder.shippingProvider || "Chưa rõ"}</span>
                  </div>
                  {confirmOrder.shippingAddress && (
                    <div className="pt-1 border-t border-slate-200 text-xs text-slate-500">
                      <MapPin className="inline w-3 h-3 mr-1" />
                      {confirmOrder.shippingAddress}
                    </div>
                  )}
                </div>

                {/* Tracking code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      Mã vận đơn (tracking code)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={e => setTrackingCode(e.target.value)}
                    placeholder="Nhập mã vận đơn từ hãng..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Tuỳ chọn — nhập nếu hãng đã cung cấp mã tracking</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setConfirmOrder(null)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null || isSubmitting}
                    onClick={() => void executeHandover()}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    {isSubmitting ? "Đang bàn giao..." : "Xác nhận bàn giao"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


