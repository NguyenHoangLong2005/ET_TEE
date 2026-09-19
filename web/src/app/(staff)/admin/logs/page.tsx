"use client";
import React, { useState, useMemo } from 'react';
import { ScrollText } from 'lucide-react';
import SearchInput from '@/components/shared/SearchInput';

export default function SystemLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');

  const rawLogs = [
    { time: '[2026-09-19 15:30:01]', level: 'INFO', levelClass: 'text-blue-400', content: '[AuthService] User admin@et-tee.com logged in successfully. IP: 192.168.1.5' },
    { time: '[2026-09-19 15:30:45]', level: 'WARN', levelClass: 'text-yellow-400', content: '[PaymentWorker] MoMo API response time > 5000ms. Check network.' },
    { time: '[2026-09-19 15:31:12]', level: 'ERROR', levelClass: 'text-red-400 font-bold', content: '[OrderService] Failed to create order #10924. Reason: Inventory short.' },
    { time: '[2026-09-19 15:35:22]', level: 'INFO', levelClass: 'text-blue-400', content: '[AIWorker] Model v2.1 prediction cache refreshed.' },
  ];

  const filteredLogs = useMemo(() => {
    return rawLogs.filter(log => {
      const matchSearch = log.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLevel = levelFilter === 'ALL' || log.level === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [searchTerm, levelFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Logs Toàn Hệ Thống</h1>
        <div className="flex items-center gap-2">
          <select 
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">Tất cả Levels</option>
            <option value="ERROR">ERROR</option>
            <option value="WARN">WARN</option>
            <option value="INFO">INFO</option>
            <option value="DEBUG">DEBUG</option>
          </select>
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search logs..." />
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-sm p-4 font-mono text-sm overflow-hidden h-[600px] flex flex-col">
        <div className="flex items-center gap-2 mb-4 text-gray-400 text-xs border-b border-gray-800 pb-2">
          <ScrollText className="w-4 h-4" />
          <span>Live Tail (1000 lines max)</span>
        </div>
        <div className="flex-1 overflow-y-auto text-gray-300 space-y-1">
          {filteredLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Không tìm thấy logs phù hợp.</p>
          ) : (
            filteredLogs.map((log, index) => (
              <p key={index}>
                <span className="text-gray-500">{log.time}</span> <span className={log.levelClass}>[{log.level}]</span> {log.content}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
