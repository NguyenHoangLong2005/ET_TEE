'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getAuthHeaders } from '@/lib/auth';
import { behaviorSessionHeader } from '@/lib/services/behaviorTracking';
import { getApiBaseUrl } from '@/lib/api-config';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import PageBreadcrumb from '@/components/ui/PageBreadcrumb';
import SafeImage from '@/components/ui/SafeImage';
import { formatVnd } from '@/lib/utils/price';
import VoucherCard from '@/components/vouchers/VoucherCard';
import { CustomerMarketingService, VoucherOption } from '@/lib/services/customerMarketingService';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, fetchCart, isLoading: cartLoading } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set once the order is placed: the cart empties before the redirect lands, and the
  // "Giỏ hàng trống" screen must not flash in between.
  const [orderPlaced, setOrderPlaced] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    shippingMethod: 'STANDARD',
    paymentMethod: 'COD',
    note: '',
    voucherCode: '',
  });

  const [voucherInfo, setVoucherInfo] = useState<{ discountAmount: number; finalTotal: number; name: string; freeShipping: boolean } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  // Codes this shopper can use on this cart, best first (public + their personal vouchers)
  const [voucherOptions, setVoucherOptions] = useState<VoucherOption[]>([]);

  // itemTotal is computed by the server from the price rounded to the thousand, the same
  // price checkout charges. Summing raw salePrice/price here showed a different total.
  const calculateSubtotal = () => (cart?.items || []).reduce((sum, item) => sum + item.itemTotal, 0);

  const applyVoucher = async (codeOverride?: string) => {
    const code = (codeOverride ?? formData.voucherCode).trim().toUpperCase();
    if (codeOverride) setFormData(prev => ({ ...prev, voucherCode: code }));
    if (!code) {
      setVoucherInfo(null);
      setVoucherError(null);
      return;
    }
    setVoucherLoading(true);
    setVoucherError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/marketing/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAuthHeaders() as Record<string, string>) },
        body: JSON.stringify({ code, subtotal: calculateSubtotal() }),
      });
      const json = await res.json();
      if (json.success) {
        setVoucherInfo({
          discountAmount: json.data.discountAmount,
          finalTotal: json.data.finalTotal,
          name: json.data.name,
          freeShipping: json.data.freeShipping,
        });
        toast.success('Áp dụng voucher thành công');
      } else {
        setVoucherInfo(null);
        setVoucherError(json.message || 'Voucher không hợp lệ');
        toast.error(json.message || 'Voucher không hợp lệ');
      }
    } catch {
      setVoucherInfo(null);
      setVoucherError('Không thể kiểm tra voucher');
      toast.error('Không thể kiểm tra voucher');
    } finally {
      setVoucherLoading(false);
    }
  };

  const [bankConfig, setBankConfig] = useState<any>(null);

  // Prefill the form from the logged-in customer's profile. Only empty fields are filled, so
  // anything the customer already typed (or an earlier autofill) is never overwritten.
  useEffect(() => {
    if (!user) return;
    const fillEmpty = (values: Partial<typeof formData>) =>
      setFormData(prev => {
        const next = { ...prev };
        (Object.keys(values) as (keyof typeof formData)[]).forEach(key => {
          if (!prev[key] && values[key]) next[key] = values[key] as string;
        });
        return next;
      });

    // Immediately from the auth context, then completed from the full profile (address).
    fillEmpty({
      customerName: user.fullName || '',
      customerEmail: user.email || '',
      customerPhone: user.phone || '',
    });

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/account/profile`, {
          headers: getAuthHeaders() as Record<string, string>,
        });
        if (!res.ok) return;
        const json = await res.json();
        const d = json?.data;
        if (cancelled || !json?.success || !d) return;
        fillEmpty({
          customerName: d.fullName || '',
          customerPhone: d.phone || '',
          shippingAddress: d.defaultShippingAddress || '',
        });
      } catch {
        /* profile is a convenience; the customer can still type the details */
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Re-ranked whenever the cart total changes (minimum-order conditions depend on it)
  const cartTotal = calculateSubtotal();
  useEffect(() => {
    if (cartTotal <= 0) return;
    let cancelled = false;
    CustomerMarketingService.vouchersForMe(cartTotal).then(opts => {
      if (!cancelled) setVoucherOptions(opts.filter(o => o.usable).slice(0, 3));
    });
    return () => { cancelled = true; };
  }, [cartTotal, user]);

  useEffect(() => {
    const fetchBankConfig = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/payment-methods/bank-transfer`);
        const json = await res.json();
        if (json.success) {
          setBankConfig(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch bank config', err);
      }
    };
    fetchBankConfig();
  }, []);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'customerName':
        if (!value.trim()) return 'Vui lòng nhập họ và tên của bạn';
        if (value.trim().length < 2) return 'Họ tên tối thiểu 2 ký tự';
        return '';
      case 'customerPhone':
        if (!value.trim()) return 'Vui lòng nhập số điện thoại';
        if (!/^[0-9+\s\-]{8,15}$/.test(value.trim())) return 'Số điện thoại không hợp lệ (8-15 chữ số)';
        return '';
      case 'customerEmail':
        if (!value.trim()) return 'Vui lòng nhập địa chỉ email';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Địa chỉ email không đúng định dạng';
        return '';
      case 'shippingAddress':
        if (!value.trim()) return 'Vui lòng nhập địa chỉ giao hàng';
        if (value.trim().length < 8) return 'Địa chỉ quá ngắn, vui lòng nhập số nhà, đường, quận/huyện';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, (formData as any)[field] || '');
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.customerName.trim();
    const cleanPhone = formData.customerPhone.trim();
    const cleanEmail = formData.customerEmail.trim();
    const cleanAddress = formData.shippingAddress.trim();

    const errors: Record<string, string> = {
      customerName: validateField('customerName', cleanName),
      customerPhone: validateField('customerPhone', cleanPhone),
      customerEmail: validateField('customerEmail', cleanEmail),
      shippingAddress: validateField('shippingAddress', cleanAddress),
    };

    setTouched({
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      shippingAddress: true,
    });
    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      toast.error('Vui lòng kiểm tra và điền đúng các trường thông tin');
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = getAuthHeaders(true, behaviorSessionHeader());

      // formData.voucherCode used to be sent verbatim even when the user
      // typed a code but never clicked "Áp dụng" (or it failed validation),
      // so checkout could apply/reject a code the displayed total never
      // accounted for. Only send it once it's been validated and voucherInfo
      // actually reflects the current text in the field.
      const checkoutPayload = {
        ...formData,
        voucherCode: voucherInfo ? formData.voucherCode.trim() : '',
      };

      const res = await fetch(`${getApiBaseUrl()}/api/orders/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(checkoutPayload)
      });
      
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Lỗi khi thanh toán');
      }

      const orderCode = json.data.orderCode;
      setOrderPlaced(true);
      fetchCart();

      // Bank transfer: hand over to the PayOS checkout page when PayOS is configured; it sends the
      // customer back to /order-success, which confirms the payment with PayOS. Otherwise (or if
      // PayOS fails) the order page shows the plain QR as before.
      if (checkoutPayload.paymentMethod === 'BANK_TRANSFER') {
        try {
          const linkRes = await fetch(`${getApiBaseUrl()}/api/orders/${orderCode}/payos-link`, { method: 'POST', headers });
          const link = await linkRes.json().catch(() => null);
          if (linkRes.ok && link?.data?.checkoutUrl) {
            window.location.href = link.data.checkoutUrl;
            return;
          }
        } catch {
          /* fall back to the QR page */
        }
        toast.success('Đã tạo đơn hàng. Vui lòng chuyển khoản để hoàn tất.');
      } else {
        toast.success('Đặt hàng thành công!');
      }
      router.push(`/order-success/${orderCode}`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
      setIsSubmitting(false);
    }
  };

  if (orderPlaced || (cartLoading && !cart)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500">
          {orderPlaced ? 'Đang chuyển đến trang thanh toán…' : 'Đang tải giỏ hàng…'}
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PageBreadcrumb items={[{ label: 'Thanh toán' }]} />
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
          <h1 className="text-2xl font-black uppercase text-slate-900 mb-2">Giỏ hàng trống</h1>
          <p className="mb-6 text-slate-500 text-sm max-w-sm">Bạn cần có sản phẩm trong giỏ hàng để tiến hành thanh toán.</p>
          <button
            onClick={() => router.push('/products')}
            className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-full font-black uppercase text-xs tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    );
  }

  const subtotal = calculateSubtotal();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-12 text-slate-900">
      <PageBreadcrumb items={[{ label: 'Giỏ hàng', href: '/cart' }, { label: 'Thanh toán' }]} />

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="lg:w-2/3">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Thông tin giao hàng */}
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/80">
              <h2 className="text-lg font-black mb-6 uppercase text-slate-900 tracking-tight flex items-center gap-2">
                <span>1. Thông tin giao hàng</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Họ tên <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('customerName')}
                    required
                    className={`w-full border rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all bg-white ${
                      touched.customerName && fieldErrors.customerName
                        ? 'border-primary ring-2 ring-primary/20 bg-red-50/20'
                        : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                    }`}
                    placeholder="Nguyễn Văn A"
                  />
                  {touched.customerName && fieldErrors.customerName && (
                    <p className="mt-1.5 text-xs text-primary font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{fieldErrors.customerName}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Số điện thoại <span className="text-primary">*</span>
                  </label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('customerPhone')}
                    required
                    className={`w-full border rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all bg-white ${
                      touched.customerPhone && fieldErrors.customerPhone
                        ? 'border-primary ring-2 ring-primary/20 bg-red-50/20'
                        : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                    }`}
                    placeholder="0901234567"
                  />
                  {touched.customerPhone && fieldErrors.customerPhone && (
                    <p className="mt-1.5 text-xs text-primary font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{fieldErrors.customerPhone}</span>
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email <span className="text-primary">*</span>
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('customerEmail')}
                    required
                    className={`w-full border rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all bg-white ${
                      touched.customerEmail && fieldErrors.customerEmail
                        ? 'border-primary ring-2 ring-primary/20 bg-red-50/20'
                        : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                    }`}
                    placeholder="email@example.com"
                  />
                  {touched.customerEmail && fieldErrors.customerEmail && (
                    <p className="mt-1.5 text-xs text-primary font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{fieldErrors.customerEmail}</span>
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Địa chỉ giao hàng chi tiết <span className="text-primary">*</span>
                  </label>
                  <textarea 
                    name="shippingAddress"
                    required
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('shippingAddress')}
                    rows={3} 
                    className={`w-full border rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all bg-white ${
                      touched.shippingAddress && fieldErrors.shippingAddress
                        ? 'border-primary ring-2 ring-primary/20 bg-red-50/20'
                        : 'border-slate-300 focus:border-primary focus:ring-primary/20'
                    }`}
                    placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                  />
                  {touched.shippingAddress && fieldErrors.shippingAddress && (
                    <p className="mt-1.5 text-xs text-primary font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{fieldErrors.shippingAddress}</span>
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Ghi chú đơn hàng (Tùy chọn)
                  </label>
                  <textarea 
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    rows={2} 
                    className="w-full border border-slate-300 rounded-xl p-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    placeholder="Ghi chú thêm cho người giao hàng..."
                  />
                </div>
              </div>
            </section>

            {/* Phương thức vận chuyển */}
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/80">
              <h2 className="text-lg font-black mb-6 uppercase text-slate-900 tracking-tight">
                2. Phương thức vận chuyển
              </h2>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-primary bg-red-50/40 rounded-2xl cursor-pointer">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="STANDARD"
                    checked={formData.shippingMethod === 'STANDARD'}
                    onChange={handleInputChange}
                    className="text-primary focus:ring-primary w-5 h-5 accent-primary"
                  />
                  <div className="ml-3 flex-1 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-900">Giao hàng tiêu chuẩn</span>
                    <span className="font-extrabold text-primary uppercase text-xs bg-red-100 px-3 py-1 rounded-full">Miễn phí</span>
                  </div>
                </label>
              </div>
            </section>

            {/* Phương thức thanh toán */}
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/80">
              <h2 className="text-lg font-black mb-6 uppercase text-slate-900 tracking-tight">
                3. Phương thức thanh toán
              </h2>
              <div className="space-y-3">
                <label className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-colors ${formData.paymentMethod === 'COD' ? 'border-primary bg-red-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={formData.paymentMethod === 'COD'}
                    onChange={handleInputChange}
                    className="text-primary focus:ring-primary w-5 h-5 accent-primary"
                  />
                  <span className="ml-3 font-bold text-slate-900 text-sm">Thanh toán khi nhận hàng (COD)</span>
                </label>

                <label className={`flex flex-col p-4 border rounded-2xl cursor-pointer transition-colors ${formData.paymentMethod === 'BANK_TRANSFER' ? 'border-primary bg-red-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="BANK_TRANSFER"
                      checked={formData.paymentMethod === 'BANK_TRANSFER'}
                      onChange={handleInputChange}
                      className="text-primary focus:ring-primary w-5 h-5 accent-primary"
                    />
                    <span className="ml-3 font-bold text-slate-900 text-sm">Chuyển khoản qua Ngân hàng / QR Code</span>
                  </div>
                  {formData.paymentMethod === 'BANK_TRANSFER' && bankConfig && (
                    <div className="mt-4 ml-8 p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                      <p className="mb-2"><strong>Ngân hàng:</strong> {bankConfig.bankName}</p>
                      <p className="mb-2"><strong>Số tài khoản:</strong> {bankConfig.accountNumber}</p>
                      <p className="mb-2"><strong>Chủ tài khoản:</strong> {bankConfig.accountName}</p>
                      <p className="mt-4 italic text-xs text-slate-500">Mã QR và nội dung chuyển khoản sẽ được cung cấp ở bước tiếp theo sau khi bạn bấm Đặt hàng.</p>
                    </div>
                  )}
                </label>
              </div>
            </section>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white px-6 py-4 rounded-xl font-black uppercase tracking-wider hover:bg-primary/90 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Hoàn tất Đặt hàng'}
            </button>
          </form>
        </div>

        {/* Tóm tắt đơn hàng */}
        <div className="lg:w-1/3">
          <div className="sticky top-24 bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200/80">
            <h2 className="text-lg font-black mb-6 uppercase tracking-tight text-slate-900 border-b border-slate-200 pb-4">
              Đơn hàng của bạn
            </h2>
            
            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 divide-y divide-slate-100">
              {cart.items.map((item, idx) => (
                <div key={item.id} className={`flex gap-4 ${idx > 0 ? 'pt-4' : ''}`}>
                  <div className="w-16 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 relative">
                    <SafeImage
                      src={item.productImage || '/images/products/placeholder.webp'}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-bold text-slate-900 line-clamp-2">{item.productName}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.color} / {item.size}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-slate-500">x{item.quantity}</span>
                      <span className="font-bold text-slate-900">{formatVnd(item.salePrice || item.price)}đ</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span>
                <span className="font-medium text-slate-900">{subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                <span className="font-bold text-primary">Miễn phí</span>
              </div>
              {voucherInfo ? (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Giảm giá ({formData.voucherCode})</span>
                  <span>-{voucherInfo.discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              ) : null}
              <div className="flex justify-between font-black text-xl text-slate-900 border-t border-slate-200 pt-4 mt-2">
                <span>Tổng cộng</span>
                <span className="text-primary">{(voucherInfo ? Math.max(0, voucherInfo.finalTotal) : subtotal).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Voucher */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">Mã giảm giá</label>
              {!voucherInfo && voucherOptions.length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className="text-xs text-slate-500">Mã bạn dùng được cho đơn này, có lợi nhất trước:</p>
                  {voucherOptions.map((v, i) => (
                    <VoucherCard key={v.code} voucher={v} highlight={i === 0} onApply={code => applyVoucher(code)} />
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã"
                  value={formData.voucherCode}
                  onChange={(e) => {
                    const next = e.target.value.toUpperCase();
                    setFormData({ ...formData, voucherCode: next });
                    // Editing the code after it was applied used to keep showing
                    // the old "Đã áp dụng X" banner (and the old discount) even
                    // though it no longer matched what's typed.
                    if (voucherInfo && next !== formData.voucherCode) {
                      setVoucherInfo(null);
                    }
                  }}
                  className="flex-1 min-w-0 px-3.5 h-11 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                />
                <button
                  type="button"
                  onClick={() => applyVoucher()}
                  disabled={voucherLoading || !formData.voucherCode.trim()}
                  className="shrink-0 whitespace-nowrap h-11 px-5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-primary transition-colors disabled:opacity-40"
                >
                  {voucherLoading ? 'Đang kiểm tra…' : 'Áp dụng'}
                </button>
              </div>
              {voucherInfo ? (
                <div className="mt-2.5 text-xs text-emerald-700 font-medium flex items-center justify-between">
                  <span>✓ Đã áp dụng <strong>{voucherInfo.name}</strong> (-{voucherInfo.discountAmount.toLocaleString('vi-VN')}đ)</span>
                  <button type="button" onClick={() => { setVoucherInfo(null); setFormData({ ...formData, voucherCode: '' }); }} className="underline text-slate-500 hover:text-slate-900 ml-2">
                    Xóa
                  </button>
                </div>
              ) : voucherError ? (
                <div className="mt-2.5 text-xs text-primary font-medium">{voucherError}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Checkout Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tổng thanh toán</span>
          <span className="text-lg font-black text-primary tracking-tight">
            {(voucherInfo ? Math.max(0, voucherInfo.finalTotal) : subtotal).toLocaleString('vi-VN')}₫
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            const form = document.getElementById('checkout-form') as HTMLFormElement;
            if (form) form.requestSubmit();
          }}
          disabled={isSubmitting}
          className="flex-1 max-w-[200px] h-11 bg-primary hover:bg-primary-hover text-white rounded-full font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Đang xử lý...' : 'Đặt hàng ngay'}
        </button>
      </div>
    </div>
  );
}
