"use client";
import React from 'react';
import { FileText, CheckCircle } from 'lucide-react';
import { useMockOrders } from '@/hooks/useMockOrders';

export default function WarehousePickingPage() {
  const { orders, updateOrderStatus } = useMockOrders();
  const pickingOrders = orders.filter(o => o.status === 'CONFIRMED');

  const handlePick = (id: string) => {
    updateOrderStatus(id, 'PACKED'); // Skip PACKING state for simplicity, straight to PACKED
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Danh Sách Nhặt Hàng (Picking)</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Mã Đơn</th>
              <th className="px-6 py-3">Ngày Đặt</th>
              <th className="px-6 py-3">Trạng Thái Hiện Tại</th>
              <th className="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pickingOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  Không có yêu cầu nhặt hàng nào.
                </td>
              </tr>
            ) : (
              pickingOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 text-gray-700">{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Chờ nhặt hàng
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handlePick(order.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition text-xs flex items-center gap-2 ml-auto"
                    >
                      <CheckCircle className="w-4 h-4" /> Đã nhặt xong
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