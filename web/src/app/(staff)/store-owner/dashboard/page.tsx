"use client";
import React from 'react';
import { BarChart, DollarSign, Package, ShoppingBag } from 'lucide-react';

export default function StoreDashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Cửa Hàng</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Doanh thu (Hôm nay)</p>
            <p className="text-2xl font-bold text-gray-400">0đ</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Đơn hàng mới</p>
            <p className="text-2xl font-bold text-gray-400">0</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Sản phẩm sắp hết</p>
            <p className="text-2xl font-bold text-gray-400">0</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <BarChart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tỷ lệ hủy đơn</p>
            <p className="text-2xl font-bold text-gray-400">0%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500 h-64 flex flex-col justify-center items-center">
        <BarChart className="w-12 h-12 text-gray-300 mb-3" />
        <p>Chưa có dữ liệu biểu đồ doanh thu.</p>
      </div>
    </div>
  );
}
