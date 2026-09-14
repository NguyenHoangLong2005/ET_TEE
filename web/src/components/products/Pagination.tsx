"use client";

import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    // Giữ lại các bộ lọc khác
    router.push(`/products?${params.toString()}`);
  };

  const renderPages = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`w-10 h-10 flex items-center justify-center text-sm font-bold transition-colors ${
              currentPage === i ? 'bg-[#18181B] text-white' : 'hover:bg-gray-100'
            }`}
          >
            {i}
          </button>
        );
      }
    } else {
      // Always show first page
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className={`w-10 h-10 flex items-center justify-center text-sm font-bold transition-colors ${
            currentPage === 1 ? 'bg-[#18181B] text-white' : 'hover:bg-gray-100'
          }`}
        >
          1
        </button>
      );

      // Show ellipses or middle pages
      if (currentPage > 3) {
        pages.push(<span key="ellipsis-1" className="w-10 h-10 flex items-center justify-center text-gray-400">...</span>);
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`w-10 h-10 flex items-center justify-center text-sm font-bold transition-colors ${
              currentPage === i ? 'bg-[#18181B] text-white' : 'hover:bg-gray-100'
            }`}
          >
            {i}
          </button>
        );
      }

      if (currentPage < totalPages - 2) {
        pages.push(<span key="ellipsis-2" className="w-10 h-10 flex items-center justify-center text-gray-400">...</span>);
      }

      // Always show last page
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`w-10 h-10 flex items-center justify-center text-sm font-bold transition-colors ${
            currentPage === totalPages ? 'bg-[#18181B] text-white' : 'hover:bg-gray-100'
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-12 border-t border-gray-200 pt-8">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 h-10 flex items-center justify-center text-sm font-bold hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors uppercase"
      >
        Trang trước
      </button>
      
      <div className="hidden sm:flex items-center gap-1">
        {renderPages()}
      </div>
      
      {/* Mobile concise indicator */}
      <div className="sm:hidden flex items-center justify-center px-4 font-bold text-sm">
        {currentPage} / {totalPages}
      </div>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 h-10 flex items-center justify-center text-sm font-bold hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors uppercase"
      >
        Trang sau
      </button>
    </div>
  );
}
