"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  AlertTriangle, RefreshCw, X, CheckCircle2, Clock,
  Search, Filter, Phone, MapPin, Hash, Truck, MessageSquare,
  RotateCcw, Package, AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  ShippingExceptionItem, toShippingException, toShipment, Shipment, canReportException,
  asList, fmtDateTime, EXCEPTION_TYPES, carrierLabel } from '@/lib/shipping';

type Exception = ShippingExceptionItem;
type ExStatus = "OPEN" | "RESOLVED" | "RETURNED";


// ─── Configs ─────────────────────────────────────────────────────────────────
// Backend chỉ có OPEN -> RESOLVED (tiếp tục giao) hoặc RETURNED (hoàn về kho).
const STATUS_CFG: Record<ExStatus, { label: string; cls: string }> = {
  OPEN:        { label: "Chưa xử lý",    cls: "bg-rose-100 text-rose-700 border-rose-200" },
  RESOLVED:    { label: "Đã giải quyết", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  RETURNED:    { label: "Đã hoàn hàng",  cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

// Mẫu theo từng hướng xử lý: trước đây chung một danh sách nên chọn "Hoàn hàng về kho"
// vẫn giữ ghi chú "khách sẽ ra bưu cục nhận".
const CONTINUE_TEMPLATES = [
  "Đã liên hệ khách hàng, khách sẽ ra bưu cục nhận trong ngày.",
  "Đã cập nhật địa chỉ mới, yêu cầu hãng giao lại vào ngày hôm sau.",
  "Đã liên hệ hãng vận chuyển xác nhận tình trạng và hẹn giao lại.",
];
const RETURN_TEMPLATES = [
  "Khách từ chối nhận, đã yêu cầu hoàn hàng về kho.",
  "Không liên lạc được khách sau nhiều lần giao, hoàn hàng về kho.",
  "Hàng hư hỏng trong quá trình vận chuyển, hoàn về kho để xử lý.",
];
const templatesFor = (returning: boolean) => (returning ? RETURN_TEMPLATES : CONTINUE_TEMPLATES);

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ShippingExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ExStatus>("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Resolve modal
  const [resolveModal, setResolveModal] = useState<Exception | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [returnToSender, setReturnToSender] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Hoàn hàng hủy đơn và cộng lại tồn kho, không hoàn tác được: hỏi lại trước khi gửi.
  const [confirmReturn, setConfirmReturn] = useState(false);

  // Đổi hướng xử lý: nếu ghi chú vẫn là một mẫu chưa sửa thì đổi sang mẫu của hướng mới.
  const chooseAction = (returning: boolean) => {
    setReturnToSender(returning);
    if (!resolveNote.trim() || [...CONTINUE_TEMPLATES, ...RETURN_TEMPLATES].includes(resolveNote)) {
      setResolveNote(templatesFor(returning)[0]);
    }
  };

  // Report modal
  const [reportModal, setReportModal] = useState<boolean>(false);
  const [reportShipmentId, setReportShipmentId] = useState("");
  const [reportable, setReportable] = useState<Shipment[]>([]);
  const [reportType, setReportType] = useState("NOT_AT_HOME");
  const [reportDesc, setReportDesc] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const load = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    try {
      const data = await apiClient.get<any>("/api/staff/shipping/exceptions");
      setExceptions(asList(data).map(toShippingException));
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải danh sách sự cố");
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModal) return;
    if (!resolveNote.trim()) { toast.error("Vui lòng nhập ghi chú xử lý"); return; }
    if (returnToSender) { setConfirmReturn(true); return; }
    void submitResolve();
  };

  const submitResolve = async () => {
    if (!resolveModal) return;
    setConfirmReturn(false);
    setIsSubmitting(true);
    try {
      await apiClient.put(`/api/staff/shipping/exceptions/${resolveModal.id}/resolve`, {
        note: resolveNote.trim(),
        returnToSender,
      });
      toast.success(`Đã cập nhật ngoại lệ cho đơn ${resolveModal.orderCode || `#${resolveModal.id}`}`);
      setExceptions(prev => prev.map(ex =>
        ex.id === resolveModal.id
          ? { ...ex, status: returnToSender ? "RETURNED" : "RESOLVED", resolution: resolveNote.trim() }
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
      toast.error("Vui lòng chọn kiện hàng");
      return;
    }

    setIsReporting(true);
    try {
      await apiClient.post("/api/staff/shipping/exceptions", {
        shipmentId: shipmentIdNum,
        type: reportType,
        description: reportDesc.trim() || undefined,
      });
      toast.success("Đã ghi nhận sự cố cho kiện hàng");
      setReportModal(false);
      setReportShipmentId("");
      setReportDesc("");
      await load(true);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi ghi nhận ngoại lệ");
    } finally {
      setIsReporting(false);
    }
  };

  const openReport = async () => {
    setReportModal(true);
    setReportShipmentId("");
    try {
      const data = await apiClient.get<any>("/api/staff/shipping/shipments");
      setReportable(asList(data).map(toShipment).filter(canReportException));
    } catch (err: any) {
      toast.error(err?.message || "Không thể tải danh sách kiện hàng");
      setReportable([]);
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
  const resolvedCount = exceptions.filter(e => e.status === "RESOLVED").length;
  const returnedCount = exceptions.filter(e => e.status === "RETURNED").length;

  const fmtDate = fmtDateTime;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Ngoại lệ giao hàng"
          subtitle="Theo dõi và giải quyết các sự cố phát sinh trong quá trình vận chuyển"
          breadcrumbs={[
            { label: "Bộ phận vận chuyển", href: "/staff/dashboard/shipping/dashboard" },
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
                onClick={() => void openReport()}
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
              >
                Ghi nhận ngoại lệ
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Chưa xử lý"
            value={openCount}
            icon={AlertCircle}
            color="danger"
          />
          <StatCard
            title="Đã xử lý, tiếp tục giao"
            value={resolvedCount}
            icon={CheckCircle2}
            color="slate"
          />
          <StatCard
            title="Đã hoàn về kho"
            value={returnedCount}
            icon={RotateCcw}
            color="slate"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm tracking, mã đơn, tên KH..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-primary">
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-primary">
            <option value="ALL">Tất cả loại sự cố</option>
            {Object.entries(EXCEPTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>

        {/* Exceptions List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <span>Đang tải danh sách sự cố ngoại lệ...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            {exceptions.length === 0 ? (
              <>
                <p className="font-semibold text-slate-700">Không có ngoại lệ vận chuyển nào</p>
                <p className="text-xs text-slate-400 mt-1">Tất cả đơn hàng đang được lưu thông ổn định.</p>
              </>
            ) : (
              // Trước đây bộ lọc ẩn hết kết quả vẫn báo "lưu thông ổn định" dù còn sự cố.
              <>
                <p className="font-semibold text-slate-700">Không có sự cố khớp bộ lọc</p>
                <p className="text-xs text-slate-400 mt-1">
                  Có {exceptions.length} sự cố{openCount > 0 ? `, ${openCount} chưa xử lý` : ""}.{" "}
                  <button type="button" className="font-semibold text-slate-700 underline-offset-2 hover:underline"
                    onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setTypeFilter("ALL"); }}>
                    Xóa bộ lọc
                  </button>
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ex => {
              const typeCfg = EXCEPTION_TYPES[ex.exceptionType] ?? { label: ex.exceptionType, icon: "⚠️", cls: "bg-slate-100 text-slate-600 border-slate-200" };
              const statusCfg = STATUS_CFG[ex.status as ExStatus] ?? { label: ex.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
              const isResolved = ex.status === "RESOLVED" || ex.status === "RETURNED";

              return (
                <div key={ex.id} className={`rounded-xl border bg-white p-5 transition shadow-2xs hover:shadow-md ${!isResolved ? "border-rose-200" : "border-slate-200"}`}>
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
                        {ex.carrierName && <span className="text-xs text-slate-500 font-medium">{carrierLabel(ex.carrierName)}</span>}
                        {ex.createdAt && <span className="text-xs text-slate-400 font-mono">Báo cáo lúc {fmtDate(ex.createdAt)}</span>}
                      </div>

                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        {ex.orderCode && (
                          <span className="font-mono font-bold text-slate-900">Đơn {ex.orderCode}</span>
                        )}
                        {ex.trackingCode && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 font-mono text-xs text-slate-700">
                            <Hash className="w-3 h-3 text-slate-400" />
                            {ex.trackingCode}
                          </div>
                        )}
                      </div>

                      {(ex.customerName || ex.customerPhone || ex.shippingAddress) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          {ex.customerName && <span className="font-semibold text-slate-700">{ex.customerName}</span>}
                          {ex.customerPhone && <span className="inline-flex items-center gap-1 font-mono"><Phone className="w-3 h-3" />{ex.customerPhone}</span>}
                          {ex.shippingAddress && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{ex.shippingAddress}</span>}
                        </div>
                      )}

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
                            setReturnToSender(false);
                            setResolveNote(CONTINUE_TEMPLATES[0]);
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
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-slate-400" /> Xử Lý Sự Cố Giao Hàng
                </h3>
                <button onClick={() => setResolveModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Kiện hàng: <span className="font-bold text-slate-800">{resolveModal.orderCode || resolveModal.trackingCode || `#${resolveModal.id}`}</span>
              </div>

              <form onSubmit={handleResolve} className="space-y-4">
                <fieldset>
                  <legend className="block text-xs font-semibold text-slate-700 mb-1">Hướng xử lý *</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs cursor-pointer ${!returnToSender ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                      <input type="radio" name="resolve-action" checked={!returnToSender} onChange={() => chooseAction(false)} />
                      Tiếp tục giao hàng
                    </label>
                    <label className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs cursor-pointer ${returnToSender ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                      <input type="radio" name="resolve-action" checked={returnToSender} onChange={() => chooseAction(true)} />
                      Hoàn hàng về kho
                    </label>
                  </div>
                  {returnToSender && (
                    <p className="mt-2 text-[11px] text-orange-700">
                      Đơn hàng sẽ bị hủy, hàng được cộng lại vào kho và tồn bán; đơn đã thanh toán chuyển sang chờ hoàn tiền.
                    </p>
                  )}
                </fieldset>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mẫu phản hồi nhanh</label>
                  <select
                    value=""
                    onChange={e => e.target.value && setResolveNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-400 mb-2"
                  >
                    <option value="">Chọn mẫu phương án...</option>
                    {templatesFor(returnToSender).map((tmpl, idx) => (
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
                  <Button variant={returnToSender ? "danger" : "primary"} size="sm" type="submit" loading={isSubmitting}>
                    {returnToSender ? "Hoàn hàng về kho" : "Hoàn tất xử lý"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmReturn}
          onClose={() => setConfirmReturn(false)}
          onConfirm={() => void submitResolve()}
          isLoading={isSubmitting}
          title="Hoàn hàng về kho?"
          message={`Đơn ${resolveModal?.orderCode ?? ""} sẽ bị hủy, hàng được cộng lại vào kho và tồn bán; đơn đã thanh toán chuyển sang chờ hoàn tiền. Thao tác này không hoàn tác được.`}
          confirmText="Hoàn hàng về kho"
          type="danger"
        />

        {/* Modal Report New Exception */}
        {reportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kiện hàng *</label>
                  <select
                    required
                    value={reportShipmentId}
                    onChange={e => setReportShipmentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                  >
                    <option value="">{reportable.length ? "Chọn kiện đang xử lý..." : "Không có kiện nào đang giao"}</option>
                    {reportable.map(sh => (
                      <option key={sh.id} value={sh.id}>
                        {sh.orderCode ?? `#${sh.id}`} · {sh.trackingCode} · {sh.customerName ?? ""}
                      </option>
                    ))}
                  </select>
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
    </div>
  );
}
