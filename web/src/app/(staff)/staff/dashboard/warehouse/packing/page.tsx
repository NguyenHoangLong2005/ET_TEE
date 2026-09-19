"use client";
import React from 'react';
import { Box, PackageCheck } from 'lucide-react';
import { useMockOrders } from '@/hooks/useMockOrders';

export default function WarehousePackingPage() {
  const { orders, updateOrderStatus } = useMockOrders();
  const packingOrders = orders.filter(o => o.status === 'PACKED'); // In our simplified flow, picking completes and it goes to 'PACKED', ready for shipping. Wait, packing should be before packed.

  // Let's assume PACKED means "finished picking, needs packing". And we change to "READY_TO_SHIP" or "SHIPPING"
  const handlePack = (id: string) => {
    updateOrderStatus(id, 'SHIPPING'); // Ready to be shipped
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Danh Sách Đóng Gói (Packing)</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Mã Đơn</th>
              <th className="px-6 py-3">Ngày Đặt</th>
              <th className="px-6 py-3">Trạng Thái</th>
              <th className="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {packingOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <Box className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  Không có đơn hàng nào chờ đóng gói.
                </td>
              </tr>
            ) : (
              packingOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 text-gray-700">{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Chờ đóng gói
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handlePack(order.id)}
                      className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 font-medium rounded-lg transition text-xs flex items-center gap-2 ml-auto"
                    >
                      <PackageCheck className="w-4 h-4" /> Hoàn tất đóng gói
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
