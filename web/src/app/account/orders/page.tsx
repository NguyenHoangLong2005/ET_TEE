'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Eye, AlertCircle, RefreshCcw } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';

const STATUS_MAP: Record<string, { label: string, colorClass: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', colorClass: 'bg-yellow-100 text-yellow-800' },
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', colorClass: 'bg-blue-100 text-blue-800' },
  CONFIRMED: { label: 'Đã xác nhận', colorClass: 'bg-indigo-100 text-indigo-800' },
  SHIPPING: { label: 'Đang giao hàng', colorClass: 'bg-purple-100 text-purple-800' },
  DELIVERED: { label: 'Đã giao', colorClass: 'bg-green-100 text-green-800' },
  COMPLETED: { label: 'Hoàn thành', colorClass: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Đã hủy', colorClass: 'bg-red-100 text-red-800' },
  RETURNED: { label: 'Hoàn trả', colorClass: 'bg-orange-100 text-orange-800' },
};

function OrderSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse">
          <div className="flex justify-between mb-4 border-b border-gray-100 pb-4">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded"></div>
              <div className="h-4 w-24 bg-gray-100 rounded"></div>
            </div>
            <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
          </div>
          <div className="space-y-4">
            {[1, 2].map((j) => (
              <div key={j} className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded"></div>
                  <div className="h-3 w-32 bg-gray-100 rounded"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
            <div className="h-6 w-32 bg-gray-200 rounded"></div>
            <div className="h-10 w-28 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AccountOrdersPage() {
  const { user } = useAuth();
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
    if (user) {
      fetchOrders();
    }
  }, [user]);

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
    return <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">{status}</span>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <h1 className="text-2xl font-black uppercase mb-6 pb-4 border-b border-gray-100">Lịch sử đơn hàng</h1>
      
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
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              filter === tab.id 
                ? 'bg-black text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <OrderSkeleton />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchOrders}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Không tìm thấy đơn hàng nào</h3>
          <p className="text-gray-500 mb-6">Bạn chưa có đơn hàng nào trong trạng thái này.</p>
          <Link href="/products" className="inline-block px-8 py-3 bg-black text-white font-bold uppercase rounded-lg hover:bg-gray-800 transition-colors">
            Khám phá ET.TEE ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map(order => (
            <div key={order.orderCode} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-shadow">
              
              {/* Order Header */}
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    {order.orderCode}
                    <span className="text-gray-400 text-sm font-normal hidden sm:inline">•</span>
                    <span className="text-gray-500 text-sm font-normal block sm:inline">{formatDate(order.createdAt)}</span>
                  </div>
                </div>
                <div>
                  {getStatusDisplay(order.orderStatus)}
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      {/* Product Image placeholder - assuming we might get it from API later */}
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                        {item.imageUrl ? (
                           // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Package className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between gap-4">
                          <div>
                            <Link href={`/products/${item.productSlug}`} className="font-bold text-gray-900 hover:underline line-clamp-2">
                              {item.productName}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">
                              Size: {item.size} | Màu: <span className="inline-block w-3 h-3 rounded-full border border-gray-300 align-middle ml-1" style={{backgroundColor: item.color}}/>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">x{item.quantity}</p>
                          </div>
                        </div>

                        {/* Review button for delivered/completed items */}
                        {(order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED') && (
                          <div className="mt-2 text-right">
                            {item.reviewed ? (
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">Đã đánh giá</span>
                            ) : (
                              <Link href={`/products/${item.productSlug}#reviews`} className="text-xs font-bold text-white bg-black hover:bg-gray-800 px-4 py-1.5 rounded-lg transition-colors inline-block">
                                Viết đánh giá
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">Không có thông tin sản phẩm</p>
                )}
              </div>

              {/* Order Footer */}
              <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-600 text-sm font-semibold">Tổng tiền:</span>
                  <span className="text-xl font-black text-red-600">{order.totalAmount?.toLocaleString('vi-VN')}đ</span>
                </div>
                
                <Link 
                  href={`/account/orders/${order.orderCode}`}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-white border-2 border-gray-200 text-gray-800 font-bold rounded-lg hover:border-black hover:text-black transition-colors w-full sm:w-auto"
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
