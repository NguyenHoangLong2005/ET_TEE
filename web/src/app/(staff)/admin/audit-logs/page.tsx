import React from 'react';
import { History } from 'lucide-react';

export default function AuditLogsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nhật Ký Thao Tác (Audit Logs)</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500">
        <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p>Bảng hiển thị Audit Log: Ai đã làm gì, vào lúc nào, địa chỉ IP nào sẽ hiển thị ở đây.</p>
      </div>
    </div>
  );
}
