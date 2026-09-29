'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { formatGreetingName } from '@/lib/auth';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DataTable, { Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/dashboard/DashboardComponents';
import {
  Ticket, CheckCircle2, Clock, Tag, RefreshCw, MessageSquare, Users
} from 'lucide-react';
import Link from 'next/link';

interface TicketItem {
  id: string | number;
  customerName?: string;
  subject?: string;
  title?: string;
  status: string;
  priority?: string;
  createdAt: string;
  updatedAt?: string;
}

const fmtDate = (s?: string) => {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return s; }
};

const PRIORITY_TONE: Record<string, 'danger' | 'warning' | 'info' | 'success'> = {
  HIGH: 'danger', URGENT: 'danger', MEDIUM: 'warning', LOW: 'info', NORMAL: 'info',
};

export default function CskhDashboardPage() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [resolvedToday, setResolvedToday] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        // /api/staff/cskh/tickets doesn't exist on the backend - this page
        // always 404'd and silently fell back to zeros. The real ticket
        // system (also used by /staff/tickets) lives at
        // /api/staff/support/tickets.
        apiClient.get<any>('/api/staff/support/tickets?page=0&size=10')
          .then(res => {
            const d = (res as any)?.data ?? res;
            const items: TicketItem[] = Array.isArray(d) ? d : (d?.items ?? d?.content ?? []);
            setTickets(items.slice(0, 10));
            const open = items.filter(t => !['RESOLVED', 'CLOSED'].includes((t.status || '').toUpperCase())).length;
            const total = d?.totalElements ?? items.length;
            setOpenCount(d?.openCount ?? open);
            const today = new Date().toDateString();
            const resolved = items.filter(t => {
              const s = (t.status || '').toUpperCase();
              if (s !== 'RESOLVED' && s !== 'CLOSED') return false;
              try { return new Date(t.updatedAt ?? t.createdAt).toDateString() === today; } catch { return false; }
            }).length;
            setResolvedToday(d?.resolvedToday ?? resolved);
          })
          .catch(() => {
            setTickets([]);
            setOpenCount(0);
            setResolvedToday(0);
          }),
      ]);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const firstName = formatGreetingName(user?.fullName, user?.email);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const ticketColumns: Column<TicketItem>[] = [
    {
      key: 'id',
      header: 'Ticket',
      render: t => (
        <span className="font-mono text-xs font-bold text-slate-700">#{t.id}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Khách hàng',
      render: t => (
        <span className="font-semibold text-slate-900">{t.customerName || '—'}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Nội dung',
      render: t => (
        <span className="text-slate-600 line-clamp-1">{t.subject || t.title || '—'}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Ưu tiên',
      render: t => {
        if (!t.priority) return <span className="text-slate-400 text-xs">—</span>;
        return (
          <StatusBadge
            tone={PRIORITY_TONE[t.priority.toUpperCase()] ?? 'info'}
            label={t.priority}
          />
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: t => {
        const s = (t.status || '').toUpperCase();
        return (
          <StatusBadge
            tone={s === 'RESOLVED' || s === 'CLOSED' ? 'success' : s === 'PENDING' ? 'warning' : 'info'}
            label={s === 'RESOLVED' ? 'Đã xử lý' : s === 'CLOSED' ? 'Đã đóng' : s === 'PENDING' ? 'Chờ' : t.status}
          />
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      align: 'right',
      render: t => (
        <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">{fmtDate(t.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-8 text-slate-800">
      <PageHeader
        title={`${greeting}, ${firstName} 👋`}
        subtitle={`Tổng quan CSKH · Đồng bộ lúc: ${lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
        breadcrumbs={[
          { label: 'Nhân viên', href: '/staff/tickets' },
          { label: 'Tổng quan CSKH' },
        ]}
        actions={
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchData}
            disabled={loading}
          >
            Làm mới
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tickets Đang mở"
          value={loading ? '...' : (openCount ?? '—')}
          icon={Ticket}
          color="warning"
          subtitle="Chưa được giải quyết"
        />
        <StatCard
          title="Đã giải quyết hôm nay"
          value={loading ? '...' : (resolvedToday ?? '—')}
          icon={CheckCircle2}
          color="success"
          subtitle="Tickets đóng trong ngày"
        />
        <StatCard
          title="Thời gian phản hồi TB"
          value="—"
          icon={Clock}
          color="info"
          subtitle="Chưa có dữ liệu thống kê"
        />
        <StatCard
          title="Voucher đã cấp"
          value="—"
          icon={Tag}
          color="purple"
          subtitle="Đền bù cho khách hàng"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/staff/tickets"
          className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all block group shadow-2xs hover:shadow-sm"
        >
          <Ticket className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform mb-2" />
          <p className="text-xs font-bold text-slate-900">Hàng đợi Tickets</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Xử lý yêu cầu khách hàng</p>
        </Link>
        <Link
          href="/staff/reviews"
          className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all block group shadow-2xs hover:shadow-sm"
        >
          <MessageSquare className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform mb-2" />
          <p className="text-xs font-bold text-slate-900">Đánh giá & Comment</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Duyệt review sản phẩm</p>
        </Link>
        <Link
          href="/staff/support"
          className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all block group shadow-2xs hover:shadow-sm"
        >
          <Users className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform mb-2" />
          <p className="text-xs font-bold text-slate-900">Hỗ trợ Khách hàng</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Trung tâm hỗ trợ</p>
        </Link>
        <Link
          href="/staff/tickets"
          className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all block group shadow-2xs hover:shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform mb-2" />
          <p className="text-xs font-bold text-slate-900">Tickets chờ xử lý</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Ưu tiên cao</p>
        </Link>
      </div>

      <Card
        title={
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-amber-600" />
            <span>Tickets Gần đây</span>
          </div>
        }
        subtitle="10 yêu cầu hỗ trợ mới nhất từ khách hàng"
        noPadding
        footer={
          <Link
            href="/staff/tickets"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-amber-600 ml-auto"
          >
            Xem tất cả Tickets
          </Link>
        }
      >
        <DataTable
          columns={ticketColumns}
          data={tickets}
          loading={loading}
          rowKey={(item, idx) => item.id ?? idx}
          emptyTitle="Chưa có tickets"
          emptyMessage="Hiện tại chưa có yêu cầu hỗ trợ nào từ khách hàng."
        />
      </Card>
    </div>
  );
}
