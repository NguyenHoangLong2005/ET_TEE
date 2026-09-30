'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Users,
  Truck,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  ArrowRight,
  Download,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Lock,
  Layers,
  Palette,
  ShieldCheck,
  Package,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusBadge, { ORDER_STATUS_CONFIG } from '@/components/ui/StatusBadge';
import DataTable, { Column } from '@/components/ui/DataTable';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/Skeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { StatCard } from '@/components/dashboard/DashboardComponents';
import { toast } from 'sonner';

interface SampleOrder {
  id: string;
  orderCode: string;
  customer: string;
  total: number;
  status: string;
  createdAt: string;
}

const SAMPLE_ORDERS: SampleOrder[] = [
  { id: '1', orderCode: 'ORD-2026-001', customer: 'Nguyễn Văn An', total: 649000, status: 'CONFIRMED', createdAt: '26/09/2026 09:30' },
  { id: '2', orderCode: 'ORD-2026-002', customer: 'Trần Thị Bình', total: 1250000, status: 'SHIPPING', createdAt: '26/09/2026 10:15' },
  { id: '3', orderCode: 'ORD-2026-003', customer: 'Lê Hoàng Long', total: 499000, status: 'DELIVERED', createdAt: '25/09/2026 16:40' },
  { id: '4', orderCode: 'ORD-2026-004', customer: 'Phạm Minh Châu', total: 890000, status: 'PENDING', createdAt: '26/09/2026 10:45' },
  { id: '5', orderCode: 'ORD-2026-005', customer: 'Hoàng Quốc Việt', total: 320000, status: 'CANCELLED', createdAt: '24/09/2026 14:10' },
];

export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'danger' | 'warning' | 'info'>('danger');
  const [search, setSearch] = useState('');
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(0);

  const filteredOrders = SAMPLE_ORDERS.filter(
    (o) =>
      o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<SampleOrder>[] = [
    {
      key: 'orderCode',
      header: 'Mã đơn',
      sortable: true,
      render: (r) => <span className="font-mono font-bold text-slate-900">{r.orderCode}</span>,
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      sortable: true,
      render: (r) => <span className="font-bold text-slate-800">{r.customer}</span>,
    },
    {
      key: 'total',
      header: 'Tổng tiền',
      sortable: true,
      align: 'right',
      render: (r) => <span className="font-bold text-slate-900">{r.total.toLocaleString('vi-VN')} ₫</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (r) => <StatusBadge status={r.status} type="order" />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      render: (r) => <span className="text-slate-500 text-[11px]">{r.createdAt}</span>,
    },
    {
      key: 'actions',
      header: 'Hành động',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toast.info(`Xem chi tiết đơn ${r.orderCode}`)}
          >
            Xem
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setModalType('danger');
              setModalOpen(true);
            }}
          >
            Hủy
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10">
      {/* 1. Page Header Demo */}
      <PageHeader
        title="ET.TEE Design System Style Guide"
        subtitle="Môi trường trực quan demo toàn bộ Design Tokens, Bảng màu, Typography & Components nền tảng."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Hệ thống', href: '/admin/settings/payments-shipping' },
          { label: 'Style Guide' },
        ]}
        badge={
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            Phase 1 Standard
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => toast.success('Đã xuất token specification')}
            >
              Export Tokens
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => toast.success('Tạo mới mẫu giao diện')}
            >
              Tạo mẫu mới
            </Button>
          </>
        }
      />

      {/* 2. Color Palettes */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-slate-900">
            1. Hệ Thống Màu Sắc (Color Tokens)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Brand Colors */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Brand Primary (Đỏ ET.TEE)
            </h3>
            <div className="h-16 rounded-xl bg-primary flex items-end p-2.5 text-white font-bold text-xs shadow-sm">
              #e50027 (--color-primary)
            </div>
            <div className="h-12 rounded-xl bg-brand-primary flex items-end p-2 text-white font-mono text-[11px]">
              #18181B (brand-primary)
            </div>
          </div>

          {/* Semantic Success */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Semantic: Success
            </h3>
            <div className="h-16 rounded-xl bg-emerald-600 flex items-end p-2.5 text-white font-bold text-xs shadow-sm">
              #16a34a (--color-success)
            </div>
            <div className="h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-end p-2 text-emerald-800 font-bold text-[11px]">
              bg-emerald-50 (surface)
            </div>
          </div>

          {/* Semantic Warning */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Semantic: Warning
            </h3>
            <div className="h-16 rounded-xl bg-amber-500 flex items-end p-2.5 text-slate-950 font-bold text-xs shadow-sm">
              #d97706 (--color-warning)
            </div>
            <div className="h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-end p-2 text-amber-800 font-bold text-[11px]">
              bg-amber-50 (surface)
            </div>
          </div>

          {/* Semantic Danger & Info */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Semantic: Danger & Info
            </h3>
            <div className="h-10 rounded-xl bg-rose-600 flex items-end p-2 text-white font-bold text-[11px] shadow-sm">
              Danger: #dc2626
            </div>
            <div className="h-10 rounded-xl bg-blue-600 flex items-end p-2 text-white font-bold text-[11px] shadow-sm">
              Info: #2563eb
            </div>
          </div>
        </div>
      </section>

      {/* 2. Hệ Thống Định Danh 3 Tầng (Tier Branding) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <ShieldCheck className="w-5 h-5 text-slate-900" />
          <h2 className="text-sm font-semibold text-slate-900">
            2. Định Danh 3 Tầng Quản Trị (Admin / Store Owner / Staff)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Admin Tier */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-slate-900 text-white font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded font-bold">
                SYSTEM
              </span>
              <span className="text-xs font-bold text-slate-900">Tầng ADMIN</span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Quản trị Hệ thống</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Accent Slate đậm, Icon Khiên (Shield), Font Monospace cho ID/Log, Nút hành động chính màu đỏ ET.TEE.
            </p>
            <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-[11px] text-slate-700">
              ID: #ADM-2026-X88 · Hash: a7f8c9
            </div>
          </div>

          {/* Store Owner Tier */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                BRANCH
              </span>
              <span className="text-xs font-bold text-emerald-700">Tầng STORE OWNER</span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Quản lý Chi nhánh</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Accent Emerald xanh ngọc lục bảo, Icon Store/Building, phục vụ điều phối tồn kho & bán lẻ tại shop.
            </p>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-[11px] text-emerald-800 font-semibold">
              Chi nhánh: Hà Nội HQ · Tồn khả dụng: 1,420 SP
            </div>
          </div>

          {/* Staff Tier */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                STAFF
              </span>
              <span className="text-xs font-bold text-blue-700">Tầng STAFF</span>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Nhân viên Vận hành</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mỗi phòng ban (Kho, Sales, CSKH, Shipping, Marketing) có dot màu định danh nghiệp vụ riêng biệt.
            </p>
            <div className="p-2.5 bg-blue-50 rounded-xl text-[11px] text-blue-800 font-semibold">
              Bộ phận: Kho vận & Vận chuyển
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stat Cards Demo */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-slate-900">
            3. StatCard Thống Kê Quản Trị
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Doanh thu hôm nay"
            value="38.450.000 ₫"
            icon={ShoppingBag}
            color="success"
            trend={{ value: 14.8, isPositive: true }}
            subtitle="Đạt 105% chỉ tiêu ngày"
          />
          <StatCard
            title="Đơn cần xử lý"
            value="42"
            icon={Package}
            color="warning"
            trend={{ value: 5.2, isPositive: false }}
            subtitle="18 đơn đang chờ lấy hàng"
          />
          <StatCard
            title="Đang giao hàng"
            value="128"
            icon={Truck}
            color="info"
            trend={{ value: 8.4, isPositive: true }}
            subtitle="Tỷ lệ giao đúng hạn 98.2%"
          />
          <StatCard
            title="Nhân viên hoạt động"
            value="24"
            icon={Users}
            color="slate"
            subtitle="Chi nhánh single-shop HQ (ID: 1)"
          />
        </div>
      </section>

      {/* 4. Buttons & Badges */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-slate-900">
            3. Nút Bấm (Buttons) & Nhãn Trạng Thái (StatusBadges)
          </h2>
        </div>

        <Card title="Các biến thể Button">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Red</Button>
              <Button variant="secondary">Secondary Slate</Button>
              <Button variant="danger">Danger Rose</Button>
              <Button variant="outline">Outline Neutral</Button>
              <Button variant="ghost">Ghost Plain</Button>
              <Button variant="primary" loading>
                Đang xử lý
              </Button>
              <Button variant="secondary" icon={<Plus className="w-4 h-4" />}>
                Thêm mới
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <Button size="sm" variant="primary">
                Small (sm)
              </Button>
              <Button size="md" variant="primary">
                Medium (md)
              </Button>
              <Button size="lg" variant="primary">
                Large (lg)
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Hệ thống StatusBadge đa phân hệ">
          <div className="space-y-3">
            <p className="text-xs text-slate-500 font-medium">Trạng thái đơn hàng (Order):</p>
            <div className="flex flex-wrap gap-2.5">
              <StatusBadge status="PENDING" type="order" />
              <StatusBadge status="CONFIRMED" type="order" />
              <StatusBadge status="SHIPPING" type="order" />
              <StatusBadge status="DELIVERED" type="order" />
              <StatusBadge status="CANCELLED" type="order" />
              <StatusBadge status="REFUNDED" type="order" />
            </div>

            <p className="text-xs text-slate-500 font-medium pt-3">Trạng thái tài khoản & Vận đơn:</p>
            <div className="flex flex-wrap gap-2.5">
              <StatusBadge status="ACTIVE" type="user" />
              <StatusBadge status="LOCKED" type="user" />
              <StatusBadge status="BANNED" type="user" />
              <StatusBadge status="IN_TRANSIT" type="shipment" />
              <StatusBadge status="EXCEPTION" type="shipment" />
            </div>
          </div>
        </Card>
      </section>

      {/* 5. DataTable Demo */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-slate-900">
              4. Bảng Dữ Liệu Chuẩn (DataTable)
            </h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loadingTable ? 'animate-spin' : ''}`} />}
            onClick={() => {
              setLoadingTable(true);
              setTimeout(() => setLoadingTable(false), 800);
            }}
          >
            {loadingTable ? 'Đang tải skeleton...' : 'Test Skeleton Loading'}
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filteredOrders}
          loading={loadingTable}
          rowKey={(r) => r.id}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Tìm theo mã đơn hoặc tên khách hàng..."
          filterSlot={
            <Button
              size="sm"
              variant="outline"
              icon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
              onClick={() => toast.info('Mở bộ lọc nâng cao')}
            >
              Lọc trạng thái
            </Button>
          }
          pagination={{
            currentPage: page,
            totalPages: 3,
            totalItems: 15,
            onPageChange: (p) => setPage(p),
          }}
        />
      </section>

      {/* 6. Empty State & Skeletons */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Info className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-slate-900">
            5. Trạng Thái Trống (EmptyState) & Khung Tải (Skeleton)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmptyState
            title="Chưa có dữ liệu vận đơn"
            description="Hiện không có đơn hàng nào cần điều phối vận chuyển trong ca làm việc này."
            action={{
              label: 'Làm mới dữ liệu',
              icon: <RefreshCw className="w-3.5 h-3.5" />,
              onClick: () => toast.success('Đã tải lại danh sách'),
            }}
            secondaryAction={{
              label: 'Xem lịch sử',
              onClick: () => toast.info('Chuyển tới lịch sử đơn'),
            }}
          />

          <div className="space-y-4">
            <SkeletonCard />
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <Skeleton className="h-4 w-40" />
              <SkeletonText lines={3} />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Confirm Dialog Modal */}
      <ConfirmDialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => {
          setModalOpen(false);
          toast.success('Đã xác nhận hành động thành công');
        }}
        type={modalType}
        title="Xác nhận thao tác quản trị"
        message="Hành động này sẽ thay đổi trạng thái của dữ liệu trên máy chủ. Bạn có chắc chắn muốn tiếp tục?"
        confirmText="Đồng ý thực hiện"
        cancelText="Đóng lại"
      />
    </div>
  );
}
