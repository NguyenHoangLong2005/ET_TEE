'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getAuthHeaders, getGuestCartToken } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/api-config';


export default function OrderSuccessPage() {
  const { orderCode } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [order, setOrder] = useState<any>(null);
  const [bankConfig, setBankConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    
    const fetchOrderAndConfig = async () => {
      try {
        const headers = getAuthHeaders(true) as Record<string, string>;
        // Also try guest token for public order access
        const guestToken = getGuestCartToken();
        if (guestToken && !headers['Authorization']) {
          headers['X-Guest-Cart-Token'] = guestToken;
        }
        const orderRes = await fetch(`${getApiBaseUrl()}/api/orders/${orderCode}`, {
          headers
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

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mr-3"></div>
        <span className="text-slate-600 font-medium">Đang tải thông tin đơn hàng...</span>
      </div>
    );
  }

  const totalAmount = Number(order?.totalAmount ?? order?.finalTotal ?? order?.total ?? 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 text-center mb-8">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-black uppercase mb-4 text-slate-900">Đặt hàng thành công!</h1>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto">
          Cảm ơn bạn đã mua sắm tại ET.TEE Shop. Mã đơn hàng của bạn là <span className="font-bold text-black">{orderCode}</span>.
        </p>
        
        {order?.paymentMethod === 'BANK_TRANSFER' && bankConfig ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left mb-8 max-w-2xl mx-auto">
            <h3 className="font-bold text-lg mb-4 flex items-center"><Clock className="w-5 h-5 mr-2 text-blue-500" /> Vui lòng chuyển khoản để hoàn tất</h3>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Ngân hàng</p>
                  <p className="font-bold text-lg">{bankConfig.bankName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Số tài khoản</p>
                  <p className="font-bold text-2xl text-blue-600 tracking-wider">{bankConfig.accountNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Chủ tài khoản</p>
                  <p className="font-bold">{bankConfig.accountName}</p>
                </div>
                <div className="bg-white p-3 border border-slate-200 rounded text-center">
                  <p className="text-sm text-slate-500 mb-1">Số tiền</p>
                  <p className="font-bold text-xl text-red-500">{totalAmount.toLocaleString('vi-VN')}đ</p>
                </div>
                <div className="bg-blue-50 p-4 border border-blue-100 rounded text-center">
                  <p className="text-sm text-blue-800 mb-1">Nội dung chuyển khoản</p>
                  <p className="font-black text-xl text-blue-900 tracking-widest">
                    ETTEE {orderCode} {order.customerPhone || ''}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center justify-center">
                <div className="w-48 h-48 bg-white border border-slate-200 p-2 rounded-xl mb-3 flex items-center justify-center">
                  {bankConfig?.qrUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                      src={`${bankConfig.qrUrl}?acc=${encodeURIComponent(bankConfig.accountNumber || '')}&bank=${encodeURIComponent(bankConfig.bankName || '')}&amount=${totalAmount}&des=${encodeURIComponent(`ETTEE ${orderCode} ${order.customerPhone || ''}`)}`} 
                      alt="QR Code Chuyển Khoản" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-xs text-slate-400">Quét mã QR qua ứng dụng ngân hàng</div>
                  )}
                </div>
                <p className="text-sm text-slate-500">Quét mã QR qua ứng dụng ngân hàng</p>
              </div>
            </div>
          </div>
        ) : order ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 max-w-lg mx-auto">
            <h3 className="font-bold text-lg mb-2">Phương thức thanh toán: Thanh toán khi nhận hàng (COD)</h3>
            <p className="text-slate-600">Bạn sẽ thanh toán số tiền <span className="font-bold text-black">{totalAmount.toLocaleString('vi-VN')}đ</span> khi nhận được hàng.</p>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/account/orders" className="px-8 py-3 bg-white border border-black text-black font-bold uppercase rounded-full hover:bg-slate-50 transition-colors text-xs tracking-wider">
            Xem đơn hàng
          </Link>
          <Link href="/products" className="px-8 py-3 bg-primary text-white font-bold uppercase rounded-full hover:bg-primary/90 transition-colors text-xs tracking-wider">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
}
