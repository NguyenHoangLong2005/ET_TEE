'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable, { Column } from '@/components/ui/DataTable';
import { toast } from 'sonner';
import {
  Layers, Search, RefreshCw, Edit2, X, Save, Box, Sliders
} from 'lucide-react';

interface ShopProduct {
  id: number;
  name: string;
  slug: string;
  categoryName?: string;
  brand?: string;
  basePrice?: number;
  baseSalePrice?: number;
  localPrice?: number;
  localPromoPrice?: number;
  isAvailableForSale?: boolean;
  status?: string;
  imageUrl?: string;
}

export default function StoreOwnerProductsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<ShopProduct | null>(null);
  const [editLocalPrice, setEditLocalPrice] = useState<string>('');
  const [editAvailable, setEditAvailable] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        size: '20',
        ...(search ? { keyword: search } : {})
      });
      const res = await apiClient.get<any>(`/api/store-owner/products?${query.toString()}`);
      if (res?.items) {
        setProducts(res.items);
        setTotalPages(res.totalPages || 1);
      } else if (Array.isArray(res)) {
        setProducts(res);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách sản phẩm chi nhánh.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenEdit = (item: ShopProduct) => {
    setEditingItem(item);
    setEditLocalPrice(item.localPrice ? item.localPrice.toString() : (item.basePrice ? item.basePrice.toString() : '0'));
    setEditAvailable(item.isAvailableForSale !== false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || savingConfig) return;

    const parsedLocalPrice = Number(editLocalPrice);
    if (!Number.isFinite(parsedLocalPrice) || parsedLocalPrice <= 0) {
      toast.error('Giá bán tại chi nhánh phải lớn hơn 0 VNĐ');
      return;
    }

    setSavingConfig(true);
    try {
      await apiClient.put(`/api/store-owner/products/${editingItem.id}/config`, {
        localPrice: Math.round(parsedLocalPrice),
        isAvailableForSale: editAvailable
      });
      toast.success(`Đã cập nhật cấu hình cho sản phẩm #${editingItem.id}`);
      setEditingItem(null);
      await fetchProducts();
    } catch (err: any) {
      toast.error(err?.message || 'Cập nhật giá local thất bại');
    } finally {
      setSavingConfig(false);
    }
  };

  const columns: Column<ShopProduct>[] = [
    {
      key: 'name',
      header: 'ID / Tên sản phẩm',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900">#{item.id} - {item.name}</div>
          <div className="text-xs font-mono text-slate-400">{item.slug}</div>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Danh mục',
      render: (item) => (
        <span className="text-slate-600 font-medium">{item.categoryName || '—'}</span>
      ),
    },
    {
      key: 'basePrice',
      header: 'Giá gốc Global',
      render: (item) => (
        <span className="text-slate-700 font-medium font-mono">
          {item.basePrice ? `${item.basePrice.toLocaleString('vi-VN')} ₫` : '—'}
        </span>
      ),
    },
    {
      key: 'localPrice',
      header: 'Giá Local Chi nhánh',
      render: (item) => (
        <span className="text-slate-900 font-bold font-mono">
          {item.localPrice ? `${item.localPrice.toLocaleString('vi-VN')} ₫` : (item.basePrice ? `${item.basePrice.toLocaleString('vi-VN')} ₫` : '—')}
        </span>
      ),
    },
    {
      key: 'isAvailableForSale',
      header: 'Trạng thái',
      render: (item) => (
        <StatusBadge
          status={item.isAvailableForSale === false ? 'INACTIVE' : 'ACTIVE'}
          tone={item.isAvailableForSale === false ? 'danger' : 'success'}
          label={item.isAvailableForSale === false ? 'Tạm ngưng bán' : 'Hoạt động'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (item) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenEdit(item)}
          icon={<Edit2 className="w-3.5 h-3.5" />}
        >
          Sửa Giá Local
        </Button>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto font-sans antialiased text-slate-800">
        
        {/* Banner Header */}
        <PageHeader
          title="Sản phẩm & Giá Local Chi nhánh"
          subtitle="Cấu hình điều chỉnh giá bán riêng và bật/tắt kinh doanh theo từng chi nhánh."
          badge="CHI NHÁNH"
          actions={
            <Button
              variant="secondary"
              onClick={fetchProducts}
              loading={loading}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Làm mới
            </Button>
          }
        />

        {/* Table */}
        <DataTable<ShopProduct>
          data={products}
          columns={columns}
          loading={loading}
          rowKey={(item) => item.id}
          searchQuery={search}
          onSearchChange={(v) => { setSearch(v); setPage(0); }}
          searchPlaceholder="Tìm kiếm sản phẩm theo tên..."
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: (p) => setPage(p),
          }}
          emptyTitle="Không tìm thấy sản phẩm nào"
          emptyMessage="Hãy thử thay đổi từ khóa tìm kiếm."
        />

        {/* Modal edit config */}
        {editingItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Cấu hình giá sản phẩm #{editingItem.id}</h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tên sản phẩm
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingItem.name}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Giá gốc Global (₫)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingItem.basePrice ? `${editingItem.basePrice.toLocaleString('vi-VN')} ₫` : '0 ₫'}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Giá bán Local Chi nhánh (₫) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={editLocalPrice}
                    onChange={(e) => setEditLocalPrice(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono font-extrabold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trạng thái kinh doanh tại chi nhánh
                  </label>
                  <select
                    value={editAvailable ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setEditAvailable(e.target.value === 'ACTIVE')}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  >
                    <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                    <option value="INACTIVE">Tạm ngưng bán (INACTIVE)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setEditingItem(null)}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    loading={savingConfig}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Lưu cấu hình
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

