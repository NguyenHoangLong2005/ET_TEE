'use client';

import { useState } from 'react';
import { Product } from '@/lib/services/productService';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ProductDescription({ product }: { product: Product }) {
  const [openSections, setOpenSections] = useState({
    desc: true,
    material: false,
    care: false
  });

  const toggle = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="mt-8 border-t border-gray-200">
      {/* Description */}
      <div className="border-b border-gray-200">
        <button 
          onClick={() => toggle('desc')}
          className="w-full py-4 flex justify-between items-center text-left"
        >
          <span className="font-bold text-gray-900 uppercase text-sm">Mô tả sản phẩm</span>
          {openSections.desc ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {openSections.desc && (
          <div className="pb-4 text-gray-700 text-sm leading-relaxed">
            {product.description}
          </div>
        )}
      </div>

      {/* Material */}
      <div className="border-b border-gray-200">
        <button 
          onClick={() => toggle('material')}
          className="w-full py-4 flex justify-between items-center text-left"
        >
          <span className="font-bold text-gray-900 uppercase text-sm">Chất liệu</span>
          {openSections.material ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {openSections.material && (
          <div className="pb-4 text-gray-700 text-sm leading-relaxed">
            {product.material}
          </div>
        )}
      </div>

      {/* Care */}
      <div className="border-b border-gray-200">
        <button 
          onClick={() => toggle('care')}
          className="w-full py-4 flex justify-between items-center text-left"
        >
          <span className="font-bold text-gray-900 uppercase text-sm">Hướng dẫn bảo quản</span>
          {openSections.care ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {openSections.care && (
          <div className="pb-4 text-gray-700 text-sm leading-relaxed">
            - Giặt máy ở nhiệt độ thường, cùng màu sắc.<br />
            - Không dùng hóa chất tẩy.<br />
            - Sấy ở nhiệt độ thấp hoặc phơi trong bóng râm.<br />
            - Ủi ở nhiệt độ trung bình.
          </div>
        )}
      </div>
    </div>
  );
}
