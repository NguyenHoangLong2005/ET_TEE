"use client";

import { useRouter, useSearchParams } from 'next/navigation';

export default function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'default';

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const val = e.target.value;
    if (val === 'default') {
      params.delete('sort');
    } else {
      params.set('sort', val);
    }
    // Reset to first page
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Sắp xếp theo:</span>
      <div className="relative">
        <select 
          value={currentSort}
          onChange={handleSortChange}
          className="appearance-none border-b border-gray-300 rounded-none py-1.5 pl-0 pr-6 text-sm font-bold focus:outline-none focus:border-slate-900 bg-transparent cursor-pointer"
        >
          <option value="default">Phù hợp nhất</option>
          <option value="newest">Mới nhất</option>
          <option value="price-asc">Giá: Thấp đến Cao</option>
          <option value="price-desc">Giá: Cao đến Thấp</option>
          <option value="discount-desc">Giảm giá nhiều nhất</option>
          <option value="bestseller">Bán chạy nhất</option>
        </select>
        {/* Custom arrow for select */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
