"use client";
import React from 'react';
import { Package, Truck } from 'lucide-react';
import { useMockOrders } from '@/hooks/useMockOrders';

export default function ShippingShipmentsPage() {
  const { orders, updateOrderStatus } = useMockOrders();
  const shippingOrders = orders.filter(o => o.status === 'SHIPPING');

  const handleDeliver = (id: string) => {
    updateOrderStatus(id, 'DELIVERED');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vận Đơn Cần Giao</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Mã Vận Đơn</th>
              <th className="px-6 py-3">Khách Hàng</th>
              <th className="px-6 py-3">SĐT Liên Hệ</th>
              <th className="px-6 py-3">Tiền Thu Hộ (COD)</th>
              <th className="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shippingOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  Không có vận đơn nào cần giao.
                </td>
              </tr>
            ) : (
              shippingOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 text-gray-700">{order.customerName}</td>
                  <td className="px-6 py-4 text-gray-700">{order.customerPhone}</td>
                  <td className="px-6 py-4 font-semibold text-red-600">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeliver(order.id)}
                      className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium rounded-lg transition text-xs flex items-center gap-2 ml-auto"
                    >
                      <Truck className="w-4 h-4" /> Đã Giao Thành Công
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}