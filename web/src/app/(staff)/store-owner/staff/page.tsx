"use client";
import React, { useState, useMemo } from 'react';
import { Shield } from 'lucide-react';
import { useMockUsers } from '@/hooks/useMockUsers';
import SearchInput from '@/components/shared/SearchInput';
import EmptyTableState from '@/components/shared/EmptyTableState';

export default function StoreStaffPage() {
  const { users } = useMockUsers();
  const staffOnly = users.filter(u => u.role !== 'ADMIN' && u.role !== 'SHOP_OWNER');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = useMemo(() => {
    return staffOnly.filter(user => {
      return user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             user.email.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [staffOnly, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nhân Sự Thuộc Cửa Hàng</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Tìm kiếm nhân sự..." />
        </div>
        
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-3">Họ Tên</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Vị Trí</th>
              <th className="px-6 py-3">Ca Làm Việc (Gần nhất)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStaff.length === 0 ? (
              <EmptyTableState colSpan={4} message="Không tìm thấy nhân sự." />
            ) : (
              filteredStaff.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-gray-500">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-700 border-gray-200">
                      <Shield className="w-3 h-3" />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 italic">Chưa có dữ liệu phân ca</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
