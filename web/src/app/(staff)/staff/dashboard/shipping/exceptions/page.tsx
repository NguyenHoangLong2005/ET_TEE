"use client";
import React from 'react';
import { Headset } from 'lucide-react';

export default function ShippingExceptionsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ngoại Lệ Giao Hàng</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500 h-64 flex flex-col justify-center items-center">
        <Headset className="w-12 h-12 text-gray-300 mb-3" />
        <p>Không có ngoại lệ giao hàng nào cần xử lý.</p>
      </div>
    </div>
  );
}
