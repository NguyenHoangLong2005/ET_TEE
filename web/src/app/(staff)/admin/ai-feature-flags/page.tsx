"use client";
import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Server } from 'lucide-react';

export default function AIFeatureFlagsPage() {
  const [model, setModel] = useState('v2.1-turbo');
  const [recommendationEnabled, setRecommendationEnabled] = useState(true);
  const [smartSearchEnabled, setSmartSearchEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('mock_ai_config');
    if (saved) {
      const data = JSON.parse(saved);
      setModel(data.model || 'v2.1-turbo');
      setRecommendationEnabled(data.recommendation !== false);
      setSmartSearchEnabled(data.smartSearch !== false);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('mock_ai_config', JSON.stringify({
      model,
      recommendation: recommendationEnabled,
      smartSearch: smartSearchEnabled
    }));
    alert("Đã lưu cấu hình AI!");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI & Feature Flags</h1>
        <button onClick={handleSave} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition flex items-center gap-2">
          <Save className="w-4 h-4" />
          <span>Lưu Cấu Hình AI</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gray-500" />
            Tính Năng AI Trên Storefront
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900">Mô hình gợi ý (Recommendation Engine)</p>
                <p className="text-xs text-gray-500 mt-1">Gợi ý sản phẩm dựa trên lịch sử xem/mua</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={recommendationEnabled} onChange={e => setRecommendationEnabled(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900">Tìm kiếm thông minh (Smart Search)</p>
                <p className="text-xs text-gray-500 mt-1">Tìm kiếm bằng hình ảnh và ngôn ngữ tự nhiên</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={smartSearchEnabled} onChange={e => setSmartSearchEnabled(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-500" />
            Cấu Hình Server AI
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phiên bản Model đang chạy</label>
              <select 
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-500"
                value={model}
                onChange={e => setModel(e.target.value)}
              >
                <option value="v2.0-stable">ET-TEE Vision v2.0 (Stable)</option>
                <option value="v2.1-turbo">ET-TEE Vision v2.1 Turbo (Fast)</option>
                <option value="v3.0-beta">ET-TEE NextGen v3.0 (Beta)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
