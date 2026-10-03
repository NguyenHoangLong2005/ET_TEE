"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthHeaders } from "@/lib/auth";
import { toast } from "sonner";
import {
  AlertTriangle, RefreshCw, X, CheckCircle2, Clock,
  Search, Filter, Phone, MapPin, Hash, Truck, MessageSquare,
  RotateCcw, Package, AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────
type Exception = {
  id: number;
  shipmentId?: number;
  trackingCode?: string;
  orderCode?: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  carrierName?: string;
  exceptionType: string;
  description?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "RETURNED";
  createdAt?: string;
  resolvedAt?: string;
  resolution?: string;
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

// ─── Configs ─────────────────────────────────────────────────────────────────
const EXCEPTION_TYPES: Record<string, { label: string; icon: string; cls: string }> = {
  WRONG_ADDRESS:   { label: "Sai địa chỉ",       icon: "📍", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  NOT_AT_HOME:     { label: "Vắng nhà",           icon: "🏠", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  REFUSED:         { label: "Từ chối nhận",       icon: "🚫", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  DAMAGED:         { label: "Hàng hỏng",          icon: "📦", cls: "bg-red-100 text-red-700 border-red-200" },
  LOST:            { label: "Thất lạc",           icon: "❓", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  WRONG_ITEM:      { label: "Sai hàng",           icon: "⚠️", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  PHONE_OFF:       { label: "Không liên lạc được", icon: "📵", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  CARRIER_DELAY:   { label: "Hãng trễ",           icon: "🕐", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  OTHER:           { label: "Khác",               icon: "🔹", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const STATUS_CFG: Record<Exception["status"], { label: string; cls: string }> = {
  OPEN:        { label: "Chưa xử lý",    cls: "bg-rose-100 text-rose-700 border-rose-200" },
  IN_PROGRESS: { label: "Đang xử lý",    cls: "bg-amber-100 text-amber-700 border-amber-200" },
  RESOLVED:    { label: "Đã giải quyết", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  RETURNED:    { label: "Đã hoàn hàng",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
};

const RESOLUTION_TEMPLATES = [
  "Đã liên hệ khách hàng, khách sẽ ra bưu cục nhận trong ngày.",
  "Đã cập nhật địa chỉ mới, yêu cầu hãng giao lại vào ngày hôm sau.",
  "Khách từ chối nhận, đã yêu cầu hoàn hàng về kho.",
  "Đã liên hệ hãng vận chuyển xác nhận tình trạng và hẹn giao lại.",
];

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ShippingExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Exception["status"]>("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Resolve modal
  const [resolveModal, setResolveModal] = useState<Exception | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Report modal
  const [reportModal, setReportModal] = useState<boolean>(false);
  const [reportShipmentId, setReportShipmentId] = useState("");
  const [reportType, setReportType] = useState("NOT_AT_HOME");
  const [reportDesc, setReportDesc] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const baseUrl = getApiBaseUrl();
  const authHeaders = getAuthHeaders() as Record<string, string>;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/shipping/exceptions`, { headers: authHeaders, cache: "no-store" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể tải danh sách sự cố ngoại lệ");
      }
      const data = await res.json();
      const arr: Exception[] = Array.isArray(data) ? data : data?.data ?? [];
      setExceptions(arr);
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải danh sách sự cố");
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModal) return;
    if (!resolveNote.trim()) { toast.error("Vui lòng nhập ghi chú xử lý"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/shipping/exceptions/${resolveModal.id}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ note: resolveNote.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể xử lý ngoại lệ");
      }
      toast.success(`Đã cập nhật ngoại lệ cho đơn ${resolveModal.orderCode || `#${resolveModal.id}`}`);
      setExceptions(prev => prev.map(ex =>
        ex.id === resolveModal.id
          ? { ...ex, status: "RESOLVED", resolution: resolveNote.trim(), resolvedAt: new Date().toISOString() }
          : ex
      ));
      setResolveModal(null);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xử lý ngoại lệ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const shipmentIdNum = Number(reportShipmentId.trim());
    if (isNaN(shipmentIdNum) || shipmentIdNum <= 0) {
      toast.error("Vui lòng nhập ID vận đơn hợp lệ");
      return;
    }

    setIsReporting(true);
    try {
      const res = await fetch(`${baseUrl}/api/staff/shipping/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          shipmentId: shipmentIdNum,
          type: reportType,
          description: reportDesc.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể tạo ghi nhận ngoại lệ");
      }
      toast.success(`Đã ghi nhận ngoại lệ cho vận đơn #${shipmentIdNum}`);
      setReportModal(false);
      setReportShipmentId("");
      setReportDesc("");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi ghi nhận ngoại lệ");
    } finally {
      setIsReporting(false);
    }
  };

  // Filtered
  const filtered = exceptions.filter(ex => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (ex.trackingCode ?? "").toLowerCase().includes(q) ||
      (ex.orderCode ?? "").toLowerCase().includes(q) ||
      (ex.customerName ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || ex.status === statusFilter;
    const matchType = typeFilter === "ALL" || ex.exceptionType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const openCount = exceptions.filter(e => e.status === "OPEN").length;
  const inProgressCount = exceptions.filter(e => e.status === "IN_PROGRESS").length;
  const resolvedCount = exceptions.filter(e => e.status === "RESOLVED" || e.status === "RETURNED").length;

  const fmtDate = (iso?: string) => iso
    ? new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Ngoại Lệ Giao Hàng"
          subtitle="Theo dõi và giải quyết các sự cố phát sinh trong quá trình vận chuyển"
          breadcrumbs={[
            { label: "Bộ phận vận chuyển", href: "/staff/dashboard/shipping" },
            { label: "Ngoại lệ" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void load()}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
              >
                Làm mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setReportModal(true)}
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
              >
                Ghi nhận ngoại lệ
              </Button>
            </div>
          }
        />

        <ShippingNav active="/staff/dashboard/shipping/exceptions" />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Chưa xử lý"
            value={openCount}
            icon={AlertCircle}
            color="danger"
          />
          <StatCard
            title="Đang xử lý"
            value={inProgressCount}
            icon={Clock}
            color="warning"
          />
          <StatCard
            title="Đã giải quyết"
            value={resolvedCount}
            icon={CheckCircle2}
            color="success"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm tracking, mã đơn, tên KH..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-400">
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-400">
            <option value="ALL">Tất cả loại sự cố</option>
            {Object.entries(EXCEPTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>

        {/* Exceptions List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
            <span>Đang tải danh sách sự cố ngoại lệ...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="font-semibold text-slate-700">Không có ngoại lệ vận chuyển nào</p>
            <p className="text-xs text-slate-400 mt-1">Tất cả đơn hàng đang được lưu thông ổn định.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ex => {
              const typeCfg = EXCEPTION_TYPES[ex.exceptionType] ?? { label: ex.exceptionType, icon: "⚠️", cls: "bg-slate-100 text-slate-600 border-slate-200" };
              const statusCfg = STATUS_CFG[ex.status] ?? { label: ex.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
              const isResolved = ex.status === "RESOLVED" || ex.status === "RETURNED";

              return (
                <div key={ex.id} className={`rounded-2xl border bg-white p-5 transition shadow-2xs hover:shadow-md ${!isResolved ? "border-rose-200" : "border-slate-200"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Left Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeCfg.cls}`}>
                          {typeCfg.icon} {typeCfg.label}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                        {ex.carrierName && <span className="text-xs text-slate-500 font-medium">{ex.carrierName}</span>}
                        {ex.createdAt && <span className="text-xs text-slate-400 font-mono">Báo cáo lúc {fmtDate(ex.createdAt)}</span>}
                      </div>

                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        {ex.orderCode && (
                          <span className="font-mono font-bold text-slate-900">Đơn #{ex.orderCode}</span>
                        )}
                        {ex.trackingCode && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 font-mono text-xs text-slate-700">
                            <Hash className="w-3 h-3 text-slate-400" />
                            {ex.trackingCode}
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {ex.description && (
                        <p className="text-xs text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100">
                          {ex.description}
                        </p>
                      )}

                      {/* Resolution if exists */}
                      {ex.resolution && (
                        <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Phương án giải quyết: </span>
                            <span>{ex.resolution}</span>
                            {ex.resolvedAt && <span className="block text-[11px] text-emerald-600 mt-0.5">Thời gian: {fmtDate(ex.resolvedAt)}</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    {!isResolved && (
                      <div className="shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setResolveModal(ex);
                            setResolveNote(RESOLUTION_TEMPLATES[0]);
                          }}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Xử lý ngoại lệ
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Resolve */}
        {resolveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Xử Lý Sự Cố Giao Hàng
                </h3>
                <button onClick={() => setResolveModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Kiện hàng: <span className="font-bold text-slate-800">{resolveModal.orderCode || resolveModal.trackingCode || `#${resolveModal.id}`}</span>
              </div>

              <form onSubmit={handleResolve} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mẫu phản hồi nhanh</label>
                  <select
                    onChange={e => e.target.value && setResolveNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 mb-2"
                  >
                    <option value="">Chọn mẫu phương án...</option>
                    {RESOLUTION_TEMPLATES.map((tmpl, idx) => (
                      <option key={idx} value={tmpl}>{tmpl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chi tiết phương án giải quyết *</label>
                  <textarea
                    rows={3}
                    required
                    value={resolveNote}
                    onChange={e => setResolveNote(e.target.value)}
                    placeholder="Ghi rõ hành động xử lý (gọi khách, yêu cầu phát lại, trả hàng...)"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" type="button" onClick={() => setResolveModal(null)}>
                    Hủy
                  </Button>
                  <Button variant="primary" size="sm" type="submit" loading={isSubmitting}>
                    Hoàn tất xử lý
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Report New Exception */}
        {reportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" /> Ghi Nhận Sự Cố Giao Hàng Mới
                </h3>
                <button onClick={() => setReportModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID Kiện Hàng (Shipment ID) *</label>
                  <input
                    type="number"
                    required
                    value={reportShipmentId}
                    onChange={e => setReportShipmentId(e.target.value)}
                    placeholder="Nhập ID kiện hàng (vd: 12)"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại sự cố *</label>
                  <select
                    value={reportType}
                    onChange={e => setReportType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                  >
                    {Object.entries(EXCEPTION_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả sự cố chi tiết</label>
                  <textarea
                    rows={3}
                    value={reportDesc}
                    onChange={e => setReportDesc(e.target.value)}
                    placeholder="Ghi nhận phản ánh từ bưu tá, hãng vận chuyển hoặc khách hàng..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" type="button" onClick={() => setReportModal(false)}>
                    Hủy
                  </Button>
                  <Button variant="danger" size="sm" type="submit" loading={isReporting}>
                    Tạo báo cáo sự cố
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
