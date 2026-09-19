"use client";
import React, { useState, useMemo } from 'react';
import { Edit, X } from 'lucide-react';
import { useMockProducts } from '@/hooks/useMockProducts';
import SearchInput from '@/components/shared/SearchInput';
import EmptyTableState from '@/components/shared/EmptyTableState';

export default function StoreProductsPage() {
  const { products, updateProductPrice } = useMockProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<{id: string, name: string, price: number} | null>(null);
  const [newPriceStr, setNewPriceStr] = useState('');
  
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      return product.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
             product.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [products, searchTerm]);

  const handleEditClick = (id: string, name: string, currentPrice: number) => {
    setEditingProduct({ id, name, price: currentPrice });
    setNewPriceStr(currentPrice.toString());
  };

  const handleSavePrice = () => {
    if (!editingProduct) return;
    const newPrice = parseInt(newPriceStr, 10);
    if (!isNaN(newPrice) && newPrice > 0) {
      updateProductPrice(editingProduct.id, newPrice);
      setEditingProduct(null);
    }
  };

  const isPriceValid = useMemo(() => {
    const num = parseInt(newPriceStr, 10);
    return !isNaN(num) && num > 0;
  }, [newPriceStr]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản Lý Sản Phẩm Tại Cửa Hàng</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Tìm kiếm sản phẩm..." />
        </div>
        
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Sản Phẩm</th>
              <th className="px-6 py-3">Mã (SKU)</th>
              <th className="px-6 py-3">Giá Bán</th>
              <th className="px-6 py-3">Tồn Kho (Local)</th>
              <th className="px-6 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.length === 0 ? (
              <EmptyTableState colSpan={5} message="Không tìm thấy sản phẩm." />
            ) : (
              filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 text-gray-500">{product.sku}</td>
                  <td className="px-6 py-4 font-semibold text-red-600">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${product.stock < 20 ? 'text-amber-600' : 'text-green-600'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEditClick(product.id, product.name, product.price)}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition flex items-center gap-1.5 ml-auto"
                    >
                      <Edit className="w-3 h-3" /> Cập nhật giá
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Cập Nhật Giá Khuyến Mãi</h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm</label>
                <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{editingProduct.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá mới (VNĐ)</label>
                <input 
                  type="number"
                  value={newPriceStr}
                  onChange={(e) => setNewPriceStr(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${isPriceValid ? 'border-gray-300 focus:ring-red-500/20' : 'border-red-300 focus:ring-red-500/20 bg-red-50 text-red-900'}`}
                  placeholder="Nhập số tiền..."
                />
                {!isPriceValid && <p className="text-red-600 text-xs mt-1">Giá tiền phải là số lớn hơn 0</p>}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button 
                onClick={handleSavePrice}
                disabled={!isPriceValid}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
