"use client";
import React from 'react';
import { Tag, Plus, Scissors } from 'lucide-react';
import { useMockMarketing } from '@/hooks/useMockMarketing';

export default function VouchersPage() {
  const { vouchers, addVoucher } = useMockMarketing();

  const handleAddVoucher = () => {
    const code = window.prompt("Nhập mã Voucher mới (VD: SALE50):");
    if (!code) return;
    const discount = window.prompt("Nhập phần trăm giảm giá (VD: 20):");
    const percent = parseInt(discount || '0', 10);
    if (code && !isNaN(percent)) {
      addVoucher({ code: code.toUpperCase(), discountPercent: percent, status: 'ACTIVE' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản Lý Khuyến Mãi (Voucher)</h1>
        <button 
          onClick={handleAddVoucher}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Voucher Mới</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Mã Voucher</th>
              <th className="px-6 py-3">Mức Giảm</th>
              <th className="px-6 py-3">Trạng Thái</th>
              <th className="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <Tag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  Chưa có mã khuyến mãi nào được tạo.
                </td>
              </tr>
            ) : (
              vouchers.map(voucher => (
                <tr key={voucher.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-gray-400" /> {voucher.code}
                  </td>
                  <td className="px-6 py-4 font-semibold text-red-600">
                    Giảm {voucher.discountPercent}%
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      Đang hiệu lực
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-xs text-red-600 hover:text-red-700 font-medium">Khóa mã</button>
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
