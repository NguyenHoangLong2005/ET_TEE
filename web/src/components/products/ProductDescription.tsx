'use client';

import { useState } from 'react';
import { Product } from '@/lib/services/productService';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Only facts stored on the product are shown here; the old hard-coded fit/fabric/origin
// claims were the same for every item (a dress, a perfume) and were wrong for most of them.
const TYPE_LABEL: Record<string, string> = {
  tshirt: 'Áo thun', shirt: 'Áo sơ mi', polo: 'Áo polo', outerwear: 'Áo khoác', pants: 'Quần dài',
  shorts: 'Quần short', skirt: 'Chân váy', dress: 'Đầm', homewear: 'Đồ mặc nhà / đồ lót', accessories: 'Phụ kiện',
};
const GROUP_LABEL: Record<string, string> = {
  men: 'Nam', women: 'Nữ', kids: 'Trẻ em', family: 'Gia đình', accessories: 'Phụ kiện',
};

export default function ProductDescription({ product }: { product: Product }) {
  const [openSections, setOpenSections] = useState({
    specs: true,
    desc: true,
    care: false
  });

  const toggle = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const specs: [string, string][] = [
    ['Mã sản phẩm', product.slug.toUpperCase()],
    ['Thương hiệu', product.brand || ''],
    ['Loại sản phẩm', TYPE_LABEL[product.productType ?? ''] || product.category?.name || ''],
    ['Dành cho', GROUP_LABEL[product.targetGroup ?? ''] || ''],
    ['Chất liệu', product.material || 'Đang cập nhật'],
  ];
  const rows = specs.filter(([, value]) => value);

  return (
    <div className="mt-8 border-t border-slate-200">

      {/* 1. Specs Table */}
      <div className="border-b border-slate-200">
        <button
          onClick={() => toggle('specs')}
          className="w-full py-4 flex justify-between items-center text-left"
        >
          <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">Thông số sản phẩm</span>
          {openSections.specs ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
        {openSections.specs && (
          <div className="pb-4 text-xs">
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-gray-200 bg-white">
              {rows.map(([label, value], i) => (
                <div key={label} className={`flex py-2.5 px-3 ${i % 2 === 0 ? 'bg-slate-50' : ''}`}>
                  <span className="w-1/3 font-bold text-slate-500">{label}</span>
                  <span className="w-2/3 text-slate-900 break-words">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Detailed Description */}
      {product.description && (
        <div className="border-b border-slate-200">
          <button
            onClick={() => toggle('desc')}
            className="w-full py-4 flex justify-between items-center text-left"
          >
            <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">Mô tả sản phẩm</span>
            {openSections.desc ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {openSections.desc && (
            <div className="pb-4 text-slate-700 text-xs leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          )}
        </div>
      )}

      {/* 3. Care Guide (general advice, not product-specific) */}
      <div className="border-b border-slate-200">
        <button
          onClick={() => toggle('care')}
          className="w-full py-4 flex justify-between items-center text-left"
        >
          <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">Hướng dẫn giặt & bảo quản</span>
          {openSections.care ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>
        {openSections.care && (
          <div className="pb-4 text-slate-600 text-xs leading-relaxed space-y-2">
            <p className="text-[11px] text-slate-500">Khuyến nghị chung — ưu tiên hướng dẫn trên nhãn sản phẩm.</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                ✔️ Giặt ở nhiệt độ thường 30°C
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                ❌ Không dùng chất tẩy mạnh
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                ✔️ Lộn trái khi giặt và phơi
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                ✔️ Ủi ở nhiệt độ thấp
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
