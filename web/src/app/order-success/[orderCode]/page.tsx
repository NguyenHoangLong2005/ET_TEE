'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { CheckCircle, CreditCard, MapPin, Package, Phone } from 'lucide-react';
import Link from 'next/link';
import { getAuthHeaders, getGuestCartToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';
import SafeImage from '@/components/ui/SafeImage';
import BankTransferPayment from '@/components/orders/BankTransferPayment';

const formatVnd = (value: number) => `${Math.round(value).toLocaleString('vi-VN')}đ`;
const POLL_MS = 5000;
// OrderResponse carries the state as `orderStatus`; there is no `status` field.
const orderStatusOf = (o: any): string | undefined => o?.orderStatus ?? o?.status;

const orderHeaders = () => {
  const headers = getAuthHeaders(true) as Record<string, string>;
  // Also try guest token for public order access
  const guestToken = getGuestCartToken();
  if (guestToken && !headers['Authorization']) {
    headers['X-Guest-Cart-Token'] = guestToken;
  }
  return headers;
};

export default function OrderSuccessPage() {
  const { orderCode } = useParams();

  const [order, setOrder] = useState<any>(null);
  const [bankConfig, setBankConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payosEnabled, setPayosEnabled] = useState(false);
  const [openingPayos, setOpeningPayos] = useState(false);

  useEffect(() => {
    const fetchOrderAndConfig = async () => {
      try {
        const orderRes = await fetch(`${getApiBaseUrl()}/api/orders/${orderCode}`, {
          headers: orderHeaders()
        });
        const orderJson = await orderRes.json();
        if (orderJson.success) {
          setOrder(orderJson.data);

          if (orderJson.data.paymentMethod === 'BANK_TRANSFER') {
            const bankRes = await fetch(`${getApiBaseUrl()}/api/payment-methods/bank-transfer`);
            const bankJson = await bankRes.json();
            if (bankJson.success) {
              setBankConfig(bankJson.data);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch order', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderAndConfig();
  }, [orderCode]);

  // While a bank transfer is outstanding, re-check the order so the page flips to "paid" as soon
  // as it is confirmed: PayOS (payos-sync asks the PayOS API, so the first tick right after PayOS
  // sends the customer back settles it), the SePay webhook, or staff. It used to sit on the QR forever.
  const waiting = order?.paymentMethod === 'BANK_TRANSFER' && order?.paymentStatus !== 'PAID' && orderStatusOf(order) === 'PENDING_PAYMENT';
  const wasWaiting = useRef(false);
  useEffect(() => {
    if (!waiting) return;
    wasWaiting.current = true;
    const check = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/orders/${orderCode}/payos-sync`, { method: 'POST', headers: orderHeaders(), cache: 'no-store' });
        const json = await res.json();
        if (json?.success && json.data) {
          setPayosEnabled(Boolean(json.payosEnabled));
          setOrder(json.data);
        }
      } catch {
        /* keep polling */
      }
    };
    void check();
    const timer = setInterval(check, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, orderCode]);

  useEffect(() => {
    // PayOS cancelUrl; read directly so the page needs no Suspense boundary for useSearchParams.
    if (new URLSearchParams(window.location.search).get('payos') === 'cancelled') {
      toast.info('Bạn đã hủy thanh toán PayOS. Có thể thanh toán lại hoặc chuyển khoản bằng mã QR bên dưới.');
    }
  }, []);

  const openPayos = async () => {
    setOpeningPayos(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/orders/${orderCode}/payos-link`, { method: 'POST', headers: orderHeaders() });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data?.checkoutUrl) {
        window.location.href = json.data.checkoutUrl;
        return;
      }
      toast.error(json?.message || 'Không mở được trang thanh toán PayOS');
    } catch {
      toast.error('Không mở được trang thanh toán PayOS');
    }
    setOpeningPayos(false);
  };

  useEffect(() => {
    if (wasWaiting.current && order?.paymentStatus === 'PAID') {
      toast.success('Đã nhận được thanh toán. Cảm ơn bạn!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [order?.paymentStatus]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mr-3"></div>
        <span className="text-slate-600 font-medium">Đang tải thông tin đơn hàng...</span>
      </div>
    );
  }

  // This page used to render "Đặt hàng thành công!" unconditionally, even
  // when the order fetch failed or the orderCode in the URL didn't match any
  // real order - visiting /order-success/<anything> always claimed success.
  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-black uppercase mb-4 text-slate-900">Không tìm thấy đơn hàng</h1>
        <p className="text-slate-500 mb-8">
          Không thể xác nhận đơn hàng với mã <span className="font-bold text-black">{orderCode}</span>. Vui lòng kiểm tra lại đường dẫn hoặc xem lại đơn hàng trong tài khoản của bạn.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/account/orders" className="px-8 py-3 bg-white border border-black text-black font-bold uppercase rounded-full hover:bg-slate-50 transition-colors text-xs tracking-wider">
            Xem đơn hàng
          </Link>
          <Link href="/products" className="px-8 py-3 bg-primary text-white font-bold uppercase rounded-full hover:bg-primary/90 transition-colors text-xs tracking-wider">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  // A bank-transfer order exists but is not paid until the transfer is confirmed, so it must
  // not be presented as a completed order.
  const isBankTransfer = order.paymentMethod === 'BANK_TRANSFER';
  const awaitingPayment = isBankTransfer && order.paymentStatus !== 'PAID';

  const totalAmount = Number(order.totalAmount ?? order.finalTotal ?? order.total ?? 0);
  const subtotal = Number(order.subtotal ?? totalAmount);
  const discountTotal = Number(order.discountTotal ?? 0);
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const showQr = awaitingPayment && orderStatusOf(order) === 'PENDING_PAYMENT' && !!bankConfig;
  const paidByTransfer = isBankTransfer && order.paymentStatus === 'PAID';
  const cancelled = orderStatusOf(order) === 'CANCELLED';

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center bg-slate-50/60 px-4 py-10">
      <div className="w-full max-w-4xl">
        {/* Only orders that are already settled (COD / paid) get a confirmation header */}
        {!awaitingPayment && !cancelled && (
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60">
              <CheckCircle className="h-9 w-9 text-emerald-500" />
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
              {paidByTransfer ? 'Thanh toán thành công!' : 'Đặt hàng thành công!'}
            </h1>
          </div>
        )}

        <div className={`grid grid-cols-1 items-stretch gap-6 ${showQr ? 'md:grid-cols-2' : 'mx-auto max-w-xl'}`}>
          {/* Payment */}
          {showQr ? (
            <div className="flex flex-col gap-3">
              {payosEnabled && (
                <button
                  type="button"
                  onClick={() => void openPayos()}
                  disabled={openingPayos}
                  className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-primary/90 disabled:opacity-60"
                >
                  <CreditCard className="h-4 w-4" />
                  {openingPayos ? 'Đang mở PayOS…' : 'Thanh toán qua PayOS'}
                </button>
              )}
              <BankTransferPayment
                orderCode={String(orderCode)}
                customerPhone={order.customerPhone}
                amount={totalAmount}
                bankConfig={bankConfig}
              />
            </div>
          ) : cancelled ? (
            <section className="rounded-3xl border border-rose-200 bg-rose-50/60 p-6 text-center shadow-sm md:p-8">
              <h2 className="text-sm font-black uppercase tracking-wider text-rose-800">Đơn hàng đã hủy</h2>
              <p className="mt-3 text-slate-600">Đơn hàng này đã bị hủy. Nếu bạn đã chuyển khoản, vui lòng liên hệ hỗ trợ để được hoàn tiền.</p>
            </section>
          ) : paidByTransfer ? (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 text-center shadow-sm md:p-8">
              <h2 className="text-sm font-black uppercase tracking-wider text-emerald-800">Đã nhận chuyển khoản</h2>
              <p className="mt-3 text-slate-600">
                Chúng tôi đã nhận <span className="font-bold text-slate-900">{formatVnd(totalAmount)}</span>. Đơn hàng đang được chuẩn bị.
              </p>
            </section>
          ) : isBankTransfer ? (
            // Bank transfer still unconfirmed but the QR couldn't be shown: never fall through to the COD text.
            <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-8">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Đang xác nhận thanh toán</h2>
              <p className="mt-3 text-slate-600">
                Chúng tôi đang kiểm tra khoản chuyển <span className="font-bold text-slate-900">{formatVnd(totalAmount)}</span>. Trang sẽ tự cập nhật.
              </p>
            </section>
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-8">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Thanh toán khi nhận hàng (COD)</h2>
              <p className="mt-3 text-slate-600">
                Bạn sẽ thanh toán <span className="font-bold text-slate-900">{formatVnd(totalAmount)}</span> khi nhận được hàng.
              </p>
            </section>
          )}

          {/* Order summary */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-900">
                <Package className="h-4 w-4 text-primary" /> Đơn hàng
              </h2>
              <span className="font-mono text-xs font-bold tracking-wide text-slate-500">{orderCode}</span>
            </div>

            {items.length > 0 && (
              <ul className="mt-5 divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <li key={item.id ?? idx} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <SafeImage src={item.image} alt={item.productName} fill className="object-cover" />
                      <span className="absolute right-0 top-0 rounded-bl-lg bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        ×{item.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="line-clamp-2 font-bold text-slate-900">{item.productName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{[item.color, item.size].filter(Boolean).join(' / ')}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-900">{formatVnd(Number(item.totalPrice ?? item.unitPrice * item.quantity))}</p>
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

            {(order.customerName || order.shippingAddressSnapshot) && (
              <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Giao đến</p>
                {order.customerName && <p className="font-bold text-slate-900">{order.customerName}</p>}
                {order.customerPhone && (
                  <p className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {order.customerPhone}
                  </p>
                )}
                {order.shippingAddressSnapshot && (
                  <p className="flex items-start gap-2 text-slate-600">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> {order.shippingAddressSnapshot}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Link
            href="/account/orders"
            className="flex-1 rounded-full border border-slate-900 bg-white px-8 py-3.5 text-center text-xs font-black uppercase tracking-wider text-slate-900 transition-colors hover:bg-slate-50"
          >
            Xem đơn hàng
          </Link>
          <Link
            href="/products"
            className="flex-1 rounded-full bg-primary px-8 py-3.5 text-center text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-primary/90 active:scale-[0.99]"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
}
