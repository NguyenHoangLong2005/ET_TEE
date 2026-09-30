'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Eye, AlertCircle, RefreshCcw } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';

const STATUS_MAP: Record<string, { label: string, colorClass: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', colorClass: 'bg-amber-100 text-amber-900 border border-amber-200' },
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', colorClass: 'bg-sky-100 text-sky-900 border border-sky-200' },
  CONFIRMED: { label: 'Đã xác nhận', colorClass: 'bg-indigo-100 text-indigo-900 border border-indigo-200' },
  SHIPPING: { label: 'Đang giao hàng', colorClass: 'bg-purple-100 text-purple-900 border border-purple-200' },
  DELIVERED: { label: 'Đã giao', colorClass: 'bg-emerald-100 text-emerald-900 border border-emerald-200' },
  COMPLETED: { label: 'Hoàn thành', colorClass: 'bg-emerald-100 text-emerald-900 border border-emerald-200' },
  CANCELLED: { label: 'Đã hủy', colorClass: 'bg-rose-100 text-rose-900 border border-rose-200' },
  RETURNED: { label: 'Hoàn trả', colorClass: 'bg-orange-100 text-orange-900 border border-orange-200' },
};

function OrderSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-slate-200/80 rounded-3xl p-6 animate-pulse shadow-sm">
          <div className="flex justify-between mb-4 border-b border-slate-100 pb-4">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-slate-200 rounded-lg"></div>
              <div className="h-4 w-24 bg-slate-100 rounded-lg"></div>
            </div>
            <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
          </div>
          <div className="space-y-4">
            {[1, 2].map((j) => (
              <div key={j} className="flex gap-4">
                <div className="w-16 h-16 bg-slate-200 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-slate-200 rounded-lg"></div>
                  <div className="h-3 w-32 bg-slate-100 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
            <div className="h-6 w-32 bg-slate-200 rounded-lg"></div>
            <div className="h-10 w-28 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AccountOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/orders/me`, {
        headers: headers as any
      });
      const json = await res.json();
      if (json.success) {
        // Sort by newest first
        const sorted = (json.data || []).sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sorted);
      } else {
        setError('Không thể tải lịch sử đơn hàng.');
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [user?.id, authLoading]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED'].includes(order.orderStatus);
    if (filter === 'SHIPPING') return order.orderStatus === 'SHIPPING';
    if (filter === 'COMPLETED') return ['DELIVERED', 'COMPLETED'].includes(order.orderStatus);
    if (filter === 'CANCELLED') return ['CANCELLED', 'RETURNED'].includes(order.orderStatus);
    return true;
  });

  const getStatusDisplay = (status: string) => {
    const s = STATUS_MAP[status];
    if (s) {
      return <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${s.colorClass}`}>{s.label}</span>;
    }
    return <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-6 pb-4 border-b border-slate-200/80">Lịch sử đơn hàng</h1>
      
      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 mb-6 gap-2 hide-scrollbar">
        {[
          { id: 'ALL', label: 'Tất cả' },
          { id: 'PENDING', label: 'Chờ xử lý' },
          { id: 'SHIPPING', label: 'Đang giao' },
          { id: 'COMPLETED', label: 'Hoàn thành' },
          { id: 'CANCELLED', label: 'Đã hủy' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all ${
              filter === tab.id 
                ? 'bg-primary text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <OrderSkeleton />
      ) : error ? (
        <div className="bg-rose-50/50 border border-rose-200 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <p className="text-rose-700 font-medium text-sm">{error}</p>
          <button
            onClick={fetchOrders}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-2.5 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all text-xs uppercase tracking-wider shadow-sm"
          >
            <RefreshCcw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-slate-50/60 border border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy đơn hàng nào</h3>
          <p className="text-slate-500 text-sm mb-6">Bạn chưa có đơn hàng nào trong trạng thái này.</p>
          <Link href="/products" className="inline-block px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-wider rounded-full shadow-md hover:scale-105 active:scale-95 transition-all">
            Khám phá ET.TEE ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map(order => (
            <div key={order.orderCode} className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
              
              {/* Order Header */}
              <div className="bg-slate-50/80 p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    {order.orderCode}
                    <span className="text-slate-300 text-sm font-normal hidden sm:inline">•</span>
                    <span className="text-slate-500 text-sm font-normal block sm:inline">{formatDate(order.createdAt)}</span>
                  </div>
                </div>
                <div>
                  {getStatusDisplay(order.orderStatus)}
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 sm:p-6 space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      {/* Product Image placeholder */}
                      <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-200/80 overflow-hidden">
                        {item.imageUrl ? (
                           // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={item.imageUrl} 
                            alt={item.productName} 
                            onError={(e) => (e.currentTarget.src = '/images/products/placeholder.webp')}
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <Package className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between gap-4">
                          <div>
                            <Link href={`/products/${item.productSlug}`} className="font-bold text-slate-900 hover:text-primary line-clamp-2 transition-colors">
                              {item.productName}
                            </Link>
                            <p className="text-sm text-slate-500 mt-1">
                              Size: <span className="font-semibold text-slate-800">{item.size || 'Free'}</span> | Màu:{' '}
                              {(item.colorHex || (typeof item.color === 'string' && item.color.startsWith('#'))) && (
                                <span
                                  className="inline-block w-3 h-3 rounded-full border border-slate-300 align-middle mx-1 shadow-2xs"
                                  style={{ backgroundColor: item.colorHex || item.color }}
                                />
                              )}
                              <span className="font-semibold text-slate-800">{item.color || 'Mặc định'}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">x{item.quantity}</p>
                          </div>
                        </div>

                        {/* Review button for delivered/completed items */}
                        {(order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED') && (
                          <div className="mt-2 text-right">
                            {item.reviewed ? (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Đã đánh giá</span>
                            ) : (
                              <Link href={`/products/${item.productSlug}#reviews`} className="text-xs font-bold text-white bg-primary hover:bg-primary/90 px-4 py-1.5 rounded-full transition-all inline-block shadow-2xs">
                                Viết đánh giá
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 italic text-sm">Không có thông tin sản phẩm</p>
                )}
              </div>

              {/* Order Footer */}
              <div className="bg-slate-50/50 p-4 sm:px-6 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-600 text-sm font-semibold">Tổng tiền:</span>
                  <span className="text-xl font-black text-primary">{order.totalAmount?.toLocaleString('vi-VN')}đ</span>
                </div>
                
                <Link 
                  href={`/account/orders/${order.orderCode}`}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-200/80 text-slate-800 font-bold rounded-xl hover:border-slate-900 hover:text-slate-900 transition-all text-sm w-full sm:w-auto shadow-2xs"
                >
                  <Eye className="w-4 h-4" />
                  Xem chi tiết
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

