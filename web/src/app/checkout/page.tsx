'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getAuthHeaders } from '@/lib/auth';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, fetchCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const applyVoucher = async () => {
    if (!formData.voucherCode.trim()) {
      setVoucherInfo(null);
      setVoucherError(null);
      return;
    }
    setVoucherLoading(true);
    setVoucherError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081'}/api/marketing/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() as Record<string, string> },
        body: JSON.stringify({ code: formData.voucherCode.trim().toUpperCase(), subtotal: calculateSubtotal() }),
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
    } catch (err: any) {
      setVoucherInfo(null);
      setVoucherError('Không thể kiểm tra voucher');
      toast.error('Không thể kiểm tra voucher');
    } finally {
      setVoucherLoading(false);
    }
  };

  const [bankConfig, setBankConfig] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customerName: user.fullName || '',
        customerEmail: user.email || '',
        customerPhone: user.phone || ''
      }));
    }
  }, [user]);



  useEffect(() => {
    // Fetch bank config if BANK_TRANSFER is selected or just pre-fetch it
    const fetchBankConfig = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081'}/api/payment-methods/bank-transfer`);
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


  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Giỏ hàng trống</h1>
        <p className="mb-6 text-gray-500">Bạn cần có sản phẩm trong giỏ hàng để thanh toán.</p>
        <button onClick={() => router.push('/products')} className="px-8 py-3 bg-black text-white rounded font-bold uppercase hover:bg-gray-800">
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.customerPhone.trim() || !formData.customerEmail.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin liên hệ');
      return;
    }
    if (!formData.shippingAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = getAuthHeaders(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081'}/api/orders/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });
      
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Lỗi khi thanh toán');
      }

      toast.success('Đặt hàng thành công!');
      await fetchCart(); // Refresh cart to show it's empty globally
      router.push(`/order-success/${json.data.orderCode}`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateSubtotal = () => cart.items.reduce((sum, item) => {
    const price = item.salePrice || item.price;
    return sum + (price * item.quantity);
  }, 0);

  const subtotal = calculateSubtotal();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900 mb-8">Thanh toán</h1>
      
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="lg:w-2/3">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Thông tin giao hàng */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 uppercase">Thông tin giao hàng</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                  <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} required className="w-full border border-gray-300 rounded p-3 focus:ring-black focus:border-black bg-white" placeholder="Nguyễn Văn A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                  <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleInputChange} required className="w-full border border-gray-300 rounded p-3 focus:ring-black focus:border-black bg-white" placeholder="0901234567" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleInputChange} required className="w-full border border-gray-300 rounded p-3 focus:ring-black focus:border-black bg-white" placeholder="email@example.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ giao hàng chi tiết <span className="text-red-500">*</span></label>
                  <textarea 
                    name="shippingAddress"
                    required
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    rows={3} 
                    className="w-full border border-gray-300 rounded p-3 focus:ring-black focus:border-black"
                    placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú đơn hàng (Tùy chọn)</label>
                  <textarea 
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    rows={2} 
                    className="w-full border border-gray-300 rounded p-3 focus:ring-black focus:border-black"
                    placeholder="Ghi chú thêm cho người giao hàng..."
                  />
                </div>
              </div>
            </section>

            {/* Phương thức vận chuyển */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 uppercase">Phương thức vận chuyển</h2>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-black rounded-lg cursor-pointer bg-gray-50">
                  <input type="radio" name="shippingMethod" value="STANDARD" checked={formData.shippingMethod === 'STANDARD'} onChange={handleInputChange} className="text-black focus:ring-black w-5 h-5" />
                  <div className="ml-3 flex-1 flex justify-between">
                    <span className="font-medium text-gray-900">Giao hàng tiêu chuẩn</span>
                    <span className="font-bold">Miễn phí</span>
                  </div>
                </label>
              </div>
            </section>

            {/* Phương thức thanh toán */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 uppercase">Phương thức thanh toán</h2>
              <div className="space-y-3">
                <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${formData.paymentMethod === 'COD' ? 'border-black bg-gray-50' : 'border-gray-200'}`}>
                  <input type="radio" name="paymentMethod" value="COD" checked={formData.paymentMethod === 'COD'} onChange={handleInputChange} className="text-black focus:ring-black w-5 h-5" />
                  <span className="ml-3 font-medium text-gray-900">Thanh toán khi nhận hàng (COD)</span>
                </label>

                <label className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-colors ${formData.paymentMethod === 'BANK_TRANSFER' ? 'border-black bg-gray-50' : 'border-gray-200'}`}>
                  <div className="flex items-center">
                    <input type="radio" name="paymentMethod" value="BANK_TRANSFER" checked={formData.paymentMethod === 'BANK_TRANSFER'} onChange={handleInputChange} className="text-black focus:ring-black w-5 h-5" />
                    <span className="ml-3 font-medium text-gray-900">Chuyển khoản qua Ngân hàng / QR Code</span>
                  </div>
                  {formData.paymentMethod === 'BANK_TRANSFER' && bankConfig && (
                    <div className="mt-4 ml-8 p-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-600">
                      <p className="mb-2"><strong>Ngân hàng:</strong> {bankConfig.bankName}</p>
                      <p className="mb-2"><strong>Số tài khoản:</strong> {bankConfig.accountNumber}</p>
                      <p className="mb-2"><strong>Chủ tài khoản:</strong> {bankConfig.accountName}</p>
                      <p className="mt-4 italic text-xs text-gray-500">Mã QR và nội dung chuyển khoản sẽ được cung cấp ở bước tiếp theo sau khi bạn bấm Đặt hàng.</p>
                    </div>
                  )}
                </label>
              </div>
            </section>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white px-6 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Hoàn tất Đặt hàng'}
            </button>
          </form>
        </div>

        {/* Tóm tắt đơn hàng */}
        <div className="lg:w-1/3">
          <div className="sticky top-24 bg-gray-50 p-6 rounded-2xl">
            <h2 className="text-lg font-bold mb-4 uppercase">Đơn hàng của bạn</h2>
            
            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
              {cart.items.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-20 bg-white rounded overflow-hidden flex-shrink-0 border border-gray-200">
                    <img src={item.productImage || '/images/products/placeholder.webp'} alt={item.productName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-bold text-gray-900 line-clamp-2">{item.productName}</p>
                    <p className="text-gray-500 mt-1">{item.color} / {item.size}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-500">x{item.quantity}</span>
                      <span className="font-bold">{(item.salePrice || item.price).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>Miễn phí</span>
              </div>
              {voucherInfo ? (
                <div className="flex justify-between text-emerald-700">
                  <span>Giảm giá ({formData.voucherCode})</span>
                  <span>-{voucherInfo.discountAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              ) : null}
              <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-3">
                <span>Tổng cộng</span>
                <span>{(voucherInfo ? Math.max(0, voucherInfo.finalTotal) : subtotal).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Voucher */}
            <div className="mt-5 border-t border-gray-200 pt-5">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Mã giảm giá</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã voucher"
                  value={formData.voucherCode}
                  onChange={(e) => setFormData({ ...formData, voucherCode: e.target.value.toUpperCase() })}
                  onBlur={() => formData.voucherCode.trim() && !voucherInfo && applyVoucher()}
                  className="flex-1 px-3 h-10 border border-gray-300 rounded-md text-sm font-mono uppercase focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <button
                  type="button"
                  onClick={applyVoucher}
                  disabled={voucherLoading || !formData.voucherCode.trim()}
                  className="h-10 px-4 rounded-md bg-slate-900 text-white text-[13px] font-semibold hover:bg-black disabled:opacity-40"
                >
                  {voucherLoading ? 'Đang kiểm tra…' : 'Áp dụng'}
                </button>
              </div>
              {voucherInfo ? (
                <div className="mt-2 text-[12.5px] text-emerald-700">
                  ✓ Đã áp dụng <strong>{voucherInfo.name}</strong>, giảm {voucherInfo.discountAmount.toLocaleString('vi-VN')}đ
                  <button type="button" onClick={() => { setVoucherInfo(null); setFormData({ ...formData, voucherCode: '' }); }} className="ml-2 underline text-slate-500">
                    Bỏ
                  </button>
                </div>
              ) : voucherError ? (
                <div className="mt-2 text-[12.5px] text-red-600">{voucherError}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
