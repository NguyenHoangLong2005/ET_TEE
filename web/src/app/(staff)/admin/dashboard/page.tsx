"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Mail,
  ScrollText,
  Server,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Shield,
  Database,
  Clock,
  Cpu,
  Activity,
  UserCog,
  BarChart2,
  Settings,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatGreetingName } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { StatCard } from "@/components/dashboard/DashboardComponents";
/* ─── Interfaces ─── */ interface MonitoringData {
  jvm: {
    usedMemoryMb: number;
    totalMemoryMb: number;
    systemLoad: number;
    processors: number;
    threadCount: number;
  };
  database: {
    engine?: string;
    activeConnections?: number;
    totalConnections?: number;
  };
  orders?: { totalOrders: number; pendingOrders: number; activeOrders: number };
  recentErrors?: number;
  uptime?: { uptimeFormatted: string };
}
interface SystemAuditItem {
  id: string | number;
  userId?: string | number;
  actorId?: string | number;
  action: string;
  targetEntity?: string;
  entityType?: string;
  targetId?: string | number;
  description?: string;
  createdAt: string;
}
interface CskhAuditItem {
  id: string | number;
  actorId: string | number;
  actorName?: string;
  actorRole?: string;
  actorShopId?: string | number;
  searchType: string;
  searchQuery: string;
  foundOrderId?: string | number;
  foundOrderCode?: string;
  status: string;
  createdAt: string;
}
interface EmailLogItem {
  id: string | number;
  recipient?: string;
  recipientEmail?: string;
  subject: string;
  status: string;
  errorMessage?: string;
  createdAt?: string;
  sentAt?: string;
}
/* ─── Helper ─── */ const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};
/* ─── Mini Progress Bar ─── */ function ProgressBar({
  value,
  max = 100,
  colorClass,
}: {
  value: number;
  max?: number;
  colorClass: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
      {" "}
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${pct}%` }}
      />{" "}
    </div>
  );
}
/* ─── Quick Actions ─── */ const QUICK_ACTIONS = [
  { label: "Quản lý User", icon: Users, href: "/admin/users" },
  { label: "Phân quyền", icon: Shield, href: "/admin/rbac" },
  { label: "Audit Logs", icon: ScrollText, href: "/admin/audit-logs" },
  { label: "Email Logs", icon: Mail, href: "/admin/mailing" },
  { label: "Monitoring", icon: Activity, href: "/admin/monitoring" },
  { label: "Cài đặt", icon: Settings, href: "/admin/settings" },
];
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [systemAuditLogs, setSystemAuditLogs] = useState<SystemAuditItem[]>([]);
  const [cskhAuditLogs, setCskhAuditLogs] = useState<CskhAuditItem[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [userTotal, setUserTotal] = useState<number | null>(null);
  const [userActive, setUserActive] = useState<number | null>(null);
  const [userLocked, setUserLocked] = useState<number | null>(null);
  const [emailStats, setEmailStats] = useState({
    total: 0,
    failed: 0,
    sent: 0,
  });
  const [auditTab, setAuditTab] = useState<"access" | "data" | "finance" | "cskh" | "system">("access");
  // Moi khoi co co loading rieng: truoc day mot co `loading` duy nhat chi tat khi
  // request cham nhat xong, nen ca dashboard hien "..." theo endpoint te nhat.
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [refreshing, setRefreshing] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const fetchAllData = useCallback(async () => {
    setRefreshing(true);
    setLoadingUsers(true);
    setLoadingAudit(true);
    setLoadingEmail(true);
    try {
      await Promise.allSettled([
        apiClient
          .get<any>("/api/admin/monitoring")
          .then((d) => {
            if (d) setMonitoring(d);
          })
          .catch(() => {}),
        apiClient
          .get<any>("/api/admin/audit-logs?page=0&size=10")
          .finally(() => setLoadingAudit(false))
          .then((d) => {
            setSystemAuditLogs(
              Array.isArray(d) ? d : (d?.content ?? d?.items ?? []),
            );
          })
          .catch(() => {
            setSystemAuditLogs([]);
          }),
        apiClient
          .get<any>("/api/staff/cskh/audit-logs?page=0&size=10")
          .then((d) => {
            setCskhAuditLogs(
              Array.isArray(d) ? d : (d?.items ?? d?.content ?? []),
            );
          })
          .catch(() => {
            setCskhAuditLogs([]);
          }),
        apiClient
          .get<any>("/api/admin/mailing/logs?page=0&size=20")
          .catch(() =>
            apiClient.get<any>("/api/admin/email-logs?page=0&size=20"),
          )
          .finally(() => setLoadingEmail(false))
          .then((d) => {
            const items = Array.isArray(d) ? d : (d?.content ?? d?.items ?? []);
            setEmailLogs(items.slice(0, 10));
            const total = d?.totalElements ?? items.length;
            const failed = items.filter(
              (e: any) => e.status === "FAILED",
            ).length;
            const sent = items.filter((e: any) => e.status === "SENT").length;
            setEmailStats({ total, failed, sent });
          })
          .catch(() => {
            setEmailLogs([]);
            setEmailStats({ total: 0, failed: 0, sent: 0 });
          }),
        // Dung endpoint thong ke (COUNT ... GROUP BY) thay vi tai 100 user ve roi dem
        // trong browser: nhe hon ~32KB va khong phu thuoc vao page size.
        apiClient
          .get<any>("/api/admin/users/stats")
          .finally(() => setLoadingUsers(false))
          .then((d) => {
            setUserTotal(d?.total ?? 0);
            setUserActive(d?.active ?? 0);
            setUserLocked(d?.locked ?? 0);
          })
          .catch(() => {
            setUserTotal(null);
            setUserActive(null);
            setUserLocked(null);
          }),
      ]);
    } finally {
      setRefreshing(false);
      setLastRefresh(new Date());
    }
  }, []);
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  const firstName = formatGreetingName(user?.fullName, user?.email);
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Chào buổi sáng"
      : hour < 18
        ? "Chào buổi chiều"
        : "Chào buổi tối";
  const jvmMemPct = monitoring?.jvm
    ? Math.min(
        100,
        Math.round(
          (monitoring.jvm.usedMemoryMb / monitoring.jvm.totalMemoryMb) * 100,
        ),
      )
    : 0;
  const jvmMemColor =
    jvmMemPct > 80
      ? "bg-rose-500"
      : jvmMemPct > 60
        ? "bg-amber-400"
        : "bg-emerald-500";
  const jvmTone =
    jvmMemPct > 80 ? "danger" : jvmMemPct > 60 ? "warning" : "success";
  const dbActive = monitoring?.database?.activeConnections ?? null;
  const dbTotal = monitoring?.database?.totalConnections ?? null;
  const dbPct =
    dbActive !== null && dbTotal && dbTotal > 0
      ? Math.round((dbActive / dbTotal) * 100)
      : 0;
  const dbColor =
    dbPct > 80 ? "bg-rose-500" : dbPct > 50 ? "bg-amber-400" : "bg-emerald-500";
  /* ─── System health state derivation ─── */ 
  const getFilteredLogs = () => {
    if (auditTab === "cskh") return cskhAuditLogs;
    if (!systemAuditLogs) return [];
    
    if (auditTab === "access") {
      return systemAuditLogs.filter((log: any) => log.action?.includes('LOGIN') || log.action?.includes('LOGOUT') || log.action?.includes('AUTH') || log.action?.includes('ROLE') || log.action?.includes('PASSWORD'));
    }
    if (auditTab === "data") {
      return systemAuditLogs.filter((log: any) => log.action?.includes('CREATE') || log.action?.includes('UPDATE') || log.action?.includes('DELETE') || log.action?.includes('SETTING'));
    }
    if (auditTab === "finance") {
      return systemAuditLogs.filter((log: any) => log.action?.includes('PAYMENT') || log.action?.includes('ORDER') || log.action?.includes('REFUND') || log.action?.includes('INVENTORY') || log.action?.includes('STOCK'));
    }
    if (auditTab === "system") {
      return systemAuditLogs.filter((log: any) => log.action?.includes('SYSTEM') || log.action?.includes('SYNC') || log.action?.includes('BACKUP') || log.action?.includes('CRON'));
    }
    
    return systemAuditLogs;
  };
  const currentLogs = getFilteredLogs();

  const hasError =
    !monitoring || (monitoring?.recentErrors ?? 0) > 0 || jvmMemPct > 85;
  const hasWarning = !hasError && (jvmMemPct > 60 || emailStats.failed > 0);
  const healthBannerStyle = hasError
    ? "bg-amber-50 border-amber-200 text-amber-900"
    : hasWarning
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-emerald-50 border-emerald-200 text-emerald-900";
  const healthBannerLabel = !monitoring
    ? "Đang tải dữ liệu hệ thống..."
    : (monitoring?.recentErrors ?? 0) > 0
      ? `Phát hiện ${monitoring.recentErrors} lỗi gần đây — cần kiểm tra`
      : jvmMemPct > 85
        ? `Tải JVM cao (${jvmMemPct}%) — cần theo dõi`
        : emailStats.failed > 0
          ? `${emailStats.failed} email gửi thất bại`
          : "Hệ thống đang hoạt động bình thường";
  /* ─── Column Definitions ─── */ const systemAuditColumns: Column<SystemAuditItem>[] =
    [
      {
        key: "action",
        header: "Hành động",
        render: (log) => (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
            {" "}
            {log.action || "ACTIVITY"}{" "}
          </span>
        ),
      },
      {
        key: "userId",
        header: "Actor",
        render: (log) => (
          <span className="font-mono text-slate-500 text-[11px] truncate inline-block max-w-[150px] align-bottom" title={log.userId ? `#${log.userId}` : log.actorId ? `#${log.actorId}` : "System"}>
            {log.userId ? `#${log.userId}` : log.actorId ? `#${log.actorId}` : "System"}
          </span>
        ),
      },
      {
        key: "targetEntity",
        header: "Thực thể",
        render: (log) => (
          <span className="font-mono text-slate-500 text-[11px]">
            {log.targetEntity || log.entityType || "—"}
          </span>
        ),
      },
      {
        key: "description",
        header: "Mô tả",
        render: (log) => {
          const desc =
            log.description || (log.targetId ? `ID: ${log.targetId}` : "—");
          return (
            <span className="text-slate-600 line-clamp-1" title={desc}>
              {desc}
            </span>
          );
        },
      },
      {
        key: "createdAt",
        header: "Thời gian",
        align: "right",
        render: (log) => (
          <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
            {formatDate(log.createdAt)}
          </span>
        ),
      },
    ];
  const cskhAuditColumns: Column<CskhAuditItem>[] = [
    {
      key: "actorName",
      header: "NV CSKH",
      render: (log) => (
        <div>
          {" "}
          <span className="font-bold text-slate-900">
            {log.actorName || `ID: ${log.actorId}`}
          </span>{" "}
          {log.actorRole && (
            <span className="ml-1 text-[10px] text-slate-400">
              ({log.actorRole})
            </span>
          )}{" "}
        </div>
      ),
    },
    {
      key: "searchType",
      header: "Loại",
      render: (log) => (
        <span className="font-mono text-[11px] text-slate-500">
          {log.searchType}
        </span>
      ),
    },
    {
      key: "searchQuery",
      header: "Từ khóa",
      render: (log) => (
        <span className="font-mono font-medium text-slate-700">
          {log.searchQuery}
        </span>
      ),
    },
    {
      key: "foundOrderCode",
      header: "Đơn tìm thấy",
      render: (log) => (
        <span className="font-mono font-bold text-slate-900">
          {log.foundOrderCode || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Kết quả",
      render: (log) => {
        const s = (log.status || "").toUpperCase();
        return (
          <StatusBadge
            tone={
              s === "SUCCESS"
                ? "success"
                : s === "FORBIDDEN"
                  ? "danger"
                  : "warning"
            }
            label={
              s === "SUCCESS"
                ? "Thành công"
                : s === "FORBIDDEN"
                  ? "Bị cấm"
                  : log.status
            }
          />
        );
      },
    },
    {
      key: "createdAt",
      header: "Thời gian",
      align: "right",
      render: (log) => (
        <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
          {formatDate(log.createdAt)}
        </span>
      ),
    },
  ];
  const emailLogColumns: Column<EmailLogItem>[] = [
    {
      key: "subject",
      header: "Tiêu đề",
      render: (log) => (
        <span
          className="font-semibold text-slate-800 line-clamp-1"
          title={log.subject}
        >
          {log.subject || "—"}
        </span>
      ),
    },
    {
      key: "recipient",
      header: "Người nhận",
      render: (log) => (
        <span className="font-mono text-slate-600 text-[11px]">
          {log.recipientEmail || log.recipient || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (log) => {
        const s = (log.status || "").toUpperCase();
        return (
          <StatusBadge
            tone={
              s === "SENT" || s === "SUCCESS"
                ? "success"
                : s === "FAILED"
                  ? "danger"
                  : "warning"
            }
            label={
              s === "SENT" ? "Đã gửi" : s === "FAILED" ? "Thất bại" : log.status
            }
          />
        );
      },
    },
    {
      key: "createdAt",
      header: "Thời gian",
      align: "right",
      render: (log) => (
        <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
          {formatDate(log.createdAt || log.sentAt)}
        </span>
      ),
    },
  ];
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-800">
      {" "}
      {/* -- Health Banner & Actions -- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className={`flex-1 rounded-xl border px-4 py-2.5 flex items-center gap-3 ${healthBannerStyle}`}>
          {hasError || hasWarning ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span className="text-sm font-semibold">{healthBannerLabel}</span>
          {monitoring && (
            <span className="ml-auto text-xs opacity-60 font-mono whitespace-nowrap hidden sm:block">
              JVM {jvmMemPct}% {dbTotal ? ` · DB ${dbPct}%` : ""}
              {monitoring.uptime?.uptimeFormatted ? ` · Uptime ${monitoring.uptime.uptimeFormatted}` : ""}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 bg-white"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />}
          onClick={fetchAllData}
          disabled={refreshing}
        >
          Làm mới
        </Button>
      </div>
      {/* ─── Metric Cards ─── */}{" "}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {" "}
        <StatCard
          title="Tài khoản Nhân sự"
          value={loadingUsers ? "..." : (userTotal ?? "—")}
          icon={Users}
          tone="default"
          subtitle={
            userActive !== null
              ? `${userActive} hoạt động · ${userLocked ?? 0} bị khóa`
              : "Tổng số tài khoản hệ thống"
          }
        />{" "}
        <StatCard
          title="Nhật ký Audit"
          value={`${systemAuditLogs.length + cskhAuditLogs.length} logs`}
          icon={ScrollText}
          tone="default"
          subtitle="Giám sát hành vi quản trị & CSKH"
        />{" "}
        <StatCard
          title="Hệ thống Email"
          value={`${emailStats.sent} / ${emailStats.total}`}
          icon={Mail}
          tone={emailStats.failed > 0 ? "danger" : "success"}
          subtitle={
            emailStats.failed > 0
              ? `${emailStats.failed} email gửi lỗi cần kiểm tra`
              : "Tất cả email gửi thành công"
          }
        />{" "}
        <StatCard
          title="Tải JVM"
          value={monitoring ? `${jvmMemPct}%` : "—"}
          icon={Server}
          tone={jvmTone}
          subtitle={
            monitoring?.jvm
              ? `${monitoring.jvm.usedMemoryMb} / ${monitoring.jvm.totalMemoryMb} MB RAM`
              : "Đang tải dữ liệu..."
          }
        />{" "}
      </div>{" "}
      {/* ─── System Health Detail — 1 card, 3 columns ─── */}{" "}
      {monitoring && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {" "}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {" "}
            {/* JVM */}{" "}
            <div className="p-5">
              {" "}
              <div className="flex items-center gap-2 mb-3">
                {" "}
                <Cpu className="w-4 h-4 text-slate-400 shrink-0" />{" "}
                <div>
                  {" "}
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    JVM Runtime
                  </p>{" "}
                  <p className="text-[10px] text-slate-400">
                    {" "}
                    {monitoring.jvm.processors} cores · Load{" "}
                    {monitoring.jvm.systemLoad?.toFixed(2) ?? "—"}{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex items-end justify-between mb-1">
                {" "}
                <span className="text-xs text-slate-500">Bộ nhớ heap</span>{" "}
                <span className="text-sm font-bold text-slate-900">
                  {jvmMemPct}%
                </span>{" "}
              </div>{" "}
              <ProgressBar value={jvmMemPct} colorClass={jvmMemColor} />{" "}
              <p className="text-[10px] text-slate-400 mt-1.5">
                {" "}
                {monitoring.jvm.usedMemoryMb} MB /{" "}
                {monitoring.jvm.totalMemoryMb} MB · {monitoring.jvm.threadCount}{" "}
                threads{" "}
              </p>{" "}
            </div>{" "}
            {/* Database */}{" "}
            <div className="p-5">
              {" "}
              <div className="flex items-center gap-2 mb-3">
                {" "}
                <Database className="w-4 h-4 text-slate-400 shrink-0" />{" "}
                <div>
                  {" "}
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Database
                  </p>{" "}
                  <p className="text-[10px] text-slate-400">
                    {monitoring.database?.engine || "PostgreSQL"}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex items-end justify-between mb-1">
                {" "}
                <span className="text-xs text-slate-500">
                  Kết nối hoạt động
                </span>{" "}
                <span className="text-sm font-bold text-slate-900">
                  {" "}
                  {dbActive !== null ? dbActive : "—"}
                  {dbTotal ? ` / ${dbTotal}` : ""}{" "}
                </span>{" "}
              </div>{" "}
              {dbTotal ? (
                <>
                  {" "}
                  <ProgressBar value={dbPct} colorClass={dbColor} />{" "}
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {dbPct}% pool đang sử dụng
                  </p>{" "}
                </>
              ) : (
                <p className="text-[10px] text-slate-400 mt-3">
                  Không có dữ liệu pool
                </p>
              )}{" "}
            </div>{" "}
            {/* Uptime */}{" "}
            <div className="p-5">
              {" "}
              <div className="flex items-center gap-2 mb-3">
                {" "}
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />{" "}
                <div>
                  {" "}
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Uptime
                  </p>{" "}
                  <p className="text-[10px] text-slate-400">
                    Thời gian hoạt động liên tục
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <p className="text-2xl font-bold text-slate-900 leading-none mt-2">
                {" "}
                {monitoring.uptime?.uptimeFormatted ?? "—"}{" "}
              </p>{" "}
              <p className="text-[10px] text-slate-400 mt-2">
                {" "}
                {monitoring.recentErrors !== undefined
                  ? monitoring.recentErrors === 0
                    ? "Không có lỗi gần đây"
                    : `${monitoring.recentErrors} lỗi gần đây`
                  : "Trạng thái ổn định"}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* ─── Quick Actions ─── */}{" "}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        {" "}
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
          Truy cập nhanh
        </p>{" "}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {" "}
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
            >
              {" "}
              <action.icon className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />{" "}
              <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 text-center leading-tight transition-colors">
                {" "}
                {action.label}{" "}
              </span>{" "}
            </Link>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* ─── Audit Logs ─── */}{" "}
      <Card
        title={
          <div className="flex items-center gap-2">
            {" "}
            <ShieldCheck className="w-4 h-4 text-slate-400" />{" "}
            <span>Nhật ký Audit</span>{" "}
          </div>
        }
        subtitle="Theo dõi mọi thao tác quản trị và tra cứu nhạy cảm từ CSKH"
        action={
            <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto hide-scrollbar snap-x max-w-[280px] sm:max-w-full">
              {[
                { id: "access", label: "Truy cập & Bảo mật" },
                { id: "data", label: "Thay đổi Dữ liệu" },
                { id: "finance", label: "Tài chính & Kho" },
                { id: "cskh", label: "Tra cứu CSKH" },
                { id: "system", label: "Hệ thống" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAuditTab(tab.id as any)}
                  className={`snap-start whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    auditTab === tab.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
        noPadding
        footer={
          <Link
            href="/admin/audit-logs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-primary ml-auto"
          >
            {" "}
            Xem tất cả Audit Logs <ChevronRight className="w-3.5 h-3.5" />{" "}
          </Link>
        }
      >
        {" "}
        <DataTable
            columns={(auditTab === "cskh" ? cskhAuditColumns : systemAuditColumns) as any}
            data={currentLogs as any}
            loading={loadingAudit}
            rowKey={(item: any, idx: number) => item.id || idx}
            emptyTitle={`Chưa có dữ liệu cho mục này`}
            emptyMessage="Các thao tác sẽ tự động xuất hiện tại đây khi phát sinh."
          />{" "}
      </Card>{" "}
      {/* ─── Email Logs ─── */}{" "}
      <Card
        title={
          <div className="flex items-center gap-2">
            {" "}
            <Mail className="w-4 h-4 text-slate-400" />{" "}
            <span>Email Logs Hệ Thống</span>{" "}
          </div>
        }
        subtitle="Giám sát gửi email thông báo đơn hàng, xác thực tài khoản và mã OTP"
        action={
          <div className="flex items-center gap-3 text-xs font-medium">
            {" "}
            {emailStats.sent > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                {" "}
                {emailStats.sent} đã gửi{" "}
              </span>
            )}{" "}
            {emailStats.failed > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                {" "}
                {emailStats.failed} thất bại{" "}
              </span>
            )}{" "}
          </div>
        }
        noPadding
        footer={
          <Link
            href="/admin/mailing"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-primary ml-auto"
          >
            {" "}
            Xem toàn bộ lịch sử Email{" "}
            <ChevronRight className="w-3.5 h-3.5" />{" "}
          </Link>
        }
      >
        {" "}
        <DataTable
          columns={emailLogColumns}
          data={emailLogs}
          loading={loadingEmail}
          rowKey={(item, idx) => item.id || idx}
          emptyTitle="Chưa có nhật ký email"
          emptyMessage="Chưa có bản ghi gửi email nào trong cơ sở dữ liệu."
        />{" "}
      </Card>{" "}
    </div>
  );
}
