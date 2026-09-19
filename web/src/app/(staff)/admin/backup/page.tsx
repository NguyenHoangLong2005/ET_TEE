import React from 'react';
import { HardDrive } from 'lucide-react';

export default function BackupPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sao Lưu & Khôi Phục (Backup & Restore)</h1>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition">
          Trigger Backup Ngay
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500">
        <HardDrive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p>Danh sách các bản sao lưu Database, Log backup sẽ được quản lý tại đây.</p>
      </div>
    </div>
  );
}
