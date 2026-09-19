"use client";
import React from 'react';
import { Users, Activity, HardDrive, Cpu, AlertTriangle } from 'lucide-react';
import { useMockUsers } from '@/hooks/useMockUsers';

export default function AdminDashboardPage() {
  const { users } = useMockUsers();
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tổng Quan Hệ Thống</h1>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition">
          Tạo Báo Cáo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tổng Users</p>
            <p className="text-2xl font-bold text-gray-900">{users.length > 0 ? users.length : 0}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Lượt truy cập 24h</p>
            <p className="text-2xl font-bold text-gray-300">0</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tải CPU / AI Model</p>
            <p className="text-2xl font-bold text-gray-300">0%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Dung lượng Data</p>
            <p className="text-2xl font-bold text-gray-300">0 GB</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tải Hệ Thống (7 Ngày Qua)</h2>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-200">
            <span className="text-gray-400">Chưa có dữ liệu</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cảnh Báo & Sự Cố</h2>
          <div className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <span className="text-sm">Không có sự cố nào ghi nhận.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
