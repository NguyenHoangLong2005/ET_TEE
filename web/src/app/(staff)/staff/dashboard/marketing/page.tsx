"use client";
import React from 'react';
import { Megaphone, Users, MousePointerClick, Percent } from 'lucide-react';

export default function MarketingDashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Marketing</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Chiến dịch Active</p>
            <p className="text-2xl font-bold text-gray-400">0</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Lượt Click (CTR)</p>
            <p className="text-2xl font-bold text-gray-400">0%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Lượt Tiếp Cận</p>
            <p className="text-2xl font-bold text-gray-400">0</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Tỷ lệ Chuyển đổi (CR)</p>
            <p className="text-2xl font-bold text-gray-400">0%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
