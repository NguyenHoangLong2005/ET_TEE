'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable, { Column } from '@/components/ui/DataTable';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Filter, Eye, X, RefreshCw, ShoppingBag,
  TrendingUp, Clock, CheckCircle2
} from 'lucide-react';

/* ─── Interfaces ─── */
interface OrderItem {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  price: number;
}

interface OrderAddress {
  fullName: string;
  phone: string;
  address: string;
}

interface Order {
  id: string;
  orderCode: string;
  customerName: string;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
  items?: OrderItem[];
  address?: OrderAddress;
}


const formatCurrency = (amount?: number) => {
  return typeof amount === 'number'
    ? amount.toLocaleString('vi-VN') + ' ₫'
    : '0 ₫';
};

export default function StoreOwnerOrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  /* Detail Modal */
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>('/api/store-owner/orders');
      let fetchedList: Order[] = [];
      if (Array.isArray(data)) {
        fetchedList = data;
      } else if (data?.content && Array.isArray(data.content)) {
        fetchedList = data.content;
      } else if (data?.data && Array.isArray(data.data)) {
        fetchedList = data.data;
      } else if (data?.items && Array.isArray(data.items)) {
        fetchedList = data.items;
      }
      setAllOrders(fetchedList);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách đơn hàng');
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* Filter and pagination calculations */
  const filteredOrders = useMemo(() => {
    let result = [...allOrders];
    if (statusFilter) {
      result = result.filter(o => o.status === statusFilter);
    }
    if (keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      result = result.filter(o =>
        (o.orderCode || '').toLowerCase().includes(kw) ||
        (o.customerName || '').toLowerCase().includes(kw)
      );
    }
    return result;
  }, [allOrders, statusFilter, keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = page * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [keyword, statusFilter]);

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  /* Metrics */
  const metrics = useMemo(() => {
    const total = allOrders.length;
    const revenue = allOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const pending = allOrders.filter(o => o.status === 'PENDING').length;
    const completed = allOrders.filter(o => o.status === 'DELIVERED').length;
    return { total, revenue, pending, completed };
  }, [allOrders]);

  /* Columns definition for DataTable */
  const columns: Column<Order>[] = [
    {
      key: 'orderCode',
      header: 'Mã đơn',
      render: (order) => (
        <div>
          <span className="font-mono font-bold text-slate-900">{order.orderCode}</span>
          <div className="text-[11px] text-slate-400 font-mono">#{String(order.id).slice(-4)}</div>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Khách hàng',
      render: (order) => (
        <div>
          <div className="font-medium text-slate-900">{order.customerName}</div>
          {order.address?.phone && (
            <div className="text-xs text-slate-400 font-mono">{order.address.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Tổng tiền',
      align: 'right',
      render: (order) => (
        <span className="font-mono font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (order) => (
        <StatusBadge status={order.status} type="order" />
      ),
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      render: (order) => (
        <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
          }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (order) => (
        <button
          type="button"
          onClick={() => handleViewDetail(order)}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Xem chi tiết"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">
        
        {/* Header */}
        <PageHeader
          title="Quản lý Đơn hàng Chi nhánh"
          subtitle="Theo dõi đơn hàng phát sinh, chuyển trạng thái và hỗ trợ khách hàng."
          badge="CHI NHÁNH"
          actions={
            <Button
              variant="secondary"
              onClick={fetchOrders}
              loading={loading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Làm mới
            </Button>
          }
        />

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Tổng đơn hàng"
            value={metrics.total}
            icon={ShoppingBag}
            color="blue"
            subtitle="Toàn bộ lịch sử đặt hàng"
          />
          <StatCard
            title="Tổng doanh thu"
            value={formatCurrency(metrics.revenue)}
            icon={TrendingUp}
            color="green"
            subtitle="Giá trị tất cả đơn"
          />
          <StatCard
            title="Chờ xác nhận"
            value={metrics.pending}
            icon={Clock}
            color="warning"
            subtitle="Cần liên hệ khách sớm"
          />
          <StatCard
            title="Giao thành công"
            value={metrics.completed}
            icon={CheckCircle2}
            color="success"
            subtitle="Đơn đã hoàn tất"
          />
        </div>

        {/* Orders Table */}
        <DataTable<Order>
          data={paginatedOrders}
          columns={columns}
          loading={loading}
          rowKey={(o) => o.id}
          searchQuery={keyword}
          onSearchChange={setKeyword}
          searchPlaceholder="Tìm mã đơn, khách hàng..."
          filterSlot={
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xác nhận</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="PROCESSING">Đang xử lý</option>
                <option value="SHIPPED">Đang giao</option>
                <option value="DELIVERED">Đã giao</option>
                <option value="CANCELLED">Đã hủy</option>
                <option value="REFUNDED">Đã hoàn tiền</option>
              </select>
            </div>
          }
          pagination={{
            currentPage: page,
            totalPages,
            totalItems: filteredOrders.length,
            pageSize,
            onPageChange: (p) => setPage(p),
          }}
          emptyTitle="Không tìm thấy đơn hàng nào"
          emptyMessage="Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái."
        />

        {/* Order Detail Modal */}
        {isDetailModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Chi tiết đơn hàng {selectedOrder.orderCode}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ngày đặt: {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('vi-VN') : '—'}
                  </p>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <>
                    <div className="flex flex-wrap gap-4 justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Trạng thái hiện tại</p>
                        <StatusBadge status={selectedOrder.status} type="order" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-1">Tổng thanh toán</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(selectedOrder.totalAmount)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-2">Thông tin khách hàng</h4>
                        <p><span className="text-slate-400 w-24 inline-block text-xs">Họ tên:</span> <span className="font-semibold text-slate-900">{selectedOrder.address?.fullName || selectedOrder.customerName}</span></p>
                        <p><span className="text-slate-400 w-24 inline-block text-xs">Điện thoại:</span> <span className="font-mono text-slate-800">{selectedOrder.address?.phone || '—'}</span></p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-2">Địa chỉ giao hàng</h4>
                        <p className="text-xs text-slate-700 leading-relaxed">{selectedOrder.address?.address || 'Chưa cung cấp địa chỉ chi tiết'}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-3">Danh sách sản phẩm</h4>
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3">Tên sản phẩm</th>
                                <th className="px-4 py-3 text-center">SL</th>
                                <th className="px-4 py-3 text-right">Đơn giá</th>
                                <th className="px-4 py-3 text-right">Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedOrder.items.map(item => (
                                <tr key={item.id}>
                                  <td className="px-4 py-3">
                                    <p className="font-bold text-slate-900">{item.productName}</p>
                                    {item.variantName && <p className="text-[11px] text-slate-400">{item.variantName}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold">{item.quantity}</td>
                                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(item.price)}</td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(item.price * item.quantity)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Không có chi tiết sản phẩm.</p>
                      )}
                    </div>
                </>
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
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

