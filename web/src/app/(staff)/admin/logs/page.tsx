'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { toast } from 'sonner';
import {
  Terminal, RefreshCw, Copy, Download, Trash2,
  AlertTriangle, Filter, CheckCircle2, ScrollText,
  Play, Pause, ArrowDown
} from 'lucide-react';
import Link from 'next/link';

export default function AdminServerLogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [totalLines, setTotalLines] = useState(0);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = new URLSearchParams({ limit: '200' });
      if (levelFilter !== 'ALL') params.append('level', levelFilter);

      const res: any = await apiClient.get(`/api/admin/logs?${params.toString()}`);
      if (res && res.lines) {
        setLogs(res.lines);
        setTotalLines(res.totalLines || res.lines.length);
      }
    } catch {
      if (!isSilent) toast.error('Không thể nạp log từ máy chủ');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [levelFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleCopyLogs = () => {
    if (logs.length === 0) {
      toast.error('Không có dòng log nào để sao chép');
      return;
    }
    navigator.clipboard.writeText(logs.join('\n'));
    toast.success(`Đã sao chép ${logs.length} dòng log vào bộ nhớ tạm!`);
  };

  const handleDownloadLogs = () => {
    if (logs.length === 0) {
      toast.error('Không có log để tải về');
      return;
    }
    const blob = new Blob([logs.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `server_log_${new Date().toISOString().slice(0, 10)}.log`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file log thành công!');
  };

  const scrollToBottom = () => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderLogLine = (line: string, index: number) => {
    const isError = line.includes('[ERROR]') || line.includes(' ERROR ');
    const isWarn = line.includes('[ WARN]') || line.includes('[WARN]') || line.includes(' WARN ');
    const isInfo = line.includes('[ INFO]') || line.includes('[INFO]') || line.includes(' INFO ');

    return (
      <div
        key={index}
        className={`flex items-start gap-3 py-0.5 px-3 hover:bg-slate-900/80 transition-colors font-mono text-[11px] leading-relaxed ${
          isError ? 'text-red-400 bg-red-950/20' : isWarn ? 'text-amber-300 bg-amber-950/10' : isInfo ? 'text-slate-200' : 'text-slate-400'
        }`}
      >
        <span className="text-slate-600 select-none w-8 text-right shrink-0">{index + 1}</span>
        <span className="break-all whitespace-pre-wrap flex-1">{line}</span>
      </div>
    );
  };

  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']} requiredPermissions={['VIEW_SYS_ERROR_LOG']}>
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-800">
        <PageHeader
          title="Nhật Ký Máy Chủ (Server Logs Console)"
          subtitle="Giám sát luồng thông báo kỹ thuật, ngoại lệ và sự kiện thời gian thực từ Spring Boot Core"
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'Nhật ký Máy chủ' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/admin/audit-logs">
                <Button variant="outline" size="sm" icon={<ScrollText className="w-3.5 h-3.5" />}>
                  Nhật Ký Audit
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={handleCopyLogs}
              >
                Sao Chép
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleDownloadLogs}
              >
                Tải Về (.log)
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                onClick={() => fetchLogs()}
                disabled={loading}
              >
                Làm mới
              </Button>
            </div>
          }
        />

        {/* ─── Filter & Stream Controller Bar ─── */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Mức log:</span>
            {['ALL', 'ERROR', 'WARN', 'INFO'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                  levelFilter === lvl
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {autoRefresh ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-stream: 8s
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" />
                  Stream: Tạm dừng
                </>
              )}
            </button>

            <button
              onClick={scrollToBottom}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
              title="Cuộn xuống dòng mới nhất"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Black Terminal Console View ─── */}
        <div className="bg-slate-950 rounded-2xl shadow-xl border border-slate-900 overflow-hidden">
          {/* Terminal Window Top Bar */}
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-[11px] font-mono text-slate-400 font-semibold ml-2">
                application.log · {logs.length} dòng hiển thị
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500">UTF-8</span>
            </div>
          </div>

          {/* Console Body */}
          <div className="max-h-[600px] min-h-[360px] overflow-y-auto p-2 divide-y divide-slate-900/40">
            {loading && logs.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-slate-500">
                Đang nạp dữ liệu log từ máy chủ...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-slate-500">
                Không tìm thấy dòng log nào khớp với mức lọc &quot;{levelFilter}&quot;.
              </div>
            ) : (
              logs.map((line, idx) => renderLogLine(line, idx))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
