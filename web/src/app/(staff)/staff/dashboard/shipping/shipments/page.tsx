"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Package, Truck, RefreshCw, X, Hash, CheckCircle2,
  Camera, Search, MapPin, Phone, User,
  ArrowRight, DollarSign, AlertTriangle, RotateCcw, Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import {
  Shipment, ShipmentStatus, SHIPMENT_STATUS_ORDER, shipmentStatusCfg, toShipment,
  canReportException, isCodPending, asList, fmtVnd, fmtDateTime, EXCEPTION_TYPES, carrierLabel } from '@/lib/shipping';


type Tab = "ALL" | ShipmentStatus;

function readTabFromUrl(): Tab {
  if (typeof window === "undefined") return "ALL";
  const s = new URLSearchParams(window.location.search).get("status");
  return s && (SHIPMENT_STATUS_ORDER as string[]).includes(s) ? (s as Tab) : "ALL";
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ShippingShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<Tab>("ALL");
  const [busyId, setBusyId] = useState<number | null>(null);

  // Modals
  const [trackingModal, setTrackingModal] = useState<Shipment | null>(null);
  const [proofModal, setProofModal] = useState<Shipment | null>(null);
  const [exceptionModal, setExceptionModal] = useState<Shipment | null>(null);

  const [trackingInput, setTrackingInput] = useState("");
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);

  const [proofReceiver, setProofReceiver] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const [exType, setExType] = useState("NOT_AT_HOME");
  const [exDesc, setExDesc] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  // Bộ lọc mở từ trang Tổng quan qua ?status=...
  useEffect(() => { setTab(readTabFromUrl()); }, []);

  const changeTab = (t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === "ALL") url.searchParams.delete("status"); else url.searchParams.set("status", t);
    window.history.replaceState(null, "", url.toString());
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>("/api/staff/shipping/shipments");
      setShipments(asList(data).map(toShipment));
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải danh sách kiện hàng");
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Mỗi thao tác đổi trạng thái thay bản ghi bằng dữ liệu server trả về, để đơn hàng,
  // ngày bàn giao/giao và COD luôn khớp backend thay vì đoán ở client.
  const replace = (raw: any) => {
    const next = toShipment(raw);
    setShipments(prev => prev.map(s => (s.id === next.id ? next : s)));
  };

  const runAction = async (s: Shipment, path: string, success: string) => {
    setBusyId(s.id);
    try {
      replace(await apiClient.post<any>(`/api/staff/shipping/shipments/${s.id}/${path}`));
      toast.success(success);
    } catch (err: any) {
      toast.error(err?.message || "Không thể cập nhật kiện hàng");
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModal) return;
    const code = trackingInput.trim();
    if (!code) { toast.error("Vui lòng nhập mã vận đơn"); return; }
    setIsSubmittingTracking(true);
    try {
      replace(await apiClient.put<any>(`/api/staff/shipping/shipments/${trackingModal.id}/tracking-code`, { trackingCode: code }));
      toast.success(`Đã cập nhật mã vận đơn ${code}`);
      setTrackingModal(null);
    } catch (err: any) {
      toast.error(err?.message || "Không thể cập nhật mã vận đơn");
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
      // Endpoint trả ProofOfDelivery (có shipment lồng bên trong).
      const proof = await apiClient.post<any>(`/api/staff/shipping/shipments/${proofModal.id}/proof`, {
        receiverName: proofReceiver.trim(),
        imageUrl: proofImageUrl.trim() || undefined,
        note: proofNote.trim() || undefined,
      });
      if (proof?.shipment) replace(proof.shipment);
      else setShipments(prev => prev.map(s => (s.id === proofModal.id ? { ...s, status: "DELIVERED" } : s)));
      toast.success(`Đã xác nhận giao thành công đơn ${proofModal.orderCode ?? `#${proofModal.id}`}`);
      setProofModal(null);
    } catch (err: any) {
      toast.error(err?.message || "Không thể lưu bằng chứng giao hàng");
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const openExceptionModal = (s: Shipment) => {
    setExceptionModal(s);
    setExType("NOT_AT_HOME");
    setExDesc("");
  };

  const handleReportException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionModal) return;
    setIsReporting(true);
    try {
      const ex = await apiClient.post<any>("/api/staff/shipping/exceptions", {
        shipmentId: exceptionModal.id,
        type: exType,
        description: exDesc.trim() || undefined,
      });
      if (ex?.shipment) replace(ex.shipment);
      else setShipments(prev => prev.map(s => (s.id === exceptionModal.id ? { ...s, status: "EXCEPTION" } : s)));
      toast.success("Đã ghi nhận sự cố. Xử lý tiếp ở mục Ngoại lệ.");
      setExceptionModal(null);
    } catch (err: any) {
      toast.error(err?.message || "Không thể ghi nhận sự cố");
    } finally {
      setIsReporting(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: shipments.length };
    for (const st of SHIPMENT_STATUS_ORDER) c[st] = 0;
    for (const s of shipments) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [shipments]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shipments.filter(s => {
      if (tab !== "ALL" && s.status !== tab) return false;
      return !q ||
        (s.trackingCode ?? "").toLowerCase().includes(q) ||
        (s.customerName ?? "").toLowerCase().includes(q) ||
        (s.customerPhone ?? "").includes(q) ||
        (s.orderCode ?? "").toLowerCase().includes(q) ||
        (s.carrierName ?? "").toLowerCase().includes(q);
    });
  }, [shipments, searchQuery, tab]);

  const codPendingTotal = shipments.filter(isCodPending).reduce((sum, s) => sum + s.codAmount, 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "ALL", label: "Tất cả" },
    ...SHIPMENT_STATUS_ORDER.map(st => ({ key: st as Tab, label: shipmentStatusCfg(st).label })),
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Quản lý kiện hàng"
          subtitle="Bàn giao cho hãng, theo dõi đang giao / đã giao, báo sự cố và ghi nhận bằng chứng giao hàng"
          breadcrumbs={[
            { label: "Bộ phận vận chuyển", href: "/staff/dashboard/shipping/dashboard" },
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

        {/* Stats: bấm để lọc */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button type="button" onClick={() => changeTab("PENDING")} className="text-left">
            <StatCard title="Chờ bàn giao" value={counts.PENDING + counts.HANDED_OVER} icon={Package} color="slate"
              subtitle={`${counts.PENDING} chờ bàn giao · ${counts.HANDED_OVER} đã bàn giao`} />
          </button>
          <button type="button" onClick={() => changeTab("IN_TRANSIT")} className="text-left">
            <StatCard title="Đang giao hàng" value={counts.IN_TRANSIT} icon={Truck} color="slate" subtitle="Hãng đang phát cho khách" />
          </button>
          <button type="button" onClick={() => changeTab("DELIVERED")} className="text-left">
            <StatCard title="Đã giao thành công" value={counts.DELIVERED} icon={CheckCircle2} color="slate"
              subtitle={codPendingTotal > 0 ? `COD chờ đối soát ${fmtVnd(codPendingTotal)}` : "Không còn COD chờ đối soát"} />
          </button>
          <button type="button" onClick={() => changeTab("EXCEPTION")} className="text-left">
            <StatCard title="Sự cố / Hoàn về" value={counts.EXCEPTION + counts.RETURNED} icon={AlertTriangle} color="danger"
              subtitle={`${counts.EXCEPTION} đang có sự cố · ${counts.RETURNED} đã hoàn`} />
          </button>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => changeTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === t.key
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-[10px] ${tab === t.key ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                  {counts[t.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm tracking, mã đơn, tên KH, SĐT..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        {/* Shipments List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <span>Đang tải danh sách kiện hàng...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">Không có kiện hàng nào</p>
            <p className="text-xs text-slate-400 mt-1">
              {shipments.length === 0
                ? "Chưa có vận đơn. Tạo vận đơn từ mục Đơn chờ giao."
                : "Không có kiện hàng khớp trạng thái hoặc từ khóa đang lọc."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const cfg = shipmentStatusCfg(s.status);
              const busy = busyId === s.id;
              const canEditTracking = s.status === "PENDING" || s.status === "HANDED_OVER";
              const codWaiting = isCodPending(s);

              return (
                <div key={s.id} className={`rounded-xl border bg-white p-5 transition shadow-2xs hover:shadow-md ${s.status === "EXCEPTION" ? "border-rose-300" : "border-slate-200"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono font-black text-slate-900">{s.orderCode ?? `SHIP-#${s.id}`}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.cls}`}>{cfg.label}</span>
                        {s.carrierName && <span className="text-xs text-slate-500 font-medium">{carrierLabel(s.carrierName)}</span>}
                        {s.codAmount > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-slate-50 text-slate-800 border-slate-200 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> COD {fmtVnd(s.codAmount)}
                          </span>
                        )}
                        {s.status === "DELIVERED" && s.codAmount > 0 && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${s.codReconciled
                            ? "bg-slate-50 text-slate-500 border-slate-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                            {s.codReconciled ? "Đã đối soát" : "Chờ đối soát COD"}
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

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-sm text-slate-900 font-bold">{s.trackingCode ?? "—"}</span>
                        </div>
                        {s.handoverAt && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="w-3 h-3" /> Bàn giao {fmtDateTime(s.handoverAt)}
                          </span>
                        )}
                        {s.deliveredAt && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" /> Giao {fmtDateTime(s.deliveredAt)}
                          </span>
                        )}
                        {s.deliveryProofUrl && (
                          <a href={s.deliveryProofUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-slate-700 underline-offset-2 hover:underline">
                            Xem ảnh bằng chứng
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions theo đúng bước của luồng */}
                    <div className="flex flex-col gap-2 shrink-0 min-w-[170px]">
                      {s.status === "PENDING" && (
                        <Button size="sm" loading={busy} disabled={busy}
                          onClick={() => runAction(s, "handover", "Đã bàn giao kiện cho đơn vị vận chuyển")}
                          icon={<Truck className="w-3.5 h-3.5" />}>
                          Bàn giao ĐVVC
                        </Button>
                      )}
                      {s.status === "HANDED_OVER" && (
                        <Button size="sm" loading={busy} disabled={busy}
                          onClick={() => runAction(s, "shipping", "Kiện hàng đã chuyển sang đang giao")}
                          icon={<Truck className="w-3.5 h-3.5" />}>
                          Bắt đầu giao hàng
                        </Button>
                      )}
                      {s.status === "IN_TRANSIT" && (
                        <Button size="sm" onClick={() => openProofModal(s)} icon={<Camera className="w-3.5 h-3.5" />}>
                          Xác nhận đã giao
                        </Button>
                      )}
                      {canEditTracking && (
                        <Button size="sm" variant="outline"
                          onClick={() => { setTrackingModal(s); setTrackingInput(s.trackingCode ?? ""); }}
                          icon={<Hash className="w-3.5 h-3.5" />}>
                          Sửa mã vận đơn
                        </Button>
                      )}
                      {canReportException(s) && (
                        <Button size="sm" variant="outline" onClick={() => openExceptionModal(s)}
                          icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}>
                          Báo sự cố
                        </Button>
                      )}
                      {s.status === "EXCEPTION" && (
                        <Link href="/staff/dashboard/shipping/exceptions"
                          className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Xử lý sự cố
                        </Link>
                      )}
                      {codWaiting && (
                        <Link href="/staff/dashboard/shipping/cod"
                          className="rounded-lg bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5" /> Đối soát COD
                        </Link>
                      )}
                      {s.status === "RETURNED" && (
                        <span className="inline-flex items-center justify-center gap-1.5 text-xs text-amber-700 font-medium">
                          <RotateCcw className="w-3.5 h-3.5" /> Đơn đã hủy, hàng về kho
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal sửa mã vận đơn */}
        {trackingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-slate-400" /> Sửa Mã Vận Đơn
                </h3>
                <button onClick={() => setTrackingModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Đơn hàng <span className="font-bold text-slate-800">{trackingModal.orderCode ?? `#${trackingModal.id}`}</span>
                {trackingModal.carrierName && <> · Hãng <span className="font-bold text-slate-800">{carrierLabel(trackingModal.carrierName)}</span></>}
              </p>
              <form onSubmit={handleSubmitTracking} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã vận đơn (Tracking Code)</label>
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={e => setTrackingInput(e.target.value)}
                    placeholder="VD: GHN-123456789"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Chỉ sửa được trước khi kiện bắt đầu giao.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" type="button" onClick={() => setTrackingModal(null)}>Hủy</Button>
                  <Button variant="primary" size="sm" type="submit" loading={isSubmittingTracking}>Lưu mã vận đơn</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal xác nhận đã giao */}
        {proofModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-slate-400" /> Xác Nhận Giao Hàng Thành Công
                </h3>
                <button onClick={() => setProofModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Đơn hàng <span className="font-bold text-slate-800">{proofModal.orderCode ?? `#${proofModal.id}`}</span>
                {proofModal.codAmount > 0 && <> · Thu hộ <span className="font-bold text-slate-900">{fmtVnd(proofModal.codAmount)}</span></>}
              </p>
              <form onSubmit={handleSubmitProof} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên người nhận hàng *</label>
                  <input type="text" required value={proofReceiver} onChange={e => setProofReceiver(e.target.value)}
                    placeholder="Nhập tên người nhận..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">URL ảnh bằng chứng (tùy chọn)</label>
                  <input type="url" value={proofImageUrl} onChange={e => setProofImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú xác nhận</label>
                  <textarea rows={2} value={proofNote} onChange={e => setProofNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" type="button" onClick={() => setProofModal(null)}>Hủy</Button>
                  <Button variant="primary" size="sm" type="submit" loading={isSubmittingProof}>Xác nhận giao thành công</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal báo sự cố */}
        {exceptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" /> Báo Sự Cố Giao Hàng
                </h3>
                <button onClick={() => setExceptionModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Đơn hàng <span className="font-bold text-slate-800">{exceptionModal.orderCode ?? `#${exceptionModal.id}`}</span>
                {" · "}<span className="font-mono">{exceptionModal.trackingCode}</span>
              </p>
              <form onSubmit={handleReportException} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại sự cố *</label>
                  <select value={exType} onChange={e => setExType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400">
                    {Object.entries(EXCEPTION_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả</label>
                  <textarea rows={3} value={exDesc} onChange={e => setExDesc(e.target.value)}
                    placeholder="Phản ánh từ bưu tá, hãng vận chuyển hoặc khách hàng..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Kiện chuyển sang “Có sự cố”. Sau khi xử lý ở mục Ngoại lệ, kiện tiếp tục giao hoặc hoàn về kho.
                </p>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" type="button" onClick={() => setExceptionModal(null)}>Hủy</Button>
                  <Button variant="danger" size="sm" type="submit" loading={isReporting}>Ghi nhận sự cố</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
