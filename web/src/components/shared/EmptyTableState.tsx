"use client";
import React from 'react';
import { SearchX, FileQuestion, type LucideIcon } from 'lucide-react';

interface EmptyTableStateProps {
  colSpan: number;
  message?: string;
  icon?: LucideIcon;
}

export default function EmptyTableState({ 
  colSpan, 
  message = "Không tìm thấy dữ liệu phù hợp.", 
  icon: Icon = SearchX 
}: EmptyTableStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-gray-500">
        <Icon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        {message}
      </td>
    </tr>
  );
}
