'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, CheckCircle2, Clock, Truck, XCircle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';
import { useParams } from 'next/navigation';

import { toast } from 'sonner';
import { OrderService } from '@/lib/services/orderService';

const STATUS_MAP: Record<string, { label: string, colorClass: string, icon: any }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', colorClass: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', colorClass: 'text-sky-700 bg-sky-50 border-sky-200', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: CheckCircle2 },
  SHIPPING: { label: 'Đang giao hàng', colorClass: 'text-purple-700 bg-purple-50 border-purple-200', icon: Truck },
  DELIVERED: { label: 'Đã giao', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  COMPLETED: { label: 'Hoàn thành', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy', colorClass: 'text-rose-700 bg-rose-50 border-rose-200', icon: XCircle },
  RETURNED: { label: 'Hoàn trả', colorClass: 'text-orange-700 bg-orange-50 border-orange-200', icon: XCircle },
};

export default function OrderDetailsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderCode = params.orderCode as string;
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
    setIsCancelling(true);
    try {
      const ok = await OrderService.cancelOrder(orderCode);
      if (ok) {
        toast.success('Đã gửi yêu cầu hủy đơn hàng thành công!');
        setOrder((prev: any) => prev ? { ...prev, orderStatus: 'CANCELLED' } : prev);
      } else {
        toast.error('Không thể hủy đơn hàng vào lúc này. Vui lòng liên hệ bộ phận CSKH.');
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi hủy đơn hàng');
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?redirect=/account/orders/${orderCode}`);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        const headers = getAuthHeaders();
        // Use the dedicated endpoint first; fall back to fetching all orders if needed.
        const res = await fetch(`${getApiBaseUrl()}/api/orders/${orderCode}`, {
          headers: headers as any
        });
        const json = await res.json();
        if (json.success && json.data) {
          setOrder(json.data);
        } else {
          // Fallback: look up in user's order list
          const allRes = await fetch(`${getApiBaseUrl()}/api/orders/me`, {
            headers: headers as any
          });
          const allJson = await allRes.json();
          if (allJson.success) {
            const found = (allJson.data || []).find((o: any) => o.orderCode === orderCode);
            setOrder(found || null);
          } else {
            setOrder(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch order details', err);
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [user?.id, authLoading, router, orderCode]);

  if (isLoading || authLoading) {
    return <div className="p-8 text-center animate-pulse text-slate-500">Đang tải chi tiết đơn hàng...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12 bg-slate-50/60 border border-dashed border-slate-200 rounded-3xl p-8">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy đơn hàng</h2>
        <p className="text-slate-500 text-sm mb-6">Đơn hàng {orderCode} không tồn tại hoặc bạn không có quyền xem.</p>
        <Link href="/account/orders" className="text-primary font-bold hover:underline">Quay lại danh sách đơn hàng</Link>
      </div>
    );
  }

  const statusConfig = STATUS_MAP[order.orderStatus] || { label: order.orderStatus, colorClass: 'text-slate-600 bg-slate-100 border-slate-200', icon: Package };
  const StatusIcon = statusConfig.icon;
  const finalTotalAmount = Number(order.totalAmount ?? order.finalTotal ?? 0);
  const discountAmount = Number(order.discountAmount ?? 0);
  const subtotalAmount = Number(order.subtotal ?? (finalTotalAmount + discountAmount));

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại</span>
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-1">Đơn hàng #{order.orderCode}</h1>
          <p className="text-slate-500 text-sm">Ngày đặt: {formatDate(order.createdAt)}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold ${statusConfig.colorClass}`}>
            <StatusIcon className="w-4 h-4" />
            <span>{statusConfig.label}</span>
          </div>

          {['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'PENDING'].includes(order.orderStatus) && (
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-full text-xs font-bold transition-all disabled:opacity-50 shadow-2xs"
            >
              {isCancelling ? 'Đang xử lý...' : 'Hủy đơn hàng'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-bold text-lg text-slate-900">Sản phẩm đã đặt</h3>
          
          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 sm:p-6 space-y-6">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex gap-4 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-slate-200/80 overflow-hidden">
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
                    <div>
                      <Link href={`/products/${item.productSlug}`} className="font-bold text-slate-900 text-base sm:text-lg hover:text-primary line-clamp-2 transition-colors mb-1">
                        {item.productName}
                      </Link>
                      <p className="text-slate-500 text-sm mb-2">
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
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-slate-500 text-sm">Số lượng: <span className="font-bold text-slate-900">{item.quantity}</span></span>
                      <span className="font-bold text-primary">{(item.price || 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-lg text-slate-900">Thông tin thanh toán</h3>
          
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between text-slate-600 text-sm">
              <span>Tạm tính:</span>
              <span className="font-semibold text-slate-900">{subtotalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between text-slate-600 text-sm">
              <span>Phí vận chuyển:</span>
              <span className="font-semibold text-slate-900">Miễn phí</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 text-sm">
                <span>Giảm giá:</span>
                <span className="font-semibold">- {discountAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-200/80 flex justify-between items-baseline">
              <span className="font-bold text-slate-900">Tổng cộng:</span>
              <span className="text-2xl font-black text-primary">{finalTotalAmount.toLocaleString('vi-VN')}đ</span>
            </div>
            
            <div className="pt-4 mt-4 border-t border-slate-200/80">
              <span className="block text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Phương thức thanh toán:</span>
              <span className="font-bold text-slate-900 text-sm">{order.paymentMethod || 'Thanh toán khi nhận hàng (COD)'}</span>
            </div>
          </div>
          
          {(order.shippingAddress || order.customerName || order.customerPhone) && (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-6 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Thông tin người nhận</h4>
              {order.customerName && <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>}
              {order.customerPhone && <p className="text-xs text-slate-600 font-mono">SĐT: {order.customerPhone}</p>}
              {order.shippingAddress && <p className="text-xs text-slate-600 leading-relaxed">Địa chỉ: {order.shippingAddress}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

