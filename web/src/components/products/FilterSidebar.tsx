"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

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

// Known women-only or men-only product types for intelligent cross-category fallback
const WOMEN_ONLY_TYPES = new Set(['skirt', 'dress']);
const MEN_ONLY_TYPES = new Set<string>([]);

export default function FilterSidebar({ stats }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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
    if (currentMinPrice || currentMaxPrice) {
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

  // Helper for parsing comma-separated param into a Set
  const getParamSet = (key: string): Set<string> => {
    const raw = searchParams.get(key) || '';
    if (!raw) return new Set();
    return new Set(raw.split(',').map(s => s.trim()).filter(Boolean));
  };

  const currentTargetSet = getParamSet('targetGroup');
  const currentProductTypeSet = getParamSet('productType');
  const currentAdultSizeSet = getParamSet('adultSize');
  const currentKidsSizeSet = getParamSet('kidsSize');
  const currentStatusSet = getParamSet('status');

  // Toggle multi-select checkbox for array parameters
  const toggleMultiFilter = (key: string, value: string) => {
    const currentSet = getParamSet(key);
    const nextSet = new Set(currentSet);

    if (nextSet.has(value)) {
      nextSet.delete(value);
    } else {
      nextSet.add(value);
    }

    const params = new URLSearchParams(searchParams.toString());

    // Smart UX: If user checks a productType like "Chân váy" or "Váy" while targetGroup="men",
    // remove restrictive targetGroup so products are displayed instead of 0 items!
    if (key === 'productType' && !currentSet.has(value)) {
      if (WOMEN_ONLY_TYPES.has(value.toLowerCase())) {
        // If current targetGroup is strictly men/boys, clear or update targetGroup
        if (currentTargetSet.has('men') && !currentTargetSet.has('women')) {
          params.delete('targetGroup');
        }
      }
    }

    if (nextSet.size > 0) {
      params.set(key, Array.from(nextSet).join(','));
    } else {
      params.delete(key);
    }

    // Reset page to 1
    params.delete('page');

    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
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
    if (max !== undefined && max !== null) params.set('maxPrice', max.toString()); else params.delete('maxPrice');
    params.delete('page');
    
    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  };

  const clearCustomPrice = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setPriceError('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('page');
    
    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  };

  const getPriceRangeId = () => {
    return PRICE_RANGES.findIndex(r => 
      (r.min === undefined ? !currentMinPrice : r.min?.toString() === currentMinPrice) &&
      (r.max === undefined ? !currentMaxPrice : r.max?.toString() === currentMaxPrice)
    );
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

  const hasActiveSidebarFilters = 
    currentTargetSet.size > 0 ||
    currentProductTypeSet.size > 0 ||
    currentAdultSizeSet.size > 0 ||
    currentKidsSizeSet.size > 0 ||
    currentStatusSet.size > 0 ||
    currentMinPrice ||
    currentMaxPrice;

  const resetAllSidebarFilters = () => {
    startTransition(() => {
      router.push('/products');
    });
  };

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden w-full flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
        <button 
          onClick={() => setExpanded(prev => ({ ...prev, mobileOpen: !prev.mobileOpen }))}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-900 text-sm font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <span>Bộ Lọc</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded.mobileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className={`w-full text-slate-900 transition-opacity duration-200 ${isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'} ${expanded.mobileOpen ? 'block' : 'hidden'} lg:block`}>
        
        {/* Reset All Filters Button */}
        {hasActiveSidebarFilters && (
          <div className="pb-3 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bộ lọc đang chọn</span>
            <button
              onClick={resetAllSidebarFilters}
              className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        )}

        {/* 1. Danh mục (Checkbox multi-select) */}
        {targetGroups.length > 0 && (
          <div className="border-b border-slate-200 py-4">
            <button 
              onClick={() => toggleSection('targetGroup')}
              className="flex items-center justify-between w-full font-bold text-[14px] tracking-wide mb-2"
            >
              <span>Danh mục</span>
              {expanded.targetGroup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expanded.targetGroup && (
              <div className="space-y-2.5 mt-3">
                {targetGroups.map(item => {
                  const isChecked = currentTargetSet.has(item.id);
                  return (
                    <label key={item.id} className="flex items-center gap-2.5 cursor-pointer group select-none">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleMultiFilter('targetGroup', item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer"
                      />
                      <span className={`text-[14px] group-hover:text-primary transition-colors ${isChecked ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                        {item.label} <span className="text-slate-400 font-normal">({item.count})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Loại sản phẩm (Checkbox multi-select) */}
        <div className="border-b border-slate-200 py-4">
          <button 
            onClick={() => toggleSection('productType')}
            className="flex items-center justify-between w-full font-bold text-[14px] tracking-wide mb-2"
          >
            <span>Loại sản phẩm</span>
            {expanded.productType ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded.productType && (
            <div className="space-y-2.5 mt-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {Object.entries(stats.productType).map(([key, count]) => {
                const isChecked = currentProductTypeSet.has(key);
                return (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer group select-none">
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleMultiFilter('productType', key)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer"
                    />
                    <span className={`text-[14px] group-hover:text-primary transition-colors ${isChecked ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {getProductTypeLabel(key)} <span className="text-slate-400 font-normal">({count})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Kích cỡ (Multi-select toggles) */}
        <div className="border-b border-slate-200 py-4">
          <button 
            onClick={() => toggleSection('size')}
            className="flex items-center justify-between w-full font-bold text-[14px] tracking-wide mb-2"
          >
            <span>Kích cỡ</span>
            {expanded.size ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded.size && (
            <div className="mt-3 space-y-5">
              {/* Adult sizes */}
              {stats.sizes.adult && stats.sizes.adult.length > 0 && (
                <div>
                  <span className="text-[12px] text-slate-500 uppercase font-bold block mb-2">Người lớn</span>
                  <div className="grid grid-cols-3 gap-2">
                    {stats.sizes.adult.map(size => {
                      const isChecked = currentAdultSizeSet.has(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleMultiFilter('adultSize', size)}
                          className={`min-h-[38px] border rounded text-[13px] font-bold transition-all ${
                            isChecked 
                              ? 'border-slate-900 bg-slate-900 text-white shadow-sm' 
                              : 'border-slate-200 text-slate-700 hover:border-slate-900 bg-white'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Kids sizes */}
              {stats.sizes.kids && stats.sizes.kids.length > 0 && (
                <div>
                  <span className="text-[12px] text-slate-500 uppercase font-bold block mb-2">Trẻ em</span>
                  <div className="grid grid-cols-4 gap-[6px]">
                    {stats.sizes.kids
                      .filter(size => /^\d+$/.test(size))
                      .map(size => {
                        const isChecked = currentKidsSizeSet.has(size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleMultiFilter('kidsSize', size)}
                            className={`min-h-[34px] border rounded text-[12px] font-bold transition-all ${
                              isChecked 
                                ? 'border-slate-900 bg-slate-900 text-white shadow-sm' 
                                : 'border-slate-200 text-slate-700 hover:border-slate-900 bg-white'
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Khoảng giá */}
        <div className="border-b border-slate-200 py-4">
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
                  <label key={idx} className="flex items-center gap-2.5 cursor-pointer group select-none">
                    <input 
                      type="checkbox" 
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
                        startTransition(() => {
                          router.push(`/products?${params.toString()}`);
                        });
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer"
                    />
                    <span className={`text-[14px] group-hover:text-primary transition-colors ${currentPriceIdx === idx ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {range.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Custom price */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[12px] text-slate-500 uppercase font-bold block mb-2">Tự nhập khoảng giá</span>
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="number" 
                    placeholder="Từ (đ)" 
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-slate-900"
                  />
                  <span className="text-slate-400">-</span>
                  <input 
                    type="number" 
                    placeholder="Đến (đ)" 
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-slate-900"
                  />
                </div>
                {priceError && <p className="text-primary text-[11px] mb-2 font-medium">{priceError}</p>}
                
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={applyCustomPrice}
                    className="flex-1 bg-slate-900 text-white text-[12px] font-bold py-1.5 rounded hover:bg-slate-800 transition-colors"
                  >
                    Áp dụng
                  </button>
                  <button 
                    type="button"
                    onClick={clearCustomPrice}
                    className="flex-1 bg-slate-100 text-slate-900 text-[12px] font-bold py-1.5 rounded hover:bg-slate-200 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Trạng thái sản phẩm (Checkbox multi-select) */}
        <div className="border-b border-slate-200 py-4">
          <button 
            onClick={() => toggleSection('status')}
            className="flex items-center justify-between w-full font-bold text-[14px] tracking-wide mb-2"
          >
            <span>Trạng thái sản phẩm</span>
            {expanded.status ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded.status && (
            <div className="space-y-2.5 mt-3">
              {[
                { id: 'sale', label: 'Đang giảm giá' },
                { id: 'new', label: 'Hàng mới' },
                { id: 'best', label: 'Bán chạy' }
              ].map(item => {
                const isChecked = currentStatusSet.has(item.id);
                return (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer group select-none">
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleMultiFilter('status', item.id)}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer"
                    />
                    <span className={`text-[14px] group-hover:text-primary transition-colors ${isChecked ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {item.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </>
  );
}

