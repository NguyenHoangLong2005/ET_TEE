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
  Boxes, AlertTriangle, RefreshCw, Plus, Warehouse,
  PackageCheck, Filter, ArrowUpRight
} from 'lucide-react';

interface InventoryItem {
  productId: number;
  productName: string;
  variantId?: number;
  sku?: string;
  stockQuantity: number;
  lowStockThreshold?: number;
  warehouseName?: string;
}

export default function StoreOwnerInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedRestockId, setSelectedRestockId] = useState<number>(0);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      let dataList: InventoryItem[] = [];
      try {
        const res = await apiClient.get<any>('/api/staff/warehouse/inventory');
        const list = Array.isArray(res) ? res : (res?.content || res?.items || []);
        if (list.length > 0) {
          dataList = list.map((i: any) => ({
            productId: i.productId || i.id,
            productName: i.productName || `Sản phẩm #${i.productId}`,
            sku: i.sku || `SKU-${i.productId}`,
            stockQuantity: typeof i.quantityOnHand === 'number' ? i.quantityOnHand : (i.stockQuantity ?? 0),
            lowStockThreshold: i.reorderLevel || 10,
            warehouseName: i.location || 'Kho Chi nhánh',
          }));
        }
      } catch {
        // Fallback to shop products catalog
      }

      if (dataList.length === 0) {
        const prodRes = await apiClient.get<any>('/api/store-owner/products?page=0&size=100');
        const pList = Array.isArray(prodRes) ? prodRes : (prodRes?.items || prodRes?.content || []);
        dataList = pList.map((p: any) => ({
          productId: p.productId || p.id,
          productName: p.productName || p.name,
          sku: p.slug ? `SKU-${p.productId || p.id}` : `ET-P-${p.productId || p.id}`,
          stockQuantity: typeof p.stock === 'number' ? p.stock : 15,
          lowStockThreshold: 10,
          warehouseName: 'Kho Chi nhánh',
        }));
      }

      setItems(dataList);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải dữ liệu tồn kho');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      result = result.filter(i =>
        (i.productName || '').toLowerCase().includes(kw) ||
        (i.sku || '').toLowerCase().includes(kw)
      );
    }
    if (lowStockOnly) {
      result = result.filter(item => item.stockQuantity <= (item.lowStockThreshold || 10));
    }
    return result;
  }, [items, keyword, lowStockOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = page * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [keyword, lowStockOnly]);

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestockId || restockAmount <= 0) {
      toast.error('Vui lòng chọn sản phẩm và nhập số lượng nhập kho lớn hơn 0');
      return;
    }
    const target = items.find((i) => i.productId === selectedRestockId);
    try {
      setIsSubmitting(true);
      await apiClient.post('/api/staff/warehouse/inbound', {
        productId: selectedRestockId,
        productName: target?.productName || `Sản phẩm #${selectedRestockId}`,
        quantity: Math.round(restockAmount),
        location: target?.warehouseName || 'Kho Chi nhánh',
      });
      toast.success(`Đã bổ sung ${Math.round(restockAmount)} sản phẩm vào tồn kho`);
      setRestockModalOpen(false);
      setRestockAmount(10);
      fetchInventory();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể thực hiện nhập kho');
    } finally {
      setIsSubmitting(false);
    }
  };

  const metrics = useMemo(() => {
    const totalSKUs = items.length;
    const totalUnits = items.reduce((acc, i) => acc + (i.stockQuantity || 0), 0);
    const lowStockCount = items.filter(i => i.stockQuantity <= (i.lowStockThreshold || 10)).length;
    return { totalSKUs, totalUnits, lowStockCount };
  }, [items]);

  const columns: Column<InventoryItem>[] = [
    {
      key: 'productName',
      header: 'Sản phẩm',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900">{item.productName}</div>
          <div className="text-xs font-mono text-slate-400">
            {item.sku || (item.variantId ? `Variant #${item.variantId}` : `ID: ${item.productId}`)}
          </div>
        </div>
      ),
    },
    {
      key: 'warehouseName',
      header: 'Kho / Vị trí',
      render: (item) => (
        <span className="text-slate-600 font-medium flex items-center gap-1.5">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          {item.warehouseName || 'Kho Chi nhánh'}
        </span>
      ),
    },
    {
      key: 'stockQuantity',
      header: 'Số lượng tồn',
      align: 'right',
      render: (item) => {
        const isLow = item.stockQuantity <= (item.lowStockThreshold || 10);
        return (
          <span className={`font-mono font-black text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
            {item.stockQuantity}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (item) => {
        const isLow = item.stockQuantity <= (item.lowStockThreshold || 10);
        return isLow ? (
          <StatusBadge status="LOW" tone="danger" label="Sắp hết hàng" />
        ) : (
          <StatusBadge status="OK" tone="success" label="Đủ hàng" />
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (item) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSelectedRestockId(item.productId);
            setRestockModalOpen(true);
          }}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Nhập thêm
        </Button>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">
        
        {/* Header */}
        <PageHeader
          title="Quản lý Tồn kho Chi nhánh"
          subtitle="Theo dõi số lượng hàng thực tế, cảnh báo mức an toàn và bổ sung tồn kho."
          badge="CHI NHÁNH"
          actions={
            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={fetchInventory}
                loading={isLoading}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Làm mới
              </Button>
              <Button
                onClick={() => {
                  if (items.length > 0 && !selectedRestockId) {
                    setSelectedRestockId(items[0].productId);
                  }
                  setRestockModalOpen(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Nhập kho nhanh
              </Button>
            </div>
          }
        />

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Tổng mặt hàng (SKU)"
            value={metrics.totalSKUs}
            icon={Boxes}
            color="blue"
            subtitle="Số phân loại trong kho"
          />
          <StatCard
            title="Tổng số lượng sản phẩm"
            value={metrics.totalUnits}
            icon={PackageCheck}
            color="green"
            subtitle="Tổng tồn trên toàn bộ kệ"
          />
          <StatCard
            title="Cảnh báo tồn kho thấp"
            value={metrics.lowStockCount}
            icon={AlertTriangle}
            color="danger"
            subtitle={metrics.lowStockCount > 0 ? "Mặt hàng dưới ngưỡng tối thiểu" : "Tồn kho an toàn"}
          />
        </div>

        {/* Table */}
        <DataTable<InventoryItem>
          data={paginatedItems}
          columns={columns}
          loading={isLoading}
          rowKey={(item, idx) => `${item.productId}-${item.variantId || idx}`}
          searchQuery={keyword}
          onSearchChange={setKeyword}
          searchPlaceholder="Tìm kiếm theo tên sản phẩm, mã SKU..."
          filterSlot={
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs select-none">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
              />
              <span>Chỉ hiện sắp hết hàng</span>
            </label>
          }
          pagination={{
            currentPage: page,
            totalPages,
            totalItems: filteredItems.length,
            pageSize,
            onPageChange: (p) => setPage(p),
          }}
          emptyTitle="Không tìm thấy dữ liệu tồn kho nào"
          emptyMessage="Hãy thử thay đổi từ khóa hoặc tắt bộ lọc cảnh báo sắp hết hàng."
        />

        {/* Restock Modal */}
        {restockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <form onSubmit={handleRestockSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Nhập bổ sung tồn kho chi nhánh</h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Chọn sản phẩm</label>
                <select
                  value={selectedRestockId}
                  onChange={(e) => setSelectedRestockId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {items.map((i) => (
                    <option key={i.productId} value={i.productId}>
                      {i.productName} (Hiện có: {i.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Số lượng nhập thêm</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="secondary"
                  onClick={() => setRestockModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Xác nhận nhập kho
                </Button>
              </div>
            </form>
          </div>
        )}

      </div>
    </PermissionGuard>
  );
}
