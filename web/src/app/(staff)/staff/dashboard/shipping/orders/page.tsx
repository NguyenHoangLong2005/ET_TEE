"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Truck, RefreshCw, Package, MapPin, Phone, User,
  DollarSign, Clock, Hash, CheckCircle2, Eye, X
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";

// ─── Types ────────────────────────────────────────────────────────────────────
type Order = {
  orderId?: number;
  id?: number;
  orderCode?: string;
  customerName?: string;
  customerPhone?: string;
  phone?: string;
  shippingAddress?: string;
  status: string;
  paymentMethod?: string;
  totalAmount?: number;
  total?: number;
  shippingProvider?: string;
  trackingCode?: string;
  handedAt?: string;
  itemCount?: number;
};

// ─── Nav ─────────────────────────────────────────────────────────────────────
function ShippingNav({ active }: { active: string }) {
  const links = [
    { href: "/staff/dashboard/shipping/dashboard", label: "Tổng quan" },
    { href: "/staff/dashboard/shipping/orders", label: "Đơn chờ giao" },
    { href: "/staff/dashboard/shipping/shipments", label: "Kiện hàng" },
    { href: "/staff/dashboard/shipping/exceptions", label: "Ngoại lệ" },
    { href: "/staff/dashboard/shipping/cod", label: "Đối soát COD" },
  ];
  return (
    <nav className="flex flex-wrap gap-2 text-xs font-semibold">
      {links.map(l => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg border px-3 py-2 transition ${
            l.href === active
              ? "border-sky-300 bg-sky-50 text-sky-700 font-bold"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const PROVIDER_CLS: Record<string, string> = {
  GHN:  "bg-red-100 text-red-700 border-red-200",
  GHTK: "bg-blue-100 text-blue-700 border-blue-200",
  "J&T": "bg-orange-100 text-orange-700 border-orange-200",
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ShippingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  // Tao van don: buoc dua don kho da ban giao vao luong van chuyen (trang Kien hang).
  const [createFor, setCreateFor] = useState<Order | null>(null);
  const [carrier, setCarrier] = useState("GHN");
  const [trackingCode, setTrackingCode] = useState("");
  const [creating, setCreating] = useState(false);

  // Ma noi bo khi hang chua cap ma: tien to hang + ma don (ma don la duy nhat).
  const generateTrackingCode = () => {
    const prefix = carrier.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) || "ET";
    const suffix = Date.now().toString().slice(-6);
    setTrackingCode(`${prefix}-${createFor?.orderCode ?? ""}-${suffix}`);
  };

  const openCreate = (o: Order) => {
    setCreateFor(o);
    setCarrier(o.shippingProvider ?? "GHN");
    setTrackingCode(o.trackingCode ?? "");
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFor) return;
    const orderId = createFor.id ?? createFor.orderId;
    if (!trackingCode.trim()) {
      toast.error("Vui lòng nhập hoặc tạo mã vận đơn");
      return;
    }
    setCreating(true);
    try {
      await apiClient.post("/api/staff/shipping/shipments", {
        orderId,
        carrierName: carrier,
        trackingCode: trackingCode.trim(),
      });
      toast.success(`Đã tạo vận đơn cho đơn ${createFor.orderCode ?? `#${orderId}`}. Tiếp tục xử lý ở mục Kiện hàng.`);
      // Don da co van don roi khoi danh sach cho giao.
      setOrders(prev => prev.filter(o => (o.id ?? o.orderId) !== orderId));
      setCreateFor(null);
    } catch (err: any) {
      toast.error(err?.message || "Không thể tạo vận đơn");
    } finally {
      setCreating(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>("/api/staff/shipping/orders");
      const arr: Order[] = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
      setOrders(arr);
    } catch (e: any) {
      toast.error(e?.message || "Không thể tải danh sách đơn chờ giao");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        (o.orderCode ?? "").toLowerCase().includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q) ||
        (o.customerPhone ?? o.phone ?? "").includes(q) ||
        (o.trackingCode ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Stats
  const handedCount = orders.filter(o => o.status === "HANDED_TO_CARRIER").length;
  const inTransitCount = orders.filter(o => o.status === "IN_TRANSIT" || o.status === "OUT_FOR_DELIVERY").length;
  const deliveredCount = orders.filter(o => o.status === "DELIVERED").length;
  const failedCount = orders.filter(o => o.status === "FAILED_DELIVERY" || o.status === "EXCEPTION").length;

  const fmtMoney = (v?: number) => v != null ? `${v.toLocaleString("vi-VN")}₫` : "—";

  const columns: Column<Order>[] = [
    {
      key: 'orderCode',
      header: 'Mã Đơn',
      render: (o) => {
        const id = o.id ?? o.orderId;
        return (
          <div>
            <p className="font-mono font-bold text-slate-900">{o.orderCode ?? `#${id}`}</p>
            {o.itemCount != null && <p className="text-xs text-slate-400 mt-0.5">{o.itemCount} sản phẩm</p>}
          </div>
        );
      }
    },
    {
      key: 'customer',
      header: 'Khách Hàng',
      render: (o) => {
        const phone = o.customerPhone ?? o.phone;
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 text-sm">{o.customerName ?? "—"}</span>
            </div>
            {phone && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500 font-mono">{phone}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'address',
      header: 'Địa Chỉ Giao Hàng',
      render: (o) => (
        <div className="max-w-[200px] flex items-start gap-1.5">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
          <span className="text-xs text-slate-500 leading-relaxed line-clamp-2">{o.shippingAddress ?? "—"}</span>
        </div>
      )
    },
    {
      key: 'carrier',
      header: 'Hãng / Tracking',
      render: (o) => {
        const provCls = PROVIDER_CLS[o.shippingProvider ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200";
        return (
          <div>
            {o.shippingProvider && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${provCls} mb-1`}>
                {o.shippingProvider}
              </span>
            )}
            {o.trackingCode && (
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-slate-400" />
                <span className="text-xs font-mono text-slate-600">{o.trackingCode}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'TT Vận Chuyển',
      render: (o) => (
        <StatusBadge status={o.status} type="shipment" />
      )
    },
    {
      key: 'cod',
      header: 'COD',
      render: (o) => {
        const isCOD = o.paymentMethod === "COD";
        const amt = o.totalAmount ?? o.total;
        return isCOD ? (
          <div>
            <span className="font-bold text-amber-700 text-sm font-mono">{fmtMoney(amt)}</span>
            <span className="block text-[10px] text-slate-400">Thu tiền khi giao</span>
          </div>
        ) : (
          <span className="text-xs text-emerald-600 font-medium">Đã thanh toán</span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: (o) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDetailOrder(o)}
            className="flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Chi tiết</span>
          </Button>
          {o.status === "HANDED_TO_CARRIER" && (
            <Button size="sm" onClick={() => openCreate(o)} icon={<Truck className="w-3.5 h-3.5" />}>
              Tạo vận đơn
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50/60 p-6 md:p-8 text-slate-900 font-sans antialiased space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Đơn Hàng Cần Xử Lý Vận Chuyển"
        subtitle="Theo dõi tiến độ giao hàng, phân phối đơn sang hãng vận chuyển và kiểm tra tracking"
        breadcrumbs={[
          { label: 'Staff Hub', href: '/staff/dashboard' },
          { label: 'Vận chuyển', href: '/staff/dashboard/shipping' },
          { label: 'Đơn chờ giao' }
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </Button>
        }
      />

      <ShippingNav active="/staff/dashboard/shipping/orders" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Đã bàn giao hãng"
          value={handedCount}
          icon={Package}
          color="info"
          subtitle="Chờ hãng quét mã"
        />
        <StatCard
          title="Đang giao hàng"
          value={inTransitCount}
          icon={Truck}
          color="warning"
          subtitle="Đang trên lộ trình"
        />
        <StatCard
          title="Giao thành công"
          value={deliveredCount}
          icon={CheckCircle2}
          color="success"
          subtitle="Đã phát cho khách"
        />
        <StatCard
          title="Giao thất bại"
          value={failedCount}
          icon={Clock}
          color="danger"
          subtitle="Cần liên hệ xử lý"
        />
      </div>

      {/* DataTable */}
      <DataTable<Order>
        columns={columns}
        data={filtered}
        loading={loading}
        rowKey={(o) => String(o.orderCode ?? o.id ?? o.orderId ?? "")}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm mã đơn, tracking, tên KH, SĐT..."
        emptyTitle="Không có đơn vận chuyển nào"
        emptyMessage="Không tìm thấy đơn hàng nào phù hợp với điều kiện tìm kiếm hoặc trạng thái lọc."
        filterSlot={
          <div className="flex items-center gap-2">
            {[
              { key: "ALL", label: "Tất cả" },
              { key: "HANDED_TO_CARRIER", label: "Đã bàn giao" },
              { key: "IN_TRANSIT", label: "Đang vận chuyển" },
              { key: "OUT_FOR_DELIVERY", label: "Đang giao" },
              { key: "DELIVERED", label: "Đã giao" },
              { key: "FAILED_DELIVERY", label: "Giao thất bại" },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === s.key
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Create Shipment Modal */}
      {createFor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateShipment} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900">Tạo vận đơn {createFor.orderCode}</h3>
              </div>
              <button type="button" onClick={() => setCreateFor(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">Đơn vị vận chuyển</span>
                <select
                  value={carrier}
                  onChange={e => setCarrier(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  {["GHN", "GHTK", "J&T", "Nội bộ"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">Mã vận đơn <span className="text-rose-500">*</span></span>
                <div className="flex gap-2">
                  <input
                    value={trackingCode}
                    onChange={e => setTrackingCode(e.target.value)}
                    placeholder="Nhập mã hãng cấp, hoặc bấm Tạo mã"
                    required
                    className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <Button type="button" variant="outline" onClick={generateTrackingCode}>Tạo mã</Button>
                </div>
              </label>
              <p className="text-xs text-slate-500">
                {createFor.paymentMethod === "COD"
                  ? `Tiền thu hộ COD: ${fmtMoney(createFor.totalAmount ?? createFor.total)} (hệ thống tự tính theo đơn).`
                  : "Đơn đã thanh toán, không thu hộ."}
              </p>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <Button type="button" variant="outline" onClick={() => setCreateFor(null)}>Hủy</Button>
              <Button type="submit" loading={creating}>Tạo vận đơn</Button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900">Chi tiết vận đơn {detailOrder.orderCode}</h3>
              </div>
              <button onClick={() => setDetailOrder(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Khách hàng</p>
                  <p className="font-bold text-slate-900 mt-1">{detailOrder.customerName ?? "—"}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{detailOrder.customerPhone ?? detailOrder.phone ?? "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Đơn vị vận chuyển</p>
                  <p className="font-bold text-slate-900 mt-1">{detailOrder.shippingProvider ?? "Nội bộ"}</p>
                  <p className="text-xs font-mono text-sky-600 mt-0.5">{detailOrder.trackingCode ?? "Chưa có mã tracking"}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <p className="text-xs text-slate-400 uppercase font-semibold">Địa chỉ giao hàng</p>
                <p className="text-slate-700 mt-1">{detailOrder.shippingAddress ?? "—"}</p>
              </div>
              <div className="flex justify-between items-center bg-sky-50 rounded-xl p-4 border border-sky-100">
                <div>
                  <p className="text-xs text-sky-700 font-semibold">Tiền thu hộ COD</p>
                  <p className="text-lg font-black text-sky-900 font-mono">
                    {detailOrder.paymentMethod === "COD"
                      ? fmtMoney(detailOrder.totalAmount ?? detailOrder.total)
                      : "0₫ (Đã thanh toán online)"}
                  </p>
                </div>
                <StatusBadge status={detailOrder.status} type="shipment" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <Button variant="primary" onClick={() => setDetailOrder(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
