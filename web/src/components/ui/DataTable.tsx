'use client';

import React, { ReactNode, useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SkeletonTableRow } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string;
}

export interface PaginationConfig {
  /** 0-based page index. The footer renders currentPage + 1; onPageChange also receives a 0-based index. */
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  rowKey: (row: T, index: number) => string | number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  filterSlot?: ReactNode;
  actionsSlot?: ReactNode;
  pagination?: PaginationConfig;
  className?: string;
  onRowClick?: (row: T) => void;
  /** table-layout: fixed. Columns take their `width`; the rest share the remaining space and long
   *  content must truncate itself, so the table always fits its container without a horizontal scrollbar. */
  fixedLayout?: boolean;
}

/**
 * Enterprise DataTable
 *
 * Design Rules:
 * - Table header: eyebrow-label style (11px, uppercase, tracking-wide, text-muted)
 * - Row height: ~42px (py-3 + content)
 * - Row hover: surface-page (#F8FAFC)
 * - Active sort indicator: primary color
 * - Pagination active: slate-900 (not primary — pagination is navigation, not brand action)
 * - No colored header backgrounds
 * - Border-bottom on header: border-slate-200
 * - Row dividers: border-slate-100 (subtle)
 * - Search input: enterprise focus state (primary border on focus)
 */
export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyMessage = 'Hiện chưa có bản ghi nào phù hợp với điều kiện lọc.',
  rowKey,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  filterSlot,
  actionsSlot,
  pagination,
  className = '',
  onRowClick,
  fixedLayout = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [data, sortKey, sortOrder]);

  const hasControls = Boolean(onSearchChange || filterSlot || actionsSlot);

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col ${className}`}
      style={{ boxShadow: 'var(--shadow-flat, 0 1px 2px rgba(15,23,42,0.04))' }}
    >
      {/* Toolbar */}
      {hasControls && (
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
          <div className="flex flex-1 items-center gap-3 flex-wrap">
            {onSearchChange && (
              <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none transition-all text-slate-800 placeholder:text-slate-400"
                  style={{
                    // Enterprise focus convention — primary border
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#E50027';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(229,0,39,0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            )}
            {filterSlot && <div className="flex items-center gap-2">{filterSlot}</div>}
          </div>
          {actionsSlot && (
            <div className="flex items-center gap-2 shrink-0">{actionsSlot}</div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto relative flex-1 min-h-[200px]">
        <table className={`w-full text-left text-xs border-collapse ${fixedLayout ? 'table-fixed' : ''}`}>
          <thead>
            <tr className="border-b border-slate-200" style={{ background: '#F8FAFC' }}>
              {columns.map((col) => {
                const alignCls =
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                    ? 'text-right'
                    : 'text-left';
                const isCurrentSort = sortKey === col.key;

                return (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-4 py-3 whitespace-nowrap select-none ${alignCls} ${
                      col.sortable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''
                    } ${col.headerClassName ?? ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase`}
                      style={{ letterSpacing: '0.06em' }}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span>
                          {isCurrentSort ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3 h-3" style={{ color: '#E50027' }} />
                            ) : (
                              <ArrowDown className="w-3 h-3" style={{ color: '#E50027' }} />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonTableRow columns={columns.length} rows={5} />
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <EmptyState title={emptyTitle} description={emptyMessage} />
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr
                  key={rowKey(row, idx) ?? idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '';
                  }}
                >
                  {columns.map((col) => {
                    const alignCls =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left';
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-slate-700 ${fixedLayout ? 'overflow-hidden' : ''} ${alignCls} ${col.className ?? ''}`}
                      >
                        {col.render
                          ? col.render(row, idx)
                          : String((row as any)[col.key] ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {pagination.totalItems !== undefined ? (
              <>
                Trang{' '}
                <strong className="text-slate-800">{pagination.currentPage + 1}</strong>{' '}
                /{' '}
                <strong className="text-slate-800">{pagination.totalPages}</strong>
                {' '}({pagination.totalItems} bản ghi)
              </>
            ) : (
              <>
                Trang{' '}
                <strong className="text-slate-800">{pagination.currentPage + 1}</strong>{' '}
                /{' '}
                <strong className="text-slate-800">{pagination.totalPages}</strong>
              </>
            )}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.currentPage <= 0 || loading}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>

            {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
              let startPage = Math.max(0, pagination.currentPage - 2);
              if (startPage + 5 > pagination.totalPages) {
                startPage = Math.max(0, pagination.totalPages - 5);
              }
              const pageNum = startPage + i;

              const isActive = pageNum === pagination.currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  disabled={loading}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages - 1 || loading}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Trang kế tiếp"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
