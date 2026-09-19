import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Truy cập bị từ chối</h1>
        <p className="text-gray-500 mb-6">
          Bạn không có quyền (role) hợp lệ để xem trang này. Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là một lỗi.
        </p>
        <Link 
          href="/"
          className="inline-block w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium"
        >
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
}
