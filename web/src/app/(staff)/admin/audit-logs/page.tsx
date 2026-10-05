"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import { toast } from "sonner";
import { Search, RefreshCw, Download, Eye, X, RotateCcw } from "lucide-react";

interface AuditLogRecord {
  id: number;
  userId?: string;
  action: string;
  targetEntity?: string;
  targetId?: string;
  description?: string;
  ipAddress?: string;
  createdAt: string;
  // traceability fields (null on legacy rows)
  actorEmail?: string;
  actorRole?: string;
  httpMethod?: string;
  requestPath?: string;
  statusCode?: number;
  result?: string;
  userAgent?: string;
  durationMs?: number;
  requestId?: string;
  oldValue?: string;
  newValue?: string;
}

interface Filters {
  search: string;
  action: string;
  entity: string;
  actor: string;
  ip: string;
  result: string;
  method: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = {
  search: "", action: "", entity: "", actor: "", ip: "", result: "", method: "", from: "", to: "",
};

const PAGE_SIZE = 20;
const EXPORT_LIMIT = 5000;

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: "Đăng nhập",
  LOGIN_FAILED: "Đăng nhập thất bại",
  USER_REGISTER: "Đăng ký tài khoản",
  ACCESS_DENIED: "Bị từ chối truy cập",
  LOCK_USER: "Khóa tài khoản",
  UNLOCK_USER: "Mở khóa tài khoản",
  DELETE_USER: "Xóa tài khoản",
  GRANT_PERMISSION: "Cấp quyền",
  REVOKE_PERMISSION: "Thu hồi quyền",
  API_POST: "Gửi/tạo (POST)",
  API_PUT: "Cập nhật (PUT)",
  API_PATCH: "Cập nhật (PATCH)",
  API_DELETE: "Xóa (DELETE)",
};

const actionLabel = (action?: string) => (action && ACTION_LABELS[action]) || action || "Hoạt động";

const toDateInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDateTime = (value?: string, withSeconds = false) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  });
};

const inputClass =
  "w-full h-11 px-3.5 bg-white border border-slate-200 rounded-xl font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

/** Delays a fast-changing value (typing) so the API is not hit on every keystroke. */
function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ActionBadge({ action }: { action?: string }) {
  const act = (action || "").toUpperCase();
  let style = { background: "#F1F5F9", color: "#334155" }; // neutral
  if (/(DELETE|LOCK|CANCEL|DENIED|FAILED|REVOKE)/.test(act) && !act.includes("UNLOCK")) {
    style = { background: "#FEF2F2", color: "#DC2626" };
  } else if (/(CREATE|LOGIN|SUCCESS|REGISTER|GRANT|UNLOCK|API_POST)/.test(act)) {
    style = { background: "#ECFDF5", color: "#059669" };
  } else if (/(UPDATE|TOGGLE|RESTORE|API_PUT|API_PATCH)/.test(act)) {
    style = { background: "#FFFBEB", color: "#D97706" };
  }
  return (
    <span className="inline-flex max-w-full px-2 py-0.5 rounded text-xs font-semibold" style={style} title={action}>
      <span className="truncate">{actionLabel(action)}</span>
    </span>
  );
}

function ResultBadge({ result, statusCode }: { result?: string; statusCode?: number }) {
  if (!result) return <span className="text-xs text-slate-400">—</span>;
  const ok = result === "SUCCESS";
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
      {ok ? "Thành công" : "Thất bại"}
      {statusCode ? <span className="font-mono opacity-70">{statusCode}</span> : null}
    </span>
  );
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [failures, setFailures] = useState(0);

  // Filters: text inputs are debounced, the rest apply immediately
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const debouncedSearch = useDebounced(filters.search);
  const debouncedActor = useDebounced(filters.actor);
  const debouncedIp = useDebounced(filters.ip);
  const [sortAsc, setSortAsc] = useState(false);

  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const queryString = useCallback(
    (pageNumber: number, pageSize: number) => {
      const params = new URLSearchParams({
        page: String(pageNumber),
        size: String(pageSize),
        sort: sortAsc ? "asc" : "desc",
      });
      const effective: Filters = { ...filters, search: debouncedSearch, actor: debouncedActor, ip: debouncedIp };
      (Object.keys(effective) as (keyof Filters)[]).forEach((key) => {
        const value = effective[key].trim();
        if (value) params.append(key, value);
      });
      return params.toString();
    },
    [filters, debouncedSearch, debouncedActor, debouncedIp, sortAsc],
  );

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get(`/api/admin/audit-logs?${queryString(page, PAGE_SIZE)}`);
      setLogs(res?.content ?? []);
      setTotalElements(res?.totalElements ?? 0);
      setTotalPages(res?.totalPages || 1);
      setFailures(res?.summary?.failures ?? 0);
    } catch {
      toast.error("Không thể tải nhật ký kiểm toán");
    } finally {
      setLoading(false);
    }
  }, [page, queryString]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiClient.get("/api/admin/audit-logs/facets");
        setActionOptions(res?.actions ?? []);
        setEntityOptions(res?.entities ?? []);
      } catch {
        /* dropdowns simply stay empty; free-text search still works */
      }
    })();
  }, []);

  const applyRange = (days: number | null) => {
    if (days === null) {
      setFilters((prev) => ({ ...prev, from: "", to: "" }));
    } else {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - (days - 1));
      setFilters((prev) => ({ ...prev, from: toDateInput(start), to: toDateInput(today) }));
    }
    setPage(0);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  };

  const activeChips = useMemo(() => {
    const chips: { key: keyof Filters; label: string }[] = [];
    if (filters.search) chips.push({ key: "search", label: `Từ khóa: ${filters.search}` });
    if (filters.action) chips.push({ key: "action", label: `Hành động: ${actionLabel(filters.action)}` });
    if (filters.entity) chips.push({ key: "entity", label: `Đối tượng: ${filters.entity}` });
    if (filters.actor) chips.push({ key: "actor", label: `Người thực hiện: ${filters.actor}` });
    if (filters.ip) chips.push({ key: "ip", label: `IP: ${filters.ip}` });
    if (filters.result) chips.push({ key: "result", label: filters.result === "SUCCESS" ? "Thành công" : "Thất bại" });
    if (filters.method) chips.push({ key: "method", label: `Phương thức: ${filters.method}` });
    if (filters.from || filters.to) {
      chips.push({ key: "from", label: `Thời gian: ${filters.from || "…"} → ${filters.to || "…"}` });
    }
    return chips;
  }, [filters]);

  const removeChip = (key: keyof Filters) => {
    if (key === "from") setFilters((prev) => ({ ...prev, from: "", to: "" }));
    else setFilters((prev) => ({ ...prev, [key]: "" }));
    setPage(0);
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res: any = await apiClient.get(`/api/admin/audit-logs?${queryString(0, EXPORT_LIMIT)}`);
      const rows: AuditLogRecord[] = res?.content ?? [];
      if (rows.length === 0) {
        toast.error("Không có dữ liệu để xuất");
        return;
      }
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const headers = [
        "ID", "Thời gian", "Người thực hiện", "Email", "Vai trò", "Hành động", "Kết quả", "Mã HTTP", "Phương thức",
        "Đường dẫn", "Đối tượng", "Target ID", "Mô tả", "Giá trị cũ", "Giá trị mới", "IP", "Thời lượng (ms)", "Request ID", "User-Agent",
      ];
      const body = rows.map((l) =>
        [
          l.id, formatDateTime(l.createdAt, true), l.userId || "SYSTEM", l.actorEmail, l.actorRole, l.action, l.result,
          l.statusCode, l.httpMethod, l.requestPath, l.targetEntity, l.targetId, l.description, l.oldValue, l.newValue,
          l.ipAddress, l.durationMs, l.requestId, l.userAgent,
        ].map(esc).join(","),
      );
      const csv = "﻿" + [headers.map(esc).join(","), ...body].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      const total = res?.totalElements ?? rows.length;
      toast.success(
        total > rows.length
          ? `Đã xuất ${rows.length}/${total} bản ghi mới nhất (giới hạn ${EXPORT_LIMIT}). Hãy thu hẹp bộ lọc để xuất đủ.`
          : `Đã xuất ${rows.length} bản ghi`,
      );
    } catch {
      toast.error("Không thể xuất dữ liệu");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<AuditLogRecord>[] = [
    {
      key: "createdAt",
      header: "Thời gian",
      width: "150px",
      render: (log) => <span className="block truncate text-slate-600 text-sm" title={formatDateTime(log.createdAt, true)}>{formatDateTime(log.createdAt)}</span>,
    },
    {
      key: "userId",
      header: "Người thực hiện",
      width: "17%",
      render: (log) => (
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate" title={log.actorEmail || log.userId}>
            {log.actorEmail || (log.userId ? `#${log.userId}` : "Hệ thống")}
          </p>
          {log.actorRole && <p className="text-xs text-slate-500 truncate">{log.actorRole}</p>}
        </div>
      ),
    },
    { key: "action", header: "Hành động", width: "190px", render: (log) => <ActionBadge action={log.action} /> },
    { key: "result", header: "Kết quả", width: "150px", render: (log) => <ResultBadge result={log.result} statusCode={log.statusCode} /> },
    {
      key: "targetEntity",
      header: "Đối tượng",
      width: "13%",
      render: (log) => (
        <span className="block truncate text-sm text-slate-700" title={`${log.targetEntity || ""} ${log.targetId || ""}`.trim()}>
          {log.targetEntity || "—"}
          {log.targetId ? <span className="ml-1 font-mono text-xs text-slate-400">#{String(log.targetId).slice(0, 8)}</span> : null}
        </span>
      ),
    },
    {
      key: "description",
      header: "Chi tiết",
      render: (log) => (
        <span className="block truncate text-sm text-slate-700" title={log.description}>
          {log.description || "—"}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      width: "130px",
      render: (log) => <span className="block truncate font-mono text-xs text-slate-500" title={log.ipAddress}>{log.ipAddress || "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      width: "56px",
      align: "right",
      render: (log) => (
        <Button size="sm" variant="ghost" icon={<Eye className="w-4 h-4" />} onClick={() => setSelectedLog(log)} aria-label="Xem chi tiết" />
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]} requiredPermissions={["VIEW_AUDIT_LOG"]}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">
        <PageHeader
          title="Nhật ký kiểm toán"
          subtitle="Truy vết mọi thao tác thay đổi dữ liệu, đăng nhập và truy cập bị từ chối: ai, từ đâu, lúc nào và kết quả ra sao."
          actions={
            <div className="flex items-center gap-2.5">
              <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV} loading={exporting}>
                Xuất CSV
              </Button>
              <Button
                variant="secondary"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={fetchLogs}
                loading={loading}
              >
                Làm mới
              </Button>
            </div>
          }
        />

        {/* ─── Bộ lọc ─── */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              placeholder="Tìm theo từ khóa: người thực hiện, mô tả, đường dẫn, Request ID, IP..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select value={filters.action} onChange={(e) => setFilter("action", e.target.value)} className={inputClass} aria-label="Hành động">
              <option value="">Tất cả hành động</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>{actionLabel(a)}{ACTION_LABELS[a] ? ` (${a})` : ""}</option>
              ))}
            </select>
            <select value={filters.entity} onChange={(e) => setFilter("entity", e.target.value)} className={inputClass} aria-label="Đối tượng">
              <option value="">Tất cả đối tượng</option>
              {entityOptions.map((en) => (
                <option key={en} value={en}>{en}</option>
              ))}
            </select>
            <select value={filters.result} onChange={(e) => setFilter("result", e.target.value)} className={inputClass} aria-label="Kết quả">
              <option value="">Mọi kết quả</option>
              <option value="SUCCESS">Thành công</option>
              <option value="FAILURE">Thất bại</option>
            </select>
            <select value={filters.method} onChange={(e) => setFilter("method", e.target.value)} className={inputClass} aria-label="Phương thức">
              <option value="">Mọi phương thức</option>
              {["POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              value={filters.actor}
              onChange={(e) => setFilter("actor", e.target.value)}
              placeholder="Người thực hiện"
              className={inputClass}
              aria-label="Người thực hiện"
            />
            <input
              type="text"
              value={filters.ip}
              onChange={(e) => setFilter("ip", e.target.value)}
              placeholder="Địa chỉ IP"
              className={inputClass}
              aria-label="Địa chỉ IP"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500 shrink-0">Từ</span>
              <input
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => setFilter("from", e.target.value)}
                className={inputClass}
                aria-label="Từ ngày"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500 shrink-0">Đến</span>
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => setFilter("to", e.target.value)}
                className={inputClass}
                aria-label="Đến ngày"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-sm font-medium text-slate-500 mr-1">Khoảng thời gian nhanh:</span>
            {[
              { label: "Hôm nay", days: 1 },
              { label: "7 ngày", days: 7 },
              { label: "30 ngày", days: 30 },
              { label: "Tất cả", days: null as number | null },
            ].map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => applyRange(r.days)}
                className="h-8 px-3.5 rounded-full border border-slate-200 bg-white font-sans text-sm font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
              >
                {r.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => { setSortAsc((v) => !v); setPage(0); }}
              className="h-8 px-3.5 rounded-full border border-slate-200 bg-white font-sans text-sm font-medium text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              {sortAsc ? "Cũ nhất trước" : "Mới nhất trước"}
            </button>
          </div>

          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeChip(chip.key)}
                  className="inline-flex items-center gap-1.5 pl-3 pr-2 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-sans text-sm font-medium text-slate-700 transition-colors"
                  aria-label={`Bỏ lọc ${chip.label}`}
                >
                  {chip.label}
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ))}
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-primary hover:underline ml-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* ─── Tổng kết theo bộ lọc ─── */}
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-900">{totalElements.toLocaleString("vi-VN")}</span> bản ghi
          <span className="mx-2 text-slate-300">·</span>
          <span className={`font-bold ${failures > 0 ? "text-rose-600" : "text-slate-900"}`}>{failures.toLocaleString("vi-VN")}</span> thất bại
        </p>

        {/* ─── Bảng nhật ký ─── */}
        <Card noPadding>
          <DataTable
            columns={columns}
            data={logs}
            loading={loading}
            fixedLayout
            rowKey={(item) => item.id}
            onRowClick={(log) => setSelectedLog(log)}
            emptyTitle="Không tìm thấy nhật ký phù hợp"
            emptyMessage="Thử thay đổi từ khóa hoặc bỏ bớt bộ lọc."
            pagination={{
              currentPage: page,
              totalPages,
              totalItems: totalElements,
              onPageChange: (p) => setPage(p),
            }}
          />
        </Card>

        {/* ─── Chi tiết một bản ghi ─── */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold text-slate-900">Chi tiết bản ghi #{selectedLog.id}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  aria-label="Đóng"
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3.5 text-sm overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Thời gian">{formatDateTime(selectedLog.createdAt, true)}</Field>
                  <Field label="Kết quả">
                    <ResultBadge result={selectedLog.result} statusCode={selectedLog.statusCode} />
                  </Field>
                  <Field label="Người thực hiện">
                    <span className="font-semibold">{selectedLog.actorEmail || selectedLog.userId || "Hệ thống"}</span>
                    {selectedLog.actorRole && <span className="ml-2 text-xs text-slate-500">({selectedLog.actorRole})</span>}
                    {selectedLog.actorEmail && selectedLog.userId && selectedLog.userId !== selectedLog.actorEmail && (
                      <p className="font-mono text-xs text-slate-400 mt-0.5 break-all">ID: {selectedLog.userId}</p>
                    )}
                  </Field>
                  <Field label="Hành động"><ActionBadge action={selectedLog.action} /></Field>
                  <Field label="Địa chỉ IP"><span className="font-mono text-xs">{selectedLog.ipAddress || "—"}</span></Field>
                  <Field label="Thời lượng xử lý">{selectedLog.durationMs != null ? `${selectedLog.durationMs} ms` : "—"}</Field>
                </div>

                {(selectedLog.httpMethod || selectedLog.requestPath) && (
                  <Field label="Yêu cầu">
                    <span className="font-mono text-xs break-all">
                      {selectedLog.httpMethod} {selectedLog.requestPath}
                    </span>
                  </Field>
                )}

                <Field label="Đối tượng bị tác động">
                  <span className="font-semibold">{selectedLog.targetEntity || "—"}</span>
                  {selectedLog.targetId && <span className="ml-2 font-mono text-xs text-slate-500 break-all">ID: {selectedLog.targetId}</span>}
                </Field>

                <Field label="Mô tả">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedLog.description || "Không có mô tả chi tiết."}</p>
                </Field>

                {(selectedLog.oldValue || selectedLog.newValue) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Giá trị trước">
                      <pre className="text-xs whitespace-pre-wrap break-all font-mono text-slate-700">{selectedLog.oldValue || "—"}</pre>
                    </Field>
                    <Field label="Giá trị sau">
                      <pre className="text-xs whitespace-pre-wrap break-all font-mono text-slate-700">{selectedLog.newValue || "—"}</pre>
                    </Field>
                  </div>
                )}

                {(selectedLog.requestId || selectedLog.userAgent) && (
                  <div className="grid grid-cols-1 gap-3">
                    {selectedLog.requestId && (
                      <Field label="Request ID">
                        <button
                          type="button"
                          onClick={() => { setFilters({ ...EMPTY_FILTERS, search: selectedLog.requestId! }); setPage(0); setSelectedLog(null); }}
                          className="font-mono text-xs text-primary hover:underline"
                          title="Xem mọi bản ghi cùng yêu cầu này"
                        >
                          {selectedLog.requestId}
                        </button>
                      </Field>
                    )}
                    {selectedLog.userAgent && (
                      <Field label="Thiết bị / trình duyệt">
                        <span className="text-xs text-slate-600 break-all">{selectedLog.userAgent}</span>
                      </Field>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                <Button variant="secondary" onClick={() => setSelectedLog(null)}>Đóng</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
      <span className="text-xs text-slate-500 uppercase font-bold block mb-1">{label}</span>
      <div className="text-slate-900">{children}</div>
    </div>
  );
}
