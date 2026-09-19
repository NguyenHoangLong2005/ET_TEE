"use client";
import React from 'react';
import { Network, Plus, Trash2 } from 'lucide-react';
import { useMockCategories } from '@/hooks/useMockCategories';

export default function AdminCategoriesPage() {
  const { categories, addCategory } = useMockCategories();

  const handleAdd = () => {
    const name = window.prompt("Nhập tên danh mục (VD: Áo Thun):");
    if (!name) return;
    const slug = window.prompt("Nhập đường dẫn (VD: ao-thun):");
    if (slug) {
      addCategory(name, slug);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản Lý Danh Mục</h1>
        <button onClick={handleAdd} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Thêm Danh Mục Mới</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Mã Danh Mục</th>
              <th className="px-6 py-3">Tên Danh Mục</th>
              <th className="px-6 py-3">Đường Dẫn (Slug)</th>
              <th className="px-6 py-3">Trạng Thái</th>
              <th className="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Network className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  Chưa có danh mục nào.
                </td>
              </tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">{cat.id}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-500">/{cat.slug}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      Hiển thị
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition" title="Xóa">
                      <Trash2 className="w-4 h-4" />
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
