"use client";
import React from 'react';
import { Box, Package, ArrowDown, ArrowUp } from 'lucide-react';

export default function WarehouseDashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Kho</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tổng Tồn Kho</p>
            <p className="text-2xl font-bold text-gray-400">0</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <ArrowDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Cần Nhập Thêm</p>
            <p className="text-2xl font-bold text-gray-400">0 SKU</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Đang Lấy Hàng (Picking)</p>
            <p className="text-2xl font-bold text-gray-400">0 Đơn</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <ArrowUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Đã Đóng Gói (Packing)</p>
            <p className="text-2xl font-bold text-gray-400">0 Đơn</p>
          </div>
        </div>
      </div>
    </div>
  );
}