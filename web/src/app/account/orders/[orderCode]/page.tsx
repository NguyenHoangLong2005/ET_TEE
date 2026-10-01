'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Banknote, CheckCircle2, Clock, Package, QrCode, RotateCcw, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthHeaders } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';
import { apiClient } from '@/lib/api-client';
import { OrderService } from '@/lib/services/orderService';
import SafeImage from '@/components/ui/SafeImage';
import BankTransferPayment, { useBankConfig } from '@/components/orders/BankTransferPayment';

const STATUS_MAP: Record<string, { label: string; colorClass: string; icon: any }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', colorClass: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', colorClass: 'text-sky-700 bg-sky-50 border-sky-200', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: CheckCircle2 },
  PICKING: { label: 'Đang chuẩn bị hàng', colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: Package },
  PACKED: { label: 'Đã đóng gói', colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: Package },
  HANDED_TO_CARRIER: { label: 'Đã giao vận chuyển', colorClass: 'text-purple-700 bg-purple-50 border-purple-200', icon: Truck },
  SHIPPING: { label: 'Đang giao hàng', colorClass: 'text-purple-700 bg-purple-50 border-purple-200', icon: Truck },
  DELIVERED: { label: 'Đã giao', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  COMPLETED: { label: 'Hoàn thành', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy', colorClass: 'text-rose-700 bg-rose-50 border-rose-200', icon: XCircle },
  RETURN_REQUESTED: { label: 'Đang chờ duyệt trả hàng', colorClass: 'text-orange-700 bg-orange-50 border-orange-200', icon: RotateCcw },
  RETURNED: { label: 'Hoàn trả', colorClass: 'text-orange-700 bg-orange-50 border-orange-200', icon: XCircle },
  REFUNDED: { label: 'Đã hoàn tiền', colorClass: 'text-slate-700 bg-slate-100 border-slate-200', icon: CheckCircle2 },
};

const formatVnd = (value: number) => `${Math.round(value || 0).toLocaleString('vi-VN')}đ`;

const formatDate = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const PAYMENT_METHODS = [
  {
    id: 'BANK_TRANSFER',
    title: 'Chuyển khoản qua QR',
    desc: 'Quét mã QR bằng app ngân hàng, số tiền và nội dung được điền sẵn.',
    icon: QrCode,
  },
  {
    id: 'COD',
    title: 'Thanh toán khi nhận hàng',
    desc: 'Trả tiền mặt cho nhân viên giao hàng khi nhận được sản phẩm.',
    icon: Banknote,
  },
] as const;

export default function OrderDetailsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderCode = params.orderCode as string;

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [isRequestingReturn, setIsRequestingReturn] = useState(false);

  // Receiver info + payment method for an order that is still waiting for payment
  const [form, setForm] = useState({ customerName: '', customerPhone: '', shippingAddress: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<'BANK_TRANSFER' | 'COD'>('BANK_TRANSFER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const awaitingPayment = order?.orderStatus === 'PENDING_PAYMENT' && order?.paymentStatus !== 'PAID';
  const bankConfig = useBankConfig(!!awaitingPayment && (method === 'BANK_TRANSFER' || showQr));

  const applyOrder = useCallback((data: any) => {
    setOrder(data);
    setForm({
      customerName: data?.customerName || '',
      customerPhone: data?.customerPhone || '',
      shippingAddress: data?.shippingAddressSnapshot || data?.shippingAddress || '',
    });
    if (data?.paymentMethod === 'COD' || data?.paymentMethod === 'BANK_TRANSFER') setMethod(data.paymentMethod);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?redirect=/account/orders/${orderCode}`);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${getApiBaseUrl()}/api/orders/${orderCode}`, { headers: headers as any });
        const json = await res.json();
        if (json.success && json.data) {
          applyOrder(json.data);
        } else {
          // Fallback: look up in user's order list
          const allRes = await fetch(`${getApiBaseUrl()}/api/orders/me`, { headers: headers as any });
          const allJson = await allRes.json();
          const found = allJson.success ? (allJson.data || []).find((o: any) => o.orderCode === orderCode) : null;
          applyOrder(found || null);
        }
      } catch (err) {
        console.error('Failed to fetch order details', err);
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [user?.id, authLoading, router, orderCode, applyOrder]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
    setIsCancelling(true);
    try {
      const ok = await OrderService.cancelOrder(orderCode);
      if (ok) {
        toast.success('Đã gửi yêu cầu hủy đơn hàng thành công!');
        setOrder((prev: any) => (prev ? { ...prev, orderStatus: 'CANCELLED' } : prev));
        setShowQr(false);
      } else {
        toast.error('Không thể hủy đơn hàng vào lúc này. Vui lòng liên hệ bộ phận CSKH.');
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi hủy đơn hàng');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRequestReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnReason.trim().length < 5) {
      toast.error('Vui lòng cho biết lý do trả hàng (tối thiểu 5 ký tự)');
      return;
    }
    setIsRequestingReturn(true);
    try {
      const updated = await apiClient.post<any>(`/api/orders/${orderCode}/return-request`, { reason: returnReason.trim() });
      toast.success('Đã gửi yêu cầu trả hàng. Cửa hàng sẽ liên hệ với bạn để xử lý.');
      applyOrder(updated);
      setShowReturnForm(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể gửi yêu cầu trả hàng');
    } finally {
      setIsRequestingReturn(false);
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.customerName.trim().length < 2) next.customerName = 'Vui lòng nhập họ tên người nhận';
    if (!/^[0-9+\s-]{8,15}$/.test(form.customerPhone.trim())) next.customerPhone = 'Số điện thoại không hợp lệ (8-15 chữ số)';
    if (form.shippingAddress.trim().length < 8) next.shippingAddress = 'Địa chỉ quá ngắn, vui lòng nhập số nhà, đường, quận/huyện';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Vui lòng kiểm tra lại thông tin nhận hàng');
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await apiClient.put<any>(`/api/orders/${orderCode}/payment`, {
        paymentMethod: method,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        shippingAddress: form.shippingAddress.trim(),
      });
      if (method === 'COD') {
        toast.success('Đã chuyển sang thanh toán khi nhận hàng. Đơn hàng đang chờ xác nhận.');
        applyOrder(updated);
        setShowQr(false);
      } else {
        applyOrder(updated);
        setShowQr(true);
        setTimeout(() => qrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật thanh toán');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || authLoading) {
    return <div className="p-8 text-center animate-pulse text-slate-500">Đang tải đơn hàng...</div>;
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
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const totalAmount = Number(order.totalAmount ?? 0);
  const subtotal = Number(order.subtotal ?? totalAmount);
  const discountTotal = Number(order.discountTotal ?? 0);
  const canCancel = ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'PENDING'].includes(order.orderStatus);

  const inputClass = (name: string) =>
    `w-full rounded-xl border px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
      errors[name] ? 'border-red-300' : 'border-slate-300'
    }`;

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại</span>
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-1">Đơn hàng #{order.orderCode}</h1>
          {formatDate(order.createdAt) && <p className="text-slate-500 text-sm">Ngày đặt: {formatDate(order.createdAt)}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold ${statusConfig.colorClass}`}>
            <StatusIcon className="w-4 h-4" />
            <span>{statusConfig.label}</span>
          </div>
          {canCancel && (
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-full text-xs font-bold transition-all disabled:opacity-50"
            >
              {isCancelling ? 'Đang xử lý...' : 'Hủy đơn hàng'}
            </button>
          )}
          {order.orderStatus === 'DELIVERED' && order.returnEligible && !showReturnForm && (
            <button
              type="button"
              onClick={() => setShowReturnForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-full text-xs font-bold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Yêu cầu trả hàng
            </button>
          )}
        </div>
      </div>

      {order.orderStatus === 'DELIVERED' && showReturnForm && (
        <form onSubmit={handleRequestReturn} className="mb-8 rounded-3xl border border-orange-200 bg-orange-50/50 p-6">
          <h2 className="mb-1 text-sm font-black uppercase tracking-wider text-slate-900">Yêu cầu trả hàng</h2>
          <p className="mb-4 text-xs text-slate-600">
            Áp dụng trong 30 ngày kể từ khi nhận hàng
            {order.returnDeadline ? ` (hạn chót ${formatDate(order.returnDeadline)})` : ''}. Cửa hàng sẽ liên hệ để hướng dẫn gửi trả và hoàn tiền.
          </p>
          <label htmlFor="return-reason" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Lý do trả hàng *</label>
          <textarea
            id="return-reason"
            rows={3}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Ví dụ: sản phẩm không vừa size, lỗi đường may..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isRequestingReturn}
              className="rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isRequestingReturn ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <button
              type="button"
              onClick={() => setShowReturnForm(false)}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
            >
              Để sau
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Left: payment flow (unpaid) or receiver info (otherwise) */}
        <div className="lg:col-span-3 space-y-6">
          {awaitingPayment ? (
            <form onSubmit={handleConfirm} className="space-y-6" noValidate>
              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-5 text-sm font-black uppercase tracking-wider text-slate-900">1. Thông tin nhận hàng</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Họ tên *</label>
                    <input
                      value={form.customerName}
                      onChange={e => setForm({ ...form, customerName: e.target.value })}
                      className={inputClass('customerName')}
                      placeholder="Nguyễn Văn A"
                    />
                    {errors.customerName && <p className="mt-1 text-xs font-medium text-primary">{errors.customerName}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Số điện thoại *</label>
                    <input
                      value={form.customerPhone}
                      onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                      className={inputClass('customerPhone')}
                      placeholder="0901234567"
                      inputMode="tel"
                    />
                    {errors.customerPhone && <p className="mt-1 text-xs font-medium text-primary">{errors.customerPhone}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Địa chỉ giao hàng *</label>
                  <textarea
                    rows={3}
                    value={form.shippingAddress}
                    onChange={e => setForm({ ...form, shippingAddress: e.target.value })}
                    className={inputClass('shippingAddress')}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  />
                  {errors.shippingAddress && <p className="mt-1 text-xs font-medium text-primary">{errors.shippingAddress}</p>}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-5 text-sm font-black uppercase tracking-wider text-slate-900">2. Phương thức thanh toán</h2>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(pm => {
                    const active = method === pm.id;
                    const Icon = pm.icon;
                    return (
                      <label
                        key={pm.id}
                        className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-colors ${
                          active ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={pm.id}
                          checked={active}
                          onChange={() => { setMethod(pm.id); setShowQr(false); }}
                          className="mt-1 h-5 w-5 accent-primary"
                        />
                        <div className="flex-1">
                          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Icon className="h-4 w-4 text-slate-500" /> {pm.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{pm.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 w-full rounded-full bg-primary px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Đang xử lý...'
                    : method === 'BANK_TRANSFER'
                      ? 'Xác nhận và hiện mã QR'
                      : 'Xác nhận thanh toán khi nhận hàng'}
                </button>
              </section>

              {showQr && method === 'BANK_TRANSFER' && (
                <div ref={qrRef} className="scroll-mt-28">
                  {bankConfig ? (
                    <BankTransferPayment
                      orderCode={order.orderCode}
                      customerPhone={order.customerPhone}
                      amount={totalAmount}
                      bankConfig={bankConfig}
                    />
                  ) : (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                      Đang tải thông tin thanh toán...
                    </div>
                  )}
                </div>
              )}
            </form>
          ) : (
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-8 space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Thông tin nhận hàng</h2>
              <div className="space-y-1.5 text-sm">
                {order.customerName && <p className="font-semibold text-slate-900">{order.customerName}</p>}
                {order.customerPhone && <p className="text-slate-600">SĐT: {order.customerPhone}</p>}
                {(order.shippingAddressSnapshot || order.shippingAddress) && (
                  <p className="leading-relaxed text-slate-600">Địa chỉ: {order.shippingAddressSnapshot || order.shippingAddress}</p>
                )}
              </div>
              <div className="border-t border-slate-100 pt-4 text-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phương thức thanh toán</p>
                <p className="mt-1 font-bold text-slate-900">
                  {order.paymentMethod === 'BANK_TRANSFER'
                    ? `Chuyển khoản ngân hàng${order.paymentStatus === 'PAID' ? ' (đã thanh toán)' : ''}`
                    : 'Thanh toán khi nhận hàng (COD)'}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* Right: order summary */}
        <aside className="lg:col-span-2 lg:sticky lg:top-24">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm md:p-7">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
              <Package className="h-4 w-4 text-primary" /> Sản phẩm đã đặt
            </h2>

            {items.length > 0 && (
              <ul className="mt-5 divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <li key={item.id ?? idx} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <SafeImage src={item.image} alt={item.productName} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      {item.productSlug ? (
                        <Link href={`/products/${item.productSlug}`} className="line-clamp-2 font-bold text-slate-900 hover:text-primary transition-colors">
                          {item.productName}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 font-bold text-slate-900">{item.productName}</p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[item.color, item.size].filter(Boolean).join(' / ')}
                        {item.quantity ? ` · SL ${item.quantity}` : ''}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-900">
                      {formatVnd(Number(item.totalPrice ?? (item.unitPrice ?? 0) * (item.quantity ?? 1)))}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>Tạm tính</dt>
                <dd>{formatVnd(subtotal)}</dd>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ''}</dt>
                  <dd>-{formatVnd(discountTotal)}</dd>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <dt>Phí vận chuyển</dt>
                <dd className="font-bold text-primary">Miễn phí</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
                <dt className="font-black text-slate-900">Tổng cộng</dt>
                <dd className="text-xl font-black text-primary">{formatVnd(totalAmount)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
