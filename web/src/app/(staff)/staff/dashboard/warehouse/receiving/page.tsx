"use client";
import React from 'react';
import { Package, Plus } from 'lucide-react';
import { useMockProducts } from '@/hooks/useMockProducts';

export default function WarehouseReceivingPage() {
  const { products, updateProductStock } = useMockProducts();

  const handleReceive = (id: string) => {
    const qtyStr = window.prompt("Nhập số lượng nhập kho mới:");
    if (!qtyStr) return;
    const qty = parseInt(qtyStr, 10);
    if (!isNaN(qty) && qty > 0) {
      updateProductStock(id, qty);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Phiếu Nhập Hàng</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Mã SKU</th>
              <th className="px-6 py-3">Sản Phẩm</th>
              <th className="px-6 py-3">Tồn Kho Tối Thiểu</th>
              <th className="px-6 py-3">Tồn Kho Hiện Tại</th>
              <th className="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  Chưa có dữ liệu sản phẩm để nhập kho.
                </td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{product.sku}</td>
                  <td className="px-6 py-4 text-gray-700">{product.name}</td>
                  <td className="px-6 py-4 text-gray-500">20</td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${product.stock < 20 ? 'text-red-600' : 'text-green-600'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleReceive(product.id)}
                      className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-medium rounded-lg transition text-xs flex items-center gap-2 ml-auto"
                    >
                      <Plus className="w-4 h-4" /> Tạo Phiếu Nhập
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