"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import {
  MessageCircle, RefreshCw, AlertCircle,
  Clock, CheckCircle2, Star, HelpCircle, ArrowUpRight
} from "lucide-react";

interface SupportTicket {
  id: string;
  ticketCode?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  subject: string;
  channel?: string;
  orderCode?: string;
  status: string;
  priority?: number;
  assignedToName?: string;
  createdAt: string;
}

const fmtDate = (s?: string) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
};

export default function CskhTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const pageIndex = p - 1; // Backend is 0-indexed
      const params = new URLSearchParams();
      params.set('page', pageIndex.toString());
      params.set('size', '15');
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiClient.get<any>(`/api/staff/support/tickets?${params.toString()}`);
      
      const payload = res?.data ?? res;
      const items: SupportTicket[] = payload?.items ?? payload?.content ?? (Array.isArray(payload) ? payload : []);
      
      setTickets(items);
      setTotalPages(payload?.totalPages ?? 1);
      setTotalItems(payload?.totalItems ?? items.length);
      setPage(p);
    } catch (err: any) {
      toast.error(err?.message ?? "Không thể tải danh sách tickets từ hệ thống CSKH");
      setTickets([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    load(1);
  }, [load]);

  const counts = useMemo(() => ({
    total: totalItems || tickets.length,
    new: tickets.filter(t => t.status === "OPEN" || t.status === "NEW").length,
    inProgress: tickets.filter(t => t.status === "IN_PROGRESS" || t.status === "ESCALATED").length,
    resolved: tickets.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length,
  }), [tickets, totalItems]);

  const columns: Column<SupportTicket>[] = [
    {
      key: 'code',
      header: 'Mã Ticket',
      render: (t) => (
        <span className="font-mono font-bold text-teal-700">
          {t.ticketCode || `#${t.id}`}
        </span>
      )
    },
    {
      key: 'customer',
      header: 'Khách Hàng',
      render: (t) => (
        <div>
          <div className="font-medium text-slate-900">{t.customerName || "—"}</div>
          {t.customerEmail && (
            <div className="text-xs text-slate-400 font-normal">{t.customerEmail}</div>
          )}
        </div>
      )
    },
    {
      key: 'subject',
      header: 'Chủ Đề & Đơn Hàng',
      render: (t) => (
        <div className="max-w-xs">
          <p className="font-medium text-slate-800 line-clamp-1">{t.subject}</p>
          {t.orderCode && (
            <span className="inline-block text-[11px] font-mono text-blue-600 font-semibold mt-0.5">
              Đơn: #{t.orderCode}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'channel',
      header: 'Kênh Tiếp Nhận',
      render: (t) => (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
          {t.channel || "PORTAL"}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (t) => (
        <StatusBadge
          type="ticket"
          status={t.status}
        />
      )
    },
    {
      key: 'createdAt',
      header: 'Thời Gian',
      render: (t) => (
        <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
          {fmtDate(t.createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Chi Tiết',
      align: 'right',
      render: (t) => (
        <Link
          href={`/staff/support?ticketId=${t.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition"
        >
          <span>Xử lý</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      )
    }
  ];

  return (
    <PermissionGuard allowedRoles={["ADMIN", "SUPER_ADMIN", "CSKH_STAFF", "SHOP_OWNER", "STAFF"]}>
      <main className="min-h-screen bg-slate-50/60 p-6 md:p-8 text-slate-900 font-sans antialiased space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Quản Lý Tickets CSKH"
          subtitle="Theo dõi và điều phối yêu cầu khiếu nại, hỗ trợ giải đáp khách hàng"
          breadcrumbs={[
            { label: 'Staff Hub', href: '/staff/dashboard' },
            { label: 'CSKH', href: '/staff/support' },
            { label: 'Tickets' }
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/staff/support">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-teal-600" />
                  <span>CSKH Workbench</span>
                </Button>
              </Link>
              <Link href="/staff/reviews">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Đánh giá sản phẩm</span>
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => load(1)}
                disabled={loading}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Làm mới</span>
              </Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Tổng số Ticket"
            value={counts.total}
            icon={MessageCircle}
            color="info"
          />
          <StatCard
            title="Mới / Đang mở"
            value={counts.new}
            icon={AlertCircle}
            color="warning"
          />
          <StatCard
            title="Đang xử lý / Leo thang"
            value={counts.inProgress}
            icon={Clock}
            color="blue"
          />
          <StatCard
            title="Đã giải quyết xong"
            value={counts.resolved}
            icon={CheckCircle2}
            color="success"
          />
        </div>

        {/* Data Table */}
        <DataTable<SupportTicket>
          columns={columns}
          data={tickets}
          loading={loading}
          rowKey={(t) => t.id}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm kiếm theo mã ticket, khách hàng, nội dung..."
          emptyTitle="Không tìm thấy ticket nào"
          emptyMessage="Chưa có yêu cầu hỗ trợ nào phù hợp với bộ lọc hiện tại."
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            pageSize: 15,
            onPageChange: (newPage) => load(newPage)
          }}
          filterSlot={
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "ALL", label: "Tất cả" },
                { key: "OPEN", label: "Đang mở" },
                { key: "IN_PROGRESS", label: "Đang xử lý" },
                { key: "ESCALATED", label: "Leo thang" },
                { key: "RESOLVED", label: "Đã giải quyết" },
                { key: "CLOSED", label: "Đã đóng" }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === item.key
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />
      </main>
    </PermissionGuard>
  );
}
