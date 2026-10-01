"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import {
  ShoppingCart, DollarSign, Clock, CheckCircle2, RefreshCw, ArrowUpRight,
  PackageCheck, AlertTriangle, Check, Truck, RotateCcw, Inbox, Timer,
} from "lucide-react";

/* ───────────── types ───────────── */
interface OrderItem {
  id: number;
  orderCode: string;
  customerName: string;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  createdAt: string;
  slaDeadline?: string;
}

interface DashboardSummary {
  countByStatus: Record<string, number>;
  totalOrders: number;
  todayCount: number;
  deliveredRevenue: number | null;
  todayRevenue: number | null;
  slaWarningCount: number;
  urgentOrders: OrderItem[];
  recentOrders: OrderItem[];
}

/* ───────────── order status catalogue (khớp enum OrderStatus backend) ───────────── */
// Chi PENDING_CONFIRMATION moi xac nhan duoc; PENDING_PAYMENT dang cho khach thanh toan.
const AWAITING = ["PENDING_CONFIRMATION"];
const IN_PROGRESS = ["CONFIRMED", "PICKING", "PACKED", "HANDED_TO_CARRIER", "SHIPPING"];
const RETURNS = ["RETURN_REQUESTED", "RETURNED", "REFUNDED"];

const STATUS_META: Record<string, { label: string; cls: string; bar: string }> = {
  PENDING_PAYMENT:      { label: "Chờ thanh toán",   cls: "bg-orange-50 text-orange-700 border-orange-200", bar: "bg-orange-400" },
  PENDING_CONFIRMATION: { label: "Chờ xác nhận",     cls: "bg-amber-50 text-amber-700 border-amber-200",    bar: "bg-amber-400" },
  CONFIRMED:            { label: "Đã xác nhận",      cls: "bg-blue-50 text-blue-700 border-blue-200",       bar: "bg-blue-400" },
  PICKING:              { label: "Đang lấy hàng",    cls: "bg-indigo-50 text-indigo-700 border-indigo-200", bar: "bg-indigo-400" },
  PACKED:               { label: "Đã đóng gói",      cls: "bg-violet-50 text-violet-700 border-violet-200", bar: "bg-violet-400" },
  HANDED_TO_CARRIER:    { label: "Đã bàn giao ĐVVC", cls: "bg-sky-50 text-sky-700 border-sky-200",          bar: "bg-sky-400" },
  SHIPPING:             { label: "Đang giao hàng",   cls: "bg-cyan-50 text-cyan-700 border-cyan-200",       bar: "bg-cyan-400" },
  DELIVERED:            { label: "Đã giao",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
  CANCELLED:            { label: "Đã hủy",           cls: "bg-rose-50 text-rose-700 border-rose-200",       bar: "bg-rose-400" },
  RETURN_REQUESTED:     { label: "Yêu cầu trả hàng", cls: "bg-pink-50 text-pink-700 border-pink-200",       bar: "bg-pink-400" },
  RETURNED:             { label: "Đã trả hàng",      cls: "bg-slate-100 text-slate-700 border-slate-200",   bar: "bg-slate-400" },
  REFUNDED:             { label: "Đã hoàn tiền",     cls: "bg-slate-100 text-slate-700 border-slate-200",   bar: "bg-slate-400" },
  DRAFT:                { label: "Nháp",             cls: "bg-slate-50 text-slate-500 border-slate-200",    bar: "bg-slate-300" },
};

const statusMeta = (s: string) =>
  STATUS_META[s] ?? { label: s, cls: "bg-slate-100 text-slate-700 border-slate-200", bar: "bg-slate-300" };

/* ───────────── helpers ───────────── */
const fmtVnd = (v: number) => (v || 0).toLocaleString("vi-VN") + "₫";

const fmtMoneyShort = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)} tỷ₫`
  : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M₫`
  : fmtVnd(v);

const fmtDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const timeAgo = (s?: string) => {
  if (!s) return "";
  const diff = Date.now() - new Date(s).getTime();
  if (isNaN(diff) || diff < 0) return "";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
};

const normalize = (o: any): OrderItem => ({
  id: o.id ?? o.orderId,
  orderCode: o.orderCode || `#${o.id ?? o.orderId}`,
  customerName: o.customerName || o.address?.fullName || "Khách hàng",
  totalAmount: Number(o.totalAmount ?? o.total ?? 0),
  status: String(o.status ?? o.orderStatus ?? "").toUpperCase(),
  paymentStatus: o.paymentStatus,
  createdAt: o.createdAt || "",
  slaDeadline: o.slaDeadline || undefined,
});

/* ════════════════════════════════════════════ */
export default function SalesDashboardPage() {
  const { hasPermission } = usePermissions();
  const canVerify = hasPermission("VERIFY_ORDER");

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const load = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.get<any>("/api/staff/sales/dashboard");
      setSummary({
        countByStatus: data?.countByStatus ?? {},
        totalOrders: Number(data?.totalOrders ?? 0),
        todayCount: Number(data?.todayCount ?? 0),
        deliveredRevenue: data?.deliveredRevenue == null ? null : Number(data.deliveredRevenue),
        todayRevenue: data?.todayRevenue == null ? null : Number(data.todayRevenue),
        slaWarningCount: Number(data?.slaWarningCount ?? 0),
        urgentOrders: (data?.urgentOrders ?? []).map(normalize),
        recentOrders: (data?.recentOrders ?? []).map(normalize),
      });
    } catch (e: any) {
      setLoadError(e?.message || "Không thể tải dữ liệu tổng quan");
    } finally {
      setLastSync(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = summary?.countByStatus ?? {};
  const sumOf = (list: string[]) => list.reduce((n, s) => n + (counts[s] || 0), 0);
  const stats = {
    awaiting: sumOf(AWAITING),
    awaitingPayment: counts["PENDING_PAYMENT"] || 0,
    inProgress: sumOf(IN_PROGRESS),
    returnCount: sumOf(RETURNS),
  };
  const urgent = summary?.urgentOrders ?? [];
  const recent = summary?.recentOrders ?? [];
  const slaCount = summary?.slaWarningCount ?? 0;
  const firstLoad = loading && !summary;
  const canSeeRevenue = summary?.deliveredRevenue != null;

  const breakdown = Object.entries(counts)
    .filter(([s, c]) => s !== "DRAFT" && c > 0)
    .sort((a, b) => b[1] - a[1]);

  /* ── quick confirm ── */
  const handleConfirm = async (o: OrderItem) => {
    if (confirmingId) return;
    try {
      setConfirmingId(o.id);
      await apiClient.post(`/api/staff/sales/orders/${o.id}/confirm`, {});
      toast.success(`Đã xác nhận đơn ${o.orderCode}`);
      await load(true);
    } catch (e: any) {
      toast.error(e?.message || "Không thể xác nhận đơn hàng");
    } finally {
      setConfirmingId(null);
    }
  };

  const maxBreakdown = Math.max(1, ...breakdown.map(([, c]) => c));

  /* ════════════════ RENDER ════════════════ */
  return (
    <main className="min-h-screen bg-slate-50/60 p-6 md:p-8 text-slate-900 font-sans antialiased space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tổng quan Bán hàng"
        subtitle={lastSync ? `Cập nhật lúc ${lastSync.toLocaleTimeString("vi-VN")}` : "Đang tải dữ liệu..."}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Đang tải..." : "Làm mới"}</span>
            </button>
            <Link
              href="/staff/dashboard/sales/orders"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-sm font-semibold text-white shadow-sm shadow-red-200 hover:bg-red-700 hover:shadow-md active:scale-[0.98] transition"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Quản lý đơn hàng</span>
              <ArrowUpRight className="w-4 h-4 opacity-80" />
            </Link>
          </div>
        }
      />

      {loadError && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{loadError}</span>
          <button onClick={load} className="font-semibold underline">Thử lại</button>
        </div>
      )}

      {/* SLA alert */}
      {slaCount > 0 && (
        <Link
          href="/staff/dashboard/sales/orders?filter=sla"
          className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl hover:bg-rose-100/60 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-800">{slaCount} đơn sắp hoặc đã quá hạn SLA</p>
            <p className="text-xs text-rose-600">Cần xử lý trong vòng 2 giờ tới để tránh vi phạm cam kết giao hàng.</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-rose-500" />
        </Link>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Đơn hôm nay", value: summary?.todayCount ?? 0, sub: `${summary?.totalOrders ?? 0} đơn tổng cộng`, icon: Inbox, tone: "bg-blue-50 text-blue-600" },
          { label: "Chờ xác nhận", value: stats.awaiting, sub: stats.awaitingPayment > 0 ? `+${stats.awaitingPayment} đơn chờ khách thanh toán` : "Cần xử lý ngay", icon: Clock, tone: "bg-amber-50 text-amber-600", href: "/staff/dashboard/sales/orders?filter=new" },
          { label: "Đang xử lý", value: stats.inProgress, sub: "Từ xác nhận đến giao hàng", icon: PackageCheck, tone: "bg-indigo-50 text-indigo-600" },
          canSeeRevenue
            ? { label: "Doanh thu đã giao", value: fmtMoneyShort(summary?.deliveredRevenue ?? 0), sub: `Hôm nay: ${fmtMoneyShort(summary?.todayRevenue ?? 0)}`, icon: DollarSign, tone: "bg-emerald-50 text-emerald-600" }
            : { label: "Đã giao thành công", value: counts["DELIVERED"] || 0, sub: "Tổng số đơn hoàn tất", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
        ].map(k => {
          const body = (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 h-full hover:border-slate-300 hover:shadow-sm transition">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.tone}`}>
                  <k.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{firstLoad ? "…" : k.value}</p>
              <p className="text-xs text-slate-400 mt-2">{k.sub}</p>
            </div>
          );
          return k.href ? <Link key={k.label} href={k.href}>{body}</Link> : <div key={k.label}>{body}</div>;
        })}
      </div>

      {/* Work queue + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Cần xử lý ngay
              <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                {stats.awaiting}
              </span>
            </h2>
            {stats.awaiting > urgent.length && (
              <Link href="/staff/dashboard/sales/orders?filter=new" className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5">
                Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {firstLoad ? (
            <div className="p-5 space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : urgent.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Không có đơn nào đang chờ xác nhận</p>
              <p className="text-xs text-slate-400 mt-0.5">Đơn mới sẽ xuất hiện tại đây ngay khi khách đặt hàng.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {urgent.map(o => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{o.orderCode}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta(o.status).cls}`}>
                        {statusMeta(o.status).label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {o.customerName} · {fmtVnd(o.totalAmount)} · {timeAgo(o.createdAt)}
                    </p>
                  </div>
                  <Link
                    href="/staff/dashboard/sales/orders"
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                  >
                    Chi tiết
                  </Link>
                  {canVerify && o.status === "PENDING_CONFIRMATION" && (
                    <button
                      onClick={() => handleConfirm(o)}
                      disabled={confirmingId === o.id}
                      className="inline-flex items-center gap-1 text-xs font-bold text-white bg-primary hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {confirmingId === o.id ? "Đang xử lý..." : "Xác nhận"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Phân bổ trạng thái</h2>
            {breakdown.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có dữ liệu đơn hàng.</p>
            ) : (
              <div className="space-y-3">
                {breakdown.map(([status, count]) => (
                  <div key={status}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">{statusMeta(status).label}</span>
                      <span className="font-mono font-bold text-slate-900">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${statusMeta(status).bar}`} style={{ width: `${(count / maxBreakdown) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Lối tắt</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/staff/dashboard/sales/orders", icon: ShoppingCart, label: "Tất cả đơn", tone: "bg-blue-50 text-blue-700" },
                { href: "/staff/dashboard/sales/orders?filter=new", icon: Clock, label: "Đơn mới", tone: "bg-amber-50 text-amber-700" },
                { href: "/staff/dashboard/sales/orders?filter=sla", icon: Timer, label: "Cảnh báo SLA", tone: "bg-rose-50 text-rose-700" },
                { href: "/staff/support", icon: RotateCcw, label: `Đổi trả (${stats.returnCount})`, tone: "bg-emerald-50 text-emerald-700" },
              ].map(a => (
                <Link key={a.label} href={a.href} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${a.tone}`}>
                    <a.icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-slate-700 leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Recent orders */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" /> Đơn hàng gần đây
          </h2>
          <Link href="/staff/dashboard/sales/orders" className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5">
            Tìm kiếm & xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/70">
                <th className="px-5 py-3">Mã đơn</th>
                <th className="px-5 py-3">Khách hàng</th>
                <th className="px-5 py-3 text-right">Giá trị</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">Thời gian</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {firstLoad ? (
                [0, 1, 2, 3].map(i => (
                  <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="h-6 bg-slate-100 rounded animate-pulse" /></td></tr>
                ))
              ) : recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                    Chưa có đơn hàng nào tại chi nhánh của bạn.
                  </td>
                </tr>
              ) : recent.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-mono font-bold text-slate-900">{o.orderCode}</td>
                  <td className="px-5 py-3 text-slate-700">{o.customerName}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900">{fmtVnd(o.totalAmount)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusMeta(o.status).cls}`}>
                      {statusMeta(o.status).label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href="/staff/dashboard/sales/orders" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                      Xử lý <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
