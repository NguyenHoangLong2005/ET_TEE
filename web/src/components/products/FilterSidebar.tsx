"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FilterSidebarProps {
  stats: {
    targetGroup: Record<string, number>;
    productType: Record<string, number>;
    sizes: { adult: string[]; kids: string[] };
  };
}

const PRICE_RANGES = [
  { label: 'Dưới 200.000đ', min: undefined, max: 200000 },
  { label: '200.000đ - 500.000đ', min: 200000, max: 500000 },
  { label: '500.000đ - 1.000.000đ', min: 500000, max: 1000000 },
  { label: 'Trên 1.000.000đ', min: 1000000, max: undefined },
];

const getProductTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    'tshirt': 'Áo thun',
    't-shirt': 'Áo thun',
    'áo thun': 'Áo thun',
    'shirt': 'Áo sơ mi',
    'polo': 'Áo polo',
    'pants': 'Quần',
    'trousers': 'Quần',
    'jeans': 'Quần jeans',
    'shorts': 'Quần short',
    'jacket': 'Áo khoác',
    'coat': 'Áo khoác',
    'dress': 'Váy',
    'skirt': 'Chân váy',
    'accessory': 'Phụ kiện',
    'accessories': 'Phụ kiện',
    'homewear': 'Đồ mặc nhà',
    'set': 'Set đồ',
    'family-set': 'Set gia đình',
  };
  return map[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
};

export default function FilterSidebar({ stats }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Expanded states
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    mobileOpen: false,
    targetGroup: true,
    productType: true,
    size: true,
    color: true,
    price: true,
    status: true,
  });

  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [priceError, setPriceError] = useState('');

  const currentMinPrice = searchParams.get('minPrice');
  const currentMaxPrice = searchParams.get('maxPrice');

  useEffect(() => {
    // Sync input state with URL if custom price is used
    if (currentMinPrice || currentMaxPrice) {
      // Check if it matches a preset. If not, it's custom.
      const isPreset = PRICE_RANGES.some(r => 
        (r.min === undefined ? !currentMinPrice : r.min.toString() === currentMinPrice) &&
        (r.max === undefined ? !currentMaxPrice : r.max.toString() === currentMaxPrice)
      );
      if (!isPreset) {
        setMinPriceInput(currentMinPrice || '');
        setMaxPriceInput(currentMaxPrice || '');
      } else {
        setMinPriceInput('');
        setMaxPriceInput('');
      }
    } else {
      setMinPriceInput('');
      setMaxPriceInput('');
    }
  }, [currentMinPrice, currentMaxPrice]);

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
      if (key === 'targetGroup') {
        params.delete('adultSize');
        params.delete('kidsSize');
        params.delete('accessorySize');
      }
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const applyCustomPrice = () => {
    const min = minPriceInput ? parseInt(minPriceInput, 10) : undefined;
    const max = maxPriceInput ? parseInt(maxPriceInput, 10) : undefined;
    
    if (min !== undefined && isNaN(min)) return setPriceError('Giá từ không hợp lệ');
    if (max !== undefined && isNaN(max)) return setPriceError('Giá đến không hợp lệ');
    if (min !== undefined && min < 0) return setPriceError('Giá không được âm');
    if (max !== undefined && max < 0) return setPriceError('Giá không được âm');
    if (min !== undefined && max !== undefined && min > max) return setPriceError('Giá Từ không được lớn hơn Đến');
    
    setPriceError('');
    const params = new URLSearchParams(searchParams.toString());
    if (min !== undefined) params.set('minPrice', min.toString()); else params.delete('minPrice');
    if (max !== undefined) params.set('maxPrice', max.toString()); else params.delete('maxPrice');
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const clearCustomPrice = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setPriceError('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const currentTarget = searchParams.get('targetGroup');
  const currentCategory = searchParams.get('productType');
  const currentAdultSize = searchParams.get('adultSize');
  const currentKidsSize = searchParams.get('kidsSize');
  const currentAccessorySize = searchParams.get('accessorySize');
  const currentStatus = searchParams.get('status');

  const getPriceRangeId = () => {
    const idx = PRICE_RANGES.findIndex(r => 
      (r.min === undefined ? !currentMinPrice : r.min?.toString() === currentMinPrice) &&
      (r.max === undefined ? !currentMaxPrice : r.max?.toString() === currentMaxPrice)
    );
    return idx;
  };

  const currentPriceIdx = getPriceRangeId();

  const targetGroups = [
    { id: 'men', label: 'Nam', count: stats.targetGroup.men ?? 0 },
    { id: 'women', label: 'Nữ', count: stats.targetGroup.women ?? 0 },
    { id: 'boys', label: 'Bé trai', count: stats.targetGroup.boys ?? 0 },
    { id: 'girls', label: 'Bé gái', count: stats.targetGroup.girls ?? 0 },
    { id: 'family', label: 'Gia đình', count: stats.targetGroup.family ?? 0 },
    { id: 'baby', label: 'Em bé', count: stats.targetGroup.baby ?? 0 }
  ].filter(item => item.count > 0);

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden w-full flex items-center justify-between mb-4 border-b border-gray-200 pb-4">
        <button 
          onClick={() => setExpanded(prev => ({ ...prev, mobileOpen: !prev.mobileOpen }))}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-900 text-sm font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <span>Bộ Lọc</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded.mobileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className={`w-full text-slate-900 ${expanded.mobileOpen ? 'block' : 'hidden'} lg:block`}>
        
        {/* 1. Danh mục */}
        {targetGroups.length > 0 && (
          <div className="border-b border-gray-200 py-4">
            <button 
              onClick={() => toggleSection('targetGroup')}
              className="flex items-center justify-between w-full font-bold text-[14px] tracking-wide mb-2"
            >
              <span>Danh mục</span>
              {expanded.targetGroup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expanded.targetGroup && (
              <div className="space-y-2 mt-3">
                {targetGroups.map(item => (
                  <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="targetGroup"
                      checked={currentTarget === item.id}
                      onChange={() => updateFilter('targetGroup', currentTarget === item.id ? undefined : item.id)}
                      className="w-4 h-4 accent-[#e50027] cursor-pointer"
                    />
                    <span className={`text-[14px] group-hover:text-[#e50027] transition-colors ${currentTarget === item.id ? 'font-bold' : ''}`}>
                      {item.label} <span className="text-gray-400 font-normal">({item.count})</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Loại sản phẩm */}
        <div className="border-b border-gray-200 py-4">
          <button 
            onClick={() => toggleSection('productType')}
            className="flex items-center justify-between w-full font-bold text-[14px] tracking-wide mb-2"
          >
            <span>Loại sản phẩm</span>
            {expanded.productType ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded.productType && (
            <div className="space-y-2 mt-3 max-h-60 overflow-y-auto custom-scrollbar">
              {Object.entries(stats.productType).map(([key, count]) => {
                return (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="productType"
                      checked={currentCategory === key}
                      onChange={() => updateFilter('productType', currentCategory === key ? undefined : key)}
                      className="w-4 h-4 accent-[#e50027] cursor-pointer"
                    />
                    <span className={`text-[14px] group-hover:text-[#e50027] transition-colors ${currentCategory === key ? 'font-bold' : ''}`}>
                      {getProductTypeLabel(key)} <span className="text-gray-400 font-normal">({count})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Kích cỡ */}
        <div className="border-b border-gray-200 py-4">
          <button 
            onClick={() => toggleSection('size')}
            className="flex items-center justify-between w-full font-bold text-[14px] tracking-wide mb-2"
          >
            <span>Kích cỡ</span>
            {expanded.size ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded.size && (
            <div className="mt-4 space-y-5">
              {/* Adult sizes */}
              {(!currentTarget || currentTarget === 'women' || currentTarget === 'men') && stats.sizes.adult && stats.sizes.adult.length > 0 && (
                <div>
                  <span className="text-[13px] text-gray-800 font-bold block mb-2">Người lớn</span>
                  <div className="grid grid-cols-3 gap-2">
                    {stats.sizes.adult.map(size => (
                      <button
                        key={size}
                        onClick={() => updateFilter('adultSize', currentAdultSize === size ? undefined : size)}
                        className={`min-h-[40px] border rounded flex items-center justify-center text-[13px] md:text-[14px] font-bold transition-colors ${currentAdultSize === size ? 'border-[#18181B] bg-[#18181B] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Kids sizes */}
              {(!currentTarget || currentTarget === 'boys' || currentTarget === 'girls') && stats.sizes.kids && stats.sizes.kids.length > 0 && (
                <div>
                  <span className="text-[13px] text-gray-800 font-bold block mb-2">Trẻ em</span>
                  <div className="grid grid-cols-4 gap-[6px]">
                    {stats.sizes.kids
                      .filter(size => /^\d+$/.test(size)) // Only keep numeric sizes to hide "viết thường" if any
                      .map(size => (
                      <button
                        key={size}
                        onClick={() => updateFilter('kidsSize', currentKidsSize === size ? undefined : size)}
                        className={`min-h-[36px] border rounded flex items-center justify-center text-[12px] md:text-[13px] font-bold transition-colors ${currentKidsSize === size ? 'border-[#18181B] bg-[#18181B] text-white' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Màu sắc (Placeholder for Future Implementation if data supports it) */}
        {/* Skipping strict implementation unless stats provides colors, but can add basic colors */}

        {/* 5. Khoảng giá */}
        <div className="border-b border-gray-200 py-4">
          <button 
            onClick={() => toggleSection('price')}
            className="flex items-center justify-between w-full font-bold text-[14px] tracking-wide mb-2"
          >
            <span>Khoảng giá</span>
            {expanded.price ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded.price && (
            <div className="space-y-4 mt-3">
              <div className="space-y-2">
                {PRICE_RANGES.map((range, idx) => (
                  <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="priceRange"
                      checked={currentPriceIdx === idx}
                      onChange={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        if (currentPriceIdx === idx) {
                          params.delete('minPrice');
                          params.delete('maxPrice');
                        } else {
                          if (range.min !== undefined) params.set('minPrice', range.min.toString()); else params.delete('minPrice');
                          if (range.max !== undefined) params.set('maxPrice', range.max.toString()); else params.delete('maxPrice');
                        }
                        params.delete('page');
                        router.push(`/products?${params.toString()}`);
                      }}
                      className="w-4 h-4 accent-[#e50027] cursor-pointer"
                    />
                    <span className={`text-[14px] group-hover:text-[#e50027] transition-colors ${currentPriceIdx === idx ? 'font-bold' : ''}`}>
                      {range.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Custom price */}
              <div className="pt-3 border-t border-gray-100">
                <span className="text-[12px] text-gray-500 uppercase font-bold block mb-2">Tự nhập khoảng giá</span>
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="number" 
                    placeholder="Từ (đ)" 
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-slate-900"
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                    type="number" 
                    placeholder="Đến (đ)" 
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-slate-900"
                  />
                </div>
                {priceError && <p className="text-[#e50027] text-[11px] mb-2">{priceError}</p>}
                
                <div className="flex gap-2">
                  <button 
                    onClick={applyCustomPrice}
                    className="flex-1 bg-slate-900 text-white text-[12px] font-bold py-1.5 rounded hover:bg-slate-800 transition-colors"
                  >
                    Áp dụng
                  </button>
                  <button 
                    onClick={clearCustomPrice}
                    className="flex-1 bg-gray-100 text-slate-900 text-[12px] font-bold py-1.5 rounded hover:bg-gray-200 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. Trạng thái sản phẩm */}
        <div className="border-b border-gray-200 py-4">
          <button 
            onClick={() => toggleSection('status')}
            className="flex items-center justify-between w-full font-bold text-[14px] tracking-wide mb-2"
          >
            <span>Trạng thái</span>
            {expanded.status ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded.status && (
            <div className="space-y-2 mt-3">
              {[
                { id: 'sale', label: 'Đang giảm giá' },
                { id: 'new', label: 'Hàng mới' },
                { id: 'best', label: 'Bán chạy' }
              ].map(item => (
                <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="productStatus"
                    checked={currentStatus === item.id}
                    onChange={() => updateFilter('status', currentStatus === item.id ? undefined : item.id)}
                    className="w-4 h-4 accent-[#e50027] cursor-pointer"
                  />
                  <span className={`text-[14px] group-hover:text-[#e50027] transition-colors ${currentStatus === item.id ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
