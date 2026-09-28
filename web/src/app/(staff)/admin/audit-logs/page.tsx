"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { toast } from "sonner";
import {
  ScrollText, Search, RefreshCw, Filter, Eye,
  ShieldCheck, AlertTriangle, Download, Clock, User, X
} from "lucide-react";

interface AuditLogRecord {
  id: number;
  userId?: string;
  action: string;
  targetEntity?: string;
  targetId?: string;
  description?: string;
  ipAddress?: string;
  createdAt: string;
}

interface PageResponse {
  content: AuditLogRecord[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });
      if (search.trim()) params.append("search", search.trim());

      const res: any = await apiClient.get(`/api/admin/audit-logs?${params.toString()}`);
      if (res && res.content) {
        let content: AuditLogRecord[] = res.content;
        if (actionFilter !== "ALL") {
          content = content.filter((l) => l.action?.toUpperCase().includes(actionFilter.toUpperCase()));
        }
        setLogs(content);
        setTotalElements(res.totalElements || content.length);
        setTotalPages(res.totalPages || 1);
      } else if (Array.isArray(res)) {
        let content = res;
        if (actionFilter !== "ALL") {
          content = content.filter((l) => l.action?.toUpperCase().includes(actionFilter.toUpperCase()));
        }
        setLogs(content);
        setTotalElements(content.length);
        setTotalPages(1);
      }
    } catch {
      toast.error("Không thể tải nhật ký kiểm toán");
    } finally {
      setLoading(false);
    }
  }, [page, size, search, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error("Không có dữ liệu audit để xuất");
      return;
    }

    const headers = ["ID", "Thời gian", "Actor ID", "Hành động", "Thực thể", "Target ID", "Mô tả", "IP Address"];
    const rows = logs.map((l) => [
      l.id,
      `"${new Date(l.createdAt).toLocaleString("vi-VN")}"`,
      `"${l.userId || "SYSTEM"}"`,
      `"${l.action || ""}"`,
      `"${l.targetEntity || ""}"`,
      `"${l.targetId || ""}"`,
      `"${(l.description || "").replace(/"/g, '""')}"`,
      `"${l.ipAddress || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file CSV kiểm toán thành công!");
  };

  const getActionBadge = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("DELETE") || act.includes("LOCK") || act.includes("CANCEL")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #fecaca" }}>
          {action}
        </span>
      );
    }
    if (act.includes("CREATE") || act.includes("LOGIN") || act.includes("SUCCESS")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold" style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #a7f3d0" }}>
          {action}
        </span>
      );
    }
    if (act.includes("UPDATE") || act.includes("TOGGLE") || act.includes("RESTORE")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold" style={{ background: "#FFFBEB", color: "#D97706", border: "1px solid #fde68a" }}>
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
        {action || "ACTIVITY"}
      </span>
    );
  };

  const columns: Column<AuditLogRecord>[] = [
    {
      key: "id",
      header: "Log ID",
      render: (log) => <span className="font-mono text-[11px] text-slate-400">#{log.id}</span>,
    },
    {
      key: "action",
      header: "Hành động",
      render: (log) => getActionBadge(log.action),
    },
    {
      key: "userId",
      header: "Actor",
      render: (log) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {log.userId ? `#${log.userId}` : "SYSTEM"}
        </span>
      ),
    },
    {
      key: "targetEntity",
      header: "Thực thể",
      render: (log) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {log.targetEntity || "GENERAL"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Chi tiết thao tác",
      render: (log) => (
        <span className="text-xs text-slate-700 line-clamp-1 max-w-md" title={log.description}>
          {log.description || "—"}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      render: (log) => (
        <span className="font-mono text-[11px] text-slate-500">{log.ipAddress || "127.0.0.1"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Thời gian",
      align: "right",
      render: (log) => (
        <span className="font-mono text-slate-400 text-xs whitespace-nowrap">
          {new Date(log.createdAt).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Xem",
      align: "right",
      render: (log) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => setSelectedLog(log)}
          className="text-slate-500 hover:text-slate-900"
        />
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]} requiredPermissions={["VIEW_AUDIT_LOG"]}>
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-800">
        <PageHeader
          title="Nhật Ký Kiểm Toán (Audit Logs)"
          subtitle="Giám sát an ninh, truy vết toàn bộ thao tác thay đổi dữ liệu và quản trị nhạy cảm"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "Nhật ký Audit" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportCSV}
              >
                Xuất CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
                onClick={fetchLogs}
                disabled={loading}
              >
                Làm mới
              </Button>
            </div>
          }
        />

        {/* ─── Search and Filter Bar ─── */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-flat flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Tìm kiếm theo Actor, mô tả, thực thể, địa chỉ IP..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="LOGIN">Đăng nhập (LOGIN)</option>
              <option value="CREATE">Tạo mới (CREATE)</option>
              <option value="UPDATE">Cập nhật (UPDATE)</option>
              <option value="DELETE">Xóa (DELETE)</option>
              <option value="LOCK">Khóa tài khoản (LOCK)</option>
              <option value="BACKUP">Sao lưu dữ liệu (BACKUP)</option>
            </select>
          </div>
        </div>

        {/* ─── Audit Log Table ─── */}
        <Card noPadding>
          <DataTable
            columns={columns}
            data={logs}
            loading={loading}
            rowKey={(item) => item.id}
            emptyTitle="Không tìm thấy nhật ký kiểm toán phù hợp"
            emptyMessage="Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc hành động."
            pagination={{
              currentPage: page,
              totalPages,
              totalItems: totalElements,
              onPageChange: (p) => setPage(p),
            }}
          />
        </Card>

        {/* ─── Detail Modal ─── */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-red-400" />
                  <h3 className="font-bold text-sm">Chi Tiết Bản Ghi Kiểm Toán #{selectedLog.id}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Actor ID</span>
                    <span className="font-mono font-bold text-slate-900">{selectedLog.userId || "SYSTEM"}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Thời Gian</span>
                    <span className="font-mono text-slate-900">{new Date(selectedLog.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Hành Động</span>
                    <div>{getActionBadge(selectedLog.action)}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">IP Address</span>
                    <span className="font-mono text-slate-900">{selectedLog.ipAddress || "127.0.0.1"}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Thực Thể & Target ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{selectedLog.targetEntity || "GENERAL"}</span>
                    {selectedLog.targetId && (
                      <span className="font-mono text-slate-500">ID: #{selectedLog.targetId}</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Mô Tả Thao Tác</span>
                  <p className="text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                    {selectedLog.description || "Không có mô tả chi tiết."}
                  </p>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setSelectedLog(null)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

