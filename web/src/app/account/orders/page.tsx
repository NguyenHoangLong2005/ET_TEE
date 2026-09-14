'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Eye } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth';

export default function AccountOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=/account/orders');
      return;
    }
    
    const fetchOrders = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8081'}/api/orders/me`, {
          headers: headers as any
        });
        const json = await res.json();
        if (json.success) {
          setOrders(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch orders', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrders();
  }, [user, router]);

  if (isLoading) return <div className="p-8 text-center">Đang tải lịch sử đơn hàng...</div>;

  return (
    <div>
      <h1 className="text-3xl font-black uppercase mb-8">Lịch sử đơn hàng</h1>
      
      {orders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Bạn chưa có đơn hàng nào</h3>
          <p className="text-gray-500 mb-6">Hãy khám phá các sản phẩm mới nhất của ET.TEE nhé!</p>
          <Link href="/products" className="inline-block px-8 py-3 bg-black text-white font-bold uppercase rounded hover:bg-gray-800">
            Khám phá ngay
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-bold text-sm text-gray-700 uppercase">Mã đơn</th>
                  <th className="p-4 font-bold text-sm text-gray-700 uppercase">Ngày đặt</th>
                  <th className="p-4 font-bold text-sm text-gray-700 uppercase">Sản phẩm</th>
                  <th className="p-4 font-bold text-sm text-gray-700 uppercase">Tổng tiền</th>
                  <th className="p-4 font-bold text-sm text-gray-700 uppercase">Trạng thái</th>
                  <th className="p-4 font-bold text-sm text-gray-700 uppercase text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order.orderCode} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-black">{order.orderCode}</td>
                    <td className="p-4 text-gray-500 text-sm">Vừa xong</td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="space-y-4">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item: any, index: number) => (
                              <div key={index} className="flex items-center justify-between border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                                <div>
                                  <p className="font-medium text-black">{item.productName}</p>
                                  <p className="text-xs text-gray-500">Size: {item.size} | Màu: <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300 align-middle ml-1" style={{backgroundColor: item.color}}/></p>
                                </div>
                                
                                {/* Nút đánh giá cho đơn hàng đã DELIVERED hoặc COMPLETED */}
                                {(order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED') && (
                                  <div className="ml-4 flex-shrink-0">
                                    {item.reviewed ? (
                                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Đã đánh giá</span>
                                    ) : (
                                      <Link href={`/products/${item.productSlug}#reviews`} className="text-xs font-bold text-white bg-black hover:bg-gray-800 px-3 py-1.5 rounded transition-colors">
                                        Đánh giá
                                      </Link>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : 'Không có sản phẩm'}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-red-500 align-top">{order.totalAmount.toLocaleString('vi-VN')}đ</td>
                      <td className="p-4 align-top">
                        <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                          order.orderStatus === 'PENDING_CONFIRMATION' || order.orderStatus === 'PENDING_PAYMENT' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="p-4 text-center align-top">
                        <Link href={`/order-success/${order.orderCode}`} className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors" title="Xem chi tiết">
                          <Eye className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }
