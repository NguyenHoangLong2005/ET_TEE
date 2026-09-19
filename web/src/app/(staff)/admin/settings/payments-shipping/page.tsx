"use client";
import React, { useState, useEffect } from 'react';
import { CreditCard, Truck, Save } from 'lucide-react';

export default function AdminSettingsPage() {
  const [momoEnabled, setMomoEnabled] = useState(true);
  const [codEnabled, setCodEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('mock_settings');
    if (saved) {
      const data = JSON.parse(saved);
      setMomoEnabled(data.momo);
      setCodEnabled(data.cod);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('mock_settings', JSON.stringify({ momo: momoEnabled, cod: codEnabled }));
    alert("Đã lưu cấu hình thanh toán!");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cấu Hình Thanh Toán & Vận Chuyển</h1>
        <button onClick={handleSave} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2">
          <Save className="w-4 h-4" />
          <span>Lưu Cấu Hình</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-500" />
            Phương Thức Thanh Toán
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900">Thanh toán MoMo (Mã QR)</p>
                <p className="text-xs text-gray-500 mt-1">Hỗ trợ quét mã QR qua ứng dụng MoMo</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={momoEnabled} onChange={(e) => setMomoEnabled(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900">Thanh toán khi nhận hàng (COD)</p>
                <p className="text-xs text-gray-500 mt-1">Áp dụng cho đơn hàng dưới 5.000.000đ</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
