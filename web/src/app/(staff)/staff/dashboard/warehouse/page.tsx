'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Package, Truck, PackageCheck, AlertTriangle, Boxes, RefreshCw, ChevronRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { formatGreetingName } from '@/lib/auth';
import { toast } from 'sonner';
import { DataTable, Column } from '@/components/ui/DataTable';

interface WarehouseStats {
  totalProducts: number;
  lowStockCount: number;
  pendingOrders: number;
  processingOrders: number;
  readyForShipment: number;
}

interface InventoryItem {
  productId: number;
  productName: string;
  sku?: string;
  stockQuantity: number;
  lowStockThreshold?: number;
  warehouseName?: string;
}

interface OrderItem {
  id: number;
  orderCode: string;
  customerName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function WarehouseDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WarehouseStats>({
    totalProducts: 0,
    lowStockCount: 0,
    pendingOrders: 0,
    processingOrders: 0,
    readyForShipment: 0,
  });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, ordersRes] = await Promise.allSettled([
        apiClient.get<any>('/api/staff/warehouse/inventory'),
        apiClient.get<any>('/api/staff/warehouse/orders'),
      ]);

      let invList: InventoryItem[] = [];
      if (invRes.status === 'fulfilled' && invRes.value) {
        const raw = invRes.value;
        const items = Array.isArray(raw) ? raw : (raw.content || raw.items || []);
        invList = items.map((i: any) => ({
          productId: i.productId || i.id,
          productName: i.productName || 'Sản phẩm',
          sku: i.sku || i.warehouseLocation || '',
          stockQuantity: i.quantityOnHand ?? i.stockQuantity ?? 0,
          lowStockThreshold: i.reorderLevel ?? i.lowStockThreshold ?? 10,
        }));
      }

      let orderList: OrderItem[] = [];
      if (ordersRes.status === 'fulfilled' && ordersRes.value) {
        const raw = ordersRes.value;
        const items = Array.isArray(raw) ? raw : (raw.content || raw.items || []);
        orderList = items.map((o: any) => ({
          id: o.orderId || o.id,
          orderCode: o.orderCode || `#${o.orderId || o.id}`,
          customerName: o.customerName || 'Khách hàng',
          totalAmount: o.total || o.totalAmount || 0,
          status: o.status || 'PENDING',
          createdAt: o.createdAt || '',
        }));
      }

      const pendingCount = orderList.filter(o => o.status === 'CONFIRMED' || o.status === 'PENDING').length;
      const processingCount = orderList.filter(o => o.status === 'PICKING' || o.status === 'PACKING').length;
      const lowStock = invList.filter(i => (i.stockQuantity ?? 0) <= (i.lowStockThreshold ?? 10)).length;

      setInventory(invList);
      setOrders(orderList);
      setStats({
        totalProducts: invList.length,
        lowStockCount: lowStock,
        pendingOrders: pendingCount,
        processingOrders: processingCount,
        readyForShipment: orderList.filter(o => o.status === 'PACKED' || o.status === 'PROCESSING').length,
      });
    } catch (e: any) {
      toast.error(e?.message || 'Không thể tải dữ liệu kho hàng');
    } finally {
      setLoading(false);
      setLastSync(new Date());
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const inventoryColumns: Column<InventoryItem>[] = useMemo(
    () => [
      {
        key: 'productName',
        header: 'Sản phẩm',
        render: (item) => (
          <span className="font-semibold text-slate-900">{item.productName}</span>
        ),
      },
      {
        key: 'sku',
        header: 'SKU / Vị trí',
        render: (item) => (
          <span className="font-mono text-slate-500 text-xs">{item.sku || '—'}</span>
        ),
      },
      {
        key: 'stockQuantity',
        header: 'Số lượng tồn',
        render: (item) => (
          <span className="font-mono font-bold text-slate-900">{item.stockQuantity}</span>
        ),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (item) => {
          const isLow = (item.stockQuantity ?? 0) <= (item.lowStockThreshold ?? 10);
          return isLow ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
              Sắp hết
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              An toàn
            </span>
          );
        },
      },
    ],
    []
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const name = formatGreetingName(user?.fullName, 'Nhân viên kho');

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8 text-slate-900 font-sans antialiased space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {greeting}, {name} 👋
            </h1>
            <span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              KHO HÀNG
            </span>

          </div>
          <p className="text-xs text-slate-400 mt-1">
            Bộ phận Quản lý Tồn kho & Nhập xuất &nbsp;·&nbsp; Đồng bộ{' '}
            <span className="font-mono text-slate-500">
              {lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/staff/dashboard/warehouse/receiving"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Package className="w-3.5 h-3.5" />
            + Phiếu Nhập Kho
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ─── KPI Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sản phẩm trong danh sách', value: stats.totalProducts, icon: Boxes, accent: 'text-amber-800', bg: 'bg-amber-50', bar: 'bg-amber-500', sub: 'Mặt hàng theo dõi' },
          { label: 'Cảnh báo tồn kho thấp', value: stats.lowStockCount, icon: AlertTriangle, accent: 'text-rose-700', bg: 'bg-rose-50', bar: 'bg-rose-500', sub: 'Cần nhập thêm' },
          { label: 'Đơn chờ xử lý gói', value: stats.processingOrders, icon: PackageCheck, accent: 'text-blue-700', bg: 'bg-blue-50', bar: 'bg-blue-500', sub: 'Đang chuẩn bị hàng' },
          { label: 'Sẵn sàng giao hãng VC', value: stats.readyForShipment, icon: Truck, accent: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-emerald-500', sub: 'Chờ bàn giao' },
        ].map(({ label, value, icon: Icon, accent, bg, bar, sub }) => (
          <div key={label} className="relative rounded-2xl border border-slate-200 bg-white p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className={`absolute inset-x-0 top-0 h-0.5 ${bar}`} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
              <div className={`p-2 rounded-xl ${bg}`}>
                <Icon className={`w-4 h-4 ${accent}`} />
              </div>
            </div>
            <div className={`text-2xl font-black font-mono ${accent}`}>
              {loading ? <span className="inline-block w-16 h-7 bg-slate-200 rounded-lg animate-pulse" /> : value}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/staff/dashboard/warehouse/inventory', icon: Boxes, label: 'Bảng tồn kho', sub: 'Kiểm tra tồn', accent: 'bg-amber-50 text-amber-800' },
          { href: '/staff/dashboard/warehouse/receiving', icon: Package, label: 'Nhập kho', sub: 'Tạo phiếu nhập', accent: 'bg-green-50 text-green-700' },
          { href: '/staff/dashboard/warehouse/orders', icon: PackageCheck, label: 'Đơn xuất kho', sub: 'Đóng gói đơn', accent: 'bg-blue-50 text-blue-700' },
          { href: '/staff/dashboard/warehouse/replenishment', icon: AlertTriangle, label: 'Đề xuất nhập', sub: 'Cảnh báo hết', accent: 'bg-rose-50 text-rose-700' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-slate-200 rounded-2xl p-4 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all group shadow-sm block"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${item.accent}`}>
              <item.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-xs font-bold text-slate-900">{item.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
          </Link>
        ))}
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Overview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-600" />
              Tồn kho hiện tại trong hệ thống
            </h2>
            <Link href="/staff/dashboard/warehouse/inventory" className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5">
              Xem chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <DataTable<InventoryItem>
            columns={inventoryColumns}
            data={inventory}
            loading={loading}
            rowKey={(item, idx) => item.productId ?? idx}
            emptyTitle="Chưa có dữ liệu tồn kho"
            emptyMessage="Chưa có dữ liệu tồn kho trong cơ sở dữ liệu."
          />
        </div>

        {/* Orders needing warehouse packing */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-blue-600" />
              Đơn hàng cần đóng gói
            </h2>
            <Link href="/staff/dashboard/warehouse/orders" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              Tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              Không có đơn hàng cần đóng gói lúc này
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <div key={o.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-blue-700 text-xs">{o.orderCode}</span>
                    <p className="text-[11px] text-slate-600 font-medium">{o.customerName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


