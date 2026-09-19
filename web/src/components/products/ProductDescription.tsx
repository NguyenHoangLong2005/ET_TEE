'use client';

import { useState } from 'react';
import { Product } from '@/lib/services/productService';
import { ChevronDown, ChevronUp, Sparkles, Check, ShieldCheck, Sun, Shirt } from 'lucide-react';

export default function ProductDescription({ product }: { product: Product }) {
  const [openSections, setOpenSections] = useState({
    specs: true,
    desc: true,
    material: true,
    care: false
  });

  const toggle = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="mt-8 border-t border-gray-200">
      
      {/* 1. Feature Badges Grid */}
      <div className="py-4 border-b border-gray-200 grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
          <Sparkles className="w-4 h-4 text-red-600 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">Phom dáng Slim Fit</span>
            <span className="text-gray-500 text-[10px]">Tôn dáng, tôn chiều cao</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">Co giãn 4 chiều</span>
            <span className="text-gray-500 text-[10px]">Thoải mái vận động cả ngày</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
          <Sun className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">Thấm hút thoáng khí</span>
            <span className="text-gray-500 text-[10px]">Khô thoáng, không đọng mồ hôi</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
          <Shirt className="w-4 h-4 text-purple-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">Chống nhăn tự nhiên</span>
            <span className="text-gray-500 text-[10px]">Tiết kiệm thời gian là/ủi</span>
          </div>
        </div>
      </div>

      {/* 2. Specs Table */}
      <div className="border-b border-gray-200">
        <button 
          onClick={() => toggle('specs')}
          className="w-full py-4 flex justify-between items-center text-left"
        >
          <span className="font-bold text-gray-900 uppercase text-xs tracking-wider">Thông số sản phẩm ET.TEE</span>
          {openSections.specs ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {openSections.specs && (
          <div className="pb-4 text-xs">
            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200 bg-white">
              <div className="flex py-2.5 px-3 bg-gray-50">
                <span className="w-1/3 font-bold text-gray-500">Mã sản phẩm</span>
                <span className="w-2/3 font-semibold text-slate-900 uppercase">{product.slug.toUpperCase()}</span>
              </div>
              <div className="flex py-2.5 px-3">
                <span className="w-1/3 font-bold text-gray-500">Chất liệu chính</span>
                <span className="w-2/3 text-slate-900">{product.material || '95% Premium Eco-Cotton, 5% Spandex'}</span>
              </div>
              <div className="flex py-2.5 px-3 bg-gray-50">
                <span className="w-1/3 font-bold text-gray-500">Kiểu dáng</span>
                <span className="w-2/3 text-slate-900">Slim Fit ôm nhẹ vừa vặn</span>
              </div>
              <div className="flex py-2.5 px-3">
                <span className="w-1/3 font-bold text-gray-500">Đặc tính</span>
                <span className="w-2/3 text-slate-900">Mềm mượt, co giãn linh hoạt, bền màu sau 100 lần giặt</span>
              </div>
              <div className="flex py-2.5 px-3 bg-gray-50">
                <span className="w-1/3 font-bold text-gray-500">Xuất xứ</span>
                <span className="w-2/3 text-slate-900">Sản xuất tại Việt Nam (ET.TEE Manufacturing)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Detailed Description */}
      <div className="border-b border-gray-200">
        <button 
          onClick={() => toggle('desc')}
          className="w-full py-4 flex justify-between items-center text-left"
        >
          <span className="font-bold text-gray-900 uppercase text-xs tracking-wider">Chi tiết nổi bật</span>
          {openSections.desc ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {openSections.desc && (
          <div className="pb-4 text-slate-700 text-xs leading-relaxed space-y-2">
            <p>{product.description}</p>
            <ul className="space-y-1.5 pt-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Thiết kế tối giản dễ phối đồ đi làm, đi chơi hay dự tiệc sang trọng.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Đường may chắc chắn, tỉ mỉ theo tiêu chuẩn xuất khẩu Nhật Bản.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Chất vải thân thiện với làn da nhạy cảm, không kích ứng.</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 4. Care Guide */}
      <div className="border-b border-gray-200">
        <button 
          onClick={() => toggle('care')}
          className="w-full py-4 flex justify-between items-center text-left"
        >
          <span className="font-bold text-gray-900 uppercase text-xs tracking-wider">Hướng dẫn giặt & bảo quản</span>
          {openSections.care ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {openSections.care && (
          <div className="pb-4 text-slate-600 text-xs leading-relaxed space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                ✔️ Giặt máy ở nhiệt độ thường 30°C
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                ❌ Không dùng chất tẩy clor mạnh
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                ✔️ Sấy khô ở nhiệt độ thấp
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                ✔️ Ủi/Là ở nhiệt độ tối đa 110°C
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
