"use client";
import React from 'react';
import { Package, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useMockOrders } from '@/hooks/useMockOrders';

export default function SalesDashboardPage() {
  const { orders } = useMockOrders();
  const newOrders = orders.filter(o => o.status === 'NEW').length;
  
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Bán Hàng</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Đơn hàng mới chờ xử lý</p>
            <p className="text-2xl font-bold text-gray-900">{newOrders}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Đã chốt (Hôm nay)</p>
            <p className="text-2xl font-bold text-gray-400">0</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Thời gian xử lý TB</p>
            <p className="text-2xl font-bold text-gray-400">0 phút</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Đơn sắp quá hạn SLA</p>
            <p className="text-2xl font-bold text-gray-400">0</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500 h-64 flex flex-col justify-center items-center">
        <TrendingUp className="w-12 h-12 text-gray-300 mb-3" />
        <p>Chưa có dữ liệu biểu đồ hiệu suất sales.</p>
      </div>
    </div>
  );
}