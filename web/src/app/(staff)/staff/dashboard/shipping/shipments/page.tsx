"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";
import { toast } from "sonner";
import {
  Package, Truck, RefreshCw, X, Hash, CheckCircle2,
  Camera, Search, Plus, Sparkles, MapPin, Phone, User,
  ArrowRight, DollarSign, Clock
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────
type Shipment = {
  id: number;
  trackingCode?: string;
  carrierName?: string;
  shippingProvider?: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  codAmount?: number;
  total?: number;
  status: string;
  orderCode?: string;
  orderId?: number;
  paymentMethod?: string;
  itemCount?: number;
  createdAt?: string;
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
        <Link key={l.href} href={l.href}
          className={`rounded-lg border px-3 py-2 transition ${l.href === active
            ? "border-sky-300 bg-sky-50 text-sky-700 font-bold"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >{l.label}</Link>
      ))}
    </nav>
  );
}

// Khop ShipmentStatus cua backend: PENDING -> HANDED_OVER -> IN_TRANSIT -> DELIVERED.
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: "Chờ bàn giao ĐVVC", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  HANDED_OVER: { label: "Đã bàn giao ĐVVC",  cls: "bg-sky-100 text-sky-700 border-sky-200" },
  IN_TRANSIT:  { label: "Đang vận chuyển",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  DELIVERED:   { label: "Đã giao",            cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  EXCEPTION:   { label: "Có sự cố",           cls: "bg-rose-100 text-rose-700 border-rose-200" },
  RETURNED:    { label: "Hoàn về",            cls: "bg-amber-100 text-amber-700 border-amber-200" },
};

// API tra ve entity Shipment voi thong tin don long trong `order`; lam phang cho giao dien.
function toShipment(raw: any): Shipment {
  const o = raw?.order ?? {};
  return {
    ...raw,
    orderId: raw?.orderId ?? o.id,
    orderCode: raw?.orderCode ?? o.orderCode,
    customerName: raw?.customerName ?? o.customerName,
    customerPhone: raw?.customerPhone ?? o.phone,
    shippingAddress: raw?.shippingAddress ?? o.shippingAddress,
    paymentMethod: raw?.paymentMethod ?? o.paymentMethod,
    total: raw?.total ?? o.total,
  };
}

// Generate tracking code
function generateTrackingCode(carrier: string) {
  const prefix = carrier.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) || "SHP";
  const num = Math.floor(Math.random() * 9000000000 + 1000000000);
  return `${prefix}-${num}`;
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ShippingShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [trackingModal, setTrackingModal] = useState<Shipment | null>(null);
  const [proofModal, setProofModal] = useState<Shipment | null>(null);

  // Tracking form
  const [trackingInput, setTrackingInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("GHN");
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);

  // Proof of delivery form
  const [proofReceiver, setProofReceiver] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const baseUrl = getApiBaseUrl();
  const authHeaders = getAuthHeaders() as Record<string, string>;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/shipping/shipments`, { headers: authHeaders, cache: "no-store" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể tải danh sách kiện hàng");
      }
      const data = await res.json();
      const arr: any[] = Array.isArray(data) ? data : data?.data ?? [];
      setShipments(arr.map(toShipment));
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải danh sách kiện hàng");
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openTrackingModal = (s: Shipment) => {
    setTrackingModal(s);
    setTrackingInput(s.trackingCode ?? "");
    setCarrierInput(s.carrierName ?? s.shippingProvider ?? "GHN");
  };

  const handleAutoGenerateTracking = () => {
    setTrackingInput(generateTrackingCode(carrierInput));
  };

  const handleSubmitTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModal) return;
    if (!trackingInput.trim()) { toast.error("Vui lòng nhập hoặc tạo mã vận đơn"); return; }

    setIsSubmittingTracking(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/shipping/shipments/${trackingModal.id}/tracking-code`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ trackingCode: trackingInput.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể cập nhật mã vận đơn");
      }
      toast.success(`Đã gắn mã vận đơn ${trackingInput} cho đơn ${trackingModal.orderCode || `#${trackingModal.id}`}`);
      setShipments(prev => prev.map(s =>
        s.id === trackingModal.id
          ? { ...s, trackingCode: trackingInput.trim() }
          : s
      ));
      setTrackingModal(null);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi cập nhật mã vận đơn");
    } finally {
      setIsSubmittingTracking(false);
    }
  };

  const openProofModal = (s: Shipment) => {
    setProofModal(s);
    setProofReceiver(s.customerName ?? "");
    setProofImageUrl("");
    setProofNote("Giao hàng thành công, khách hàng đã nhận");
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofModal) return;
    if (!proofReceiver.trim()) { toast.error("Vui lòng nhập tên người nhận"); return; }

    setIsSubmittingProof(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/shipping/shipments/${proofModal.id}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          receiverName: proofReceiver.trim(),
          imageUrl: proofImageUrl.trim() || undefined,
          note: proofNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể lưu bằng chứng giao hàng");
      }
      toast.success(`Đã ghi nhận bằng chứng giao hàng cho đơn ${proofModal.orderCode || `#${proofModal.id}`}`);
      setShipments(prev => prev.map(s =>
        s.id === proofModal.id ? { ...s, status: "DELIVERED" } : s
      ));
      setProofModal(null);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi ghi nhận bằng chứng giao hàng");
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleHandover = async (id: number) => {
    try {
      const res = await fetch(`${baseUrl}/api/staff/shipping/shipments/${id}/handover`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể xác nhận bàn giao");
      }
      toast.success("Đã bàn giao kiện hàng cho đối tác vận chuyển thành công");
      setShipments(prev => prev.map(s => s.id === id ? { ...s, status: "HANDED_OVER" } : s));
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi bàn giao kiện hàng");
    }
  };

  const handleStartShipping = async (id: number) => {
    try {
      const res = await fetch(`${baseUrl}/api/staff/shipping/shipments/${id}/shipping`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể chuyển trạng thái đang giao");
      }
      toast.success("Kiện hàng đã chuyển sang trạng thái đang vận chuyển");
      setShipments(prev => prev.map(s => s.id === id ? { ...s, status: "IN_TRANSIT" } : s));
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi chuyển trạng thái giao hàng");
    }
  };

  const filtered = shipments.filter(s => {
    const q = searchQuery.toLowerCase();
    return !q ||
      (s.trackingCode ?? "").toLowerCase().includes(q) ||
      (s.customerName ?? "").toLowerCase().includes(q) ||
      (s.orderCode ?? "").toLowerCase().includes(q) ||
      (s.carrierName ?? "").toLowerCase().includes(q);
  });

  const pendingCount = shipments.filter(s => !s.trackingCode || s.status === "PENDING").length;
  const activeCount = shipments.filter(s => ["HANDED_OVER", "IN_TRANSIT"].includes(s.status)).length;
  const deliveredCount = shipments.filter(s => s.status === "DELIVERED").length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Quản Lý Kiện Hàng"
          subtitle="Tạo/gắn mã vận đơn, xác nhận bàn giao và ghi nhận bằng chứng giao hàng"
          breadcrumbs={[
            { label: "Bộ phận vận chuyển", href: "/staff/dashboard/shipping" },
            { label: "Kiện hàng" },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            >
              Làm mới
            </Button>
          }
        />

        <ShippingNav active="/staff/dashboard/shipping/shipments" />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Chờ mã tracking"
            value={pendingCount}
            icon={Package}
            color="warning"
          />
          <StatCard
            title="Đang vận chuyển"
            value={activeCount}
            icon={Truck}
            color="blue"
          />
          <StatCard
            title="Đã giao thành công"
            value={deliveredCount}
            icon={CheckCircle2}
            color="success"
          />
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm tracking, tên KH, mã đơn..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          />
        </div>

        {/* Shipments List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
            <span>Đang tải danh sách kiện hàng...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">Không tìm thấy kiện hàng nào</p>
            <p className="text-xs text-slate-400 mt-1">Chưa có vận đơn nào khớp với từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const cfg = STATUS_CFG[s.status] ?? { label: s.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
              const needsTracking = !s.trackingCode || s.status === "PENDING";
              const canProof = s.status === "IN_TRANSIT"; // backend chi cho SHIPPING -> DELIVERED
              const isCOD = s.paymentMethod === "COD" || (s.codAmount ?? 0) > 0;

              return (
                <div key={s.id} className={`rounded-2xl border bg-white p-5 transition shadow-2xs hover:shadow-md ${needsTracking ? "border-amber-300" : "border-slate-200"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono font-black text-slate-900">{s.orderCode ?? `SHIP-#${s.id}`}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.cls}`}>{cfg.label}</span>
                        {s.carrierName && <span className="text-xs text-slate-500 font-medium">{s.carrierName}</span>}
                        {isCOD && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> COD
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                        {s.customerName && (
                          <div className="flex items-center gap-2 text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">{s.customerName}</span>
                          </div>
                        )}
                        {s.customerPhone && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-xs">{s.customerPhone}</span>
                          </div>
                        )}
                        {s.shippingAddress && (
                          <div className="flex items-start gap-2 text-slate-500 sm:col-span-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-xs">{s.shippingAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Tracking code display */}
                      {s.trackingCode ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200">
                          <Hash className="w-3.5 h-3.5 text-sky-600" />
                          <span className="font-mono text-sm text-sky-700 font-bold">{s.trackingCode}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                          <Hash className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-xs text-amber-700 font-medium">Chưa có mã vận đơn</span>
                        </div>
                      )}

                      {isCOD && (s.codAmount ?? 0) > 0 && (
                        <p className="text-sm font-bold text-emerald-700">
                          COD: {(s.codAmount ?? 0).toLocaleString("vi-VN")} ₫
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={needsTracking ? "primary" : "outline"}
                        onClick={() => openTrackingModal(s)}
                        icon={<Hash className="w-3.5 h-3.5" />}
                      >
                        {s.trackingCode ? "Sửa tracking" : "Gắn mã vận đơn"}
                      </Button>
                      {s.status === "PENDING" && Boolean(s.trackingCode) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleHandover(s.id)}
                          icon={<Truck className="w-3.5 h-3.5 text-sky-600" />}
                        >
                          Bàn giao ĐVVC
                        </Button>
                      )}
                      {s.status === "HANDED_OVER" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleStartShipping(s.id)}
                          icon={<Truck className="w-3.5 h-3.5 text-blue-600" />}
                        >
                          Bắt đầu giao hàng
                        </Button>
                      )}
                      {canProof && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openProofModal(s)}
                          icon={<Camera className="w-3.5 h-3.5" />}
                        >
                          Bằng chứng giao hàng
                        </Button>
                      )}
                      {s.status === "DELIVERED" && (
                        <Link
                          href="/staff/dashboard/shipping/cod"
                          className="rounded-lg bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          Đối soát COD
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Tracking Code */}
        {trackingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-sky-600" /> Gắn Mã Vận Đơn
                </h3>
                <button onClick={() => setTrackingModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">Đơn hàng: <span className="font-bold text-slate-800">{trackingModal.orderCode || `#${trackingModal.id}`}</span></p>

              <form onSubmit={handleSubmitTracking} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hãng vận chuyển</label>
                  <select
                    value={carrierInput}
                    onChange={e => setCarrierInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                  >
                    <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                    <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                    <option value="VIETTEL_POST">Viettel Post</option>
                    <option value="J&T">J&T Express</option>
                    <option value="VNPOST">VNPost</option>
                    <option value="OTHER">Đơn vị khác</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Mã vận đơn (Tracking Code)</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateTracking}
                      className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3 h-3" /> Tự động tạo
                    </button>
                  </div>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={e => setTrackingInput(e.target.value)}
                    placeholder="VD: GHN-123456789"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" type="button" onClick={() => setTrackingModal(null)}>
                    Hủy
                  </Button>
                  <Button variant="primary" size="sm" type="submit" loading={isSubmittingTracking}>
                    Lưu mã vận đơn
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Proof of Delivery */}
        {proofModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-600" /> Bằng Chứng Giao Hàng
                </h3>
                <button onClick={() => setProofModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">Đơn hàng: <span className="font-bold text-slate-800">{proofModal.orderCode || `#${proofModal.id}`}</span></p>

              <form onSubmit={handleSubmitProof} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên người nhận hàng *</label>
                  <input
                    type="text"
                    required
                    value={proofReceiver}
                    onChange={e => setProofReceiver(e.target.value)}
                    placeholder="Nhập tên người nhận..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL ảnh bằng chứng (tùy chọn)</label>
                  <input
                    type="url"
                    value={proofImageUrl}
                    onChange={e => setProofImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú xác nhận</label>
                  <textarea
                    rows={2}
                    value={proofNote}
                    onChange={e => setProofNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" type="button" onClick={() => setProofModal(null)}>
                    Hủy
                  </Button>
                  <Button variant="primary" size="sm" type="submit" loading={isSubmittingProof}>
                    Xác nhận giao thành công
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
