'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, CheckCircle2, Clock, Truck, XCircle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';
import { useParams } from 'next/navigation';

const STATUS_MAP: Record<string, { label: string, colorClass: string, icon: any }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', colorClass: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock },
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', colorClass: 'text-blue-600 bg-blue-50 border-blue-200', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: CheckCircle2 },
  SHIPPING: { label: 'Đang giao hàng', colorClass: 'text-purple-600 bg-purple-50 border-purple-200', icon: Truck },
  DELIVERED: { label: 'Đã giao', colorClass: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 },
  COMPLETED: { label: 'Hoàn thành', colorClass: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy', colorClass: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  RETURNED: { label: 'Hoàn trả', colorClass: 'text-orange-600 bg-orange-50 border-orange-200', icon: XCircle },
};

export default function OrderDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderCode = params.orderCode as string;
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push(`/auth/login?redirect=/account/orders/${orderCode}`);
      return;
    }
    
    // For now, we fetch all orders and find the one. 
    // If backend has GET /api/orders/:code, we should use that instead.
    const fetchOrderDetails = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${getApiBaseUrl()}/api/orders/me`, {
          headers: headers as any
        });
        const json = await res.json();
        if (json.success) {
          const found = (json.data || []).find((o: any) => o.orderCode === orderCode);
          setOrder(found || null);
        }
      } catch (err) {
        console.error('Failed to fetch order details', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [user, router, orderCode]);

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse">Đang tải chi tiết đơn hàng...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Không tìm thấy đơn hàng</h2>
        <p className="text-gray-500 mb-6">Đơn hàng {orderCode} không tồn tại hoặc bạn không có quyền xem.</p>
        <Link href="/account/orders" className="text-black font-bold underline">Quay lại danh sách đơn hàng</Link>
      </div>
    );
  }

  const statusConfig = STATUS_MAP[order.orderStatus] || { label: order.orderStatus, colorClass: 'text-gray-600 bg-gray-50 border-gray-200', icon: Package };
  const StatusIcon = statusConfig.icon;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại</span>
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-black uppercase mb-1">Đơn hàng #{order.orderCode}</h1>
          <p className="text-gray-500 text-sm">Ngày đặt: {formatDate(order.createdAt)}</p>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${statusConfig.colorClass}`}>
          <StatusIcon className="w-5 h-5" />
          <span className="font-bold">{statusConfig.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-bold text-lg">Sản phẩm đã đặt</h3>
          
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-6 space-y-6">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex gap-4 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-200 overflow-hidden">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link href={`/products/${item.productSlug}`} className="font-bold text-gray-900 text-lg hover:underline line-clamp-2 mb-1">
                        {item.productName}
                      </Link>
                      <p className="text-gray-500 text-sm mb-2">
                        Size: <span className="font-semibold text-black">{item.size}</span> | 
                        Màu: <span className="inline-block w-3 h-3 rounded-full border border-gray-300 align-middle ml-1" style={{backgroundColor: item.color}}/>
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-gray-500">Số lượng: <span className="font-bold text-black">{item.quantity}</span></span>
                      <span className="font-bold text-red-600">{(item.price || 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-lg">Thông tin thanh toán</h3>
          
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Tạm tính:</span>
              <span className="font-semibold text-black">{order.totalAmount?.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Phí vận chuyển:</span>
              <span className="font-semibold text-black">Miễn phí</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600 text-sm">
                <span>Giảm giá:</span>
                <span className="font-semibold">- {order.discountAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            
            <div className="pt-4 border-t border-gray-200 flex justify-between items-baseline">
              <span className="font-bold text-gray-900">Tổng cộng:</span>
              <span className="text-2xl font-black text-red-600">{order.totalAmount?.toLocaleString('vi-VN')}đ</span>
            </div>
            
            <div className="pt-4 mt-4 border-t border-gray-200">
              <span className="block text-sm text-gray-500 mb-1">Phương thức thanh toán:</span>
              <span className="font-bold text-gray-900">{order.paymentMethod || 'Thanh toán khi nhận hàng (COD)'}</span>
            </div>
          </div>
          
          {/* We would typically show shipping address here if the API returned it */}
        </div>
      </div>
    </div>
  );
}
