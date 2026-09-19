import React from 'react';
import { Activity } from 'lucide-react';

export default function MonitoringPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Giám Sát Lỗi (Error Monitoring)</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-500">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p>Dashboard hiển thị HTTP 500, Failed Jobs, Dead Letter Queues sẽ nằm ở đây.</p>
      </div>
    </div>
  );
}
