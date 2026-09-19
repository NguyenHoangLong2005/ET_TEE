"use client";
import React from 'react';
import { FileText } from 'lucide-react';

export default function ShippingCodPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản Lý & Đối Soát COD</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500 h-64 flex flex-col justify-center items-center">
        <FileText className="w-12 h-12 text-gray-300 mb-3" />
        <p>Chưa có dữ liệu đối soát COD.</p>
      </div>
    </div>
  );
}