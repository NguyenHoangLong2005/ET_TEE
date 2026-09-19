"use client";
import React from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { useMockMarketing } from '@/hooks/useMockMarketing';

export default function BannersPage() {
  const { banners, addBanner } = useMockMarketing();

  const handleAddBanner = () => {
    const title = window.prompt("Nhập tiêu đề banner mới:");
    if (title) {
      addBanner({ title, imageUrl: 'https://via.placeholder.com/800x400?text=' + encodeURIComponent(title), status: 'ACTIVE' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản Lý Banner</h1>
        <button 
          onClick={handleAddBanner}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Banner Mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.length === 0 ? (
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500 flex flex-col justify-center items-center py-12">
            <Megaphone className="w-12 h-12 text-gray-300 mb-3" />
            <p>Chưa có banner nào được khởi tạo.</p>
          </div>
        ) : (
          banners.map(banner => (
            <div key={banner.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <img src={banner.imageUrl} alt={banner.title} className="w-full h-48 object-cover bg-gray-100" />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{banner.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">Trạng thái: <span className="text-green-600 font-medium">Đang chạy</span></p>
                </div>
                <button className="text-sm text-red-600 hover:text-red-700 font-medium">Tạm dừng</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
