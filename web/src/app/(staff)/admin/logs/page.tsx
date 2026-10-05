'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { RefreshCw, Copy, Download, Search, X, Pause, Play } from 'lucide-react';

type Level = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'OTHER';

interface ParsedLine {
  raw: string;
  time: string; // HH:mm:ss.SSS (or empty)
  date: string;
  level: Level;
  message: string;
}

const LEVEL_FILTERS = ['ALL', 'ERROR', 'WARN', 'INFO'] as const;
const LIMIT_OPTIONS = [100, 200, 500, 1000];
const REFRESH_MS = 8000;

const LEVEL_STYLE: Record<Level, { pill: string; row: string }> = {
  ERROR: { pill: 'bg-rose-100 text-rose-700', row: 'bg-rose-50/60' },
  WARN: { pill: 'bg-amber-100 text-amber-700', row: 'bg-amber-50/50' },
  INFO: { pill: 'bg-sky-100 text-sky-700', row: '' },
  DEBUG: { pill: 'bg-slate-100 text-slate-600', row: '' },
  OTHER: { pill: 'bg-slate-100 text-slate-500', row: '' },
};

const inputClass =
  'ui-control w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl font-sans text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

/** Splits a log line into timestamp / level / message; understands Spring's "… INFO 123 --- …" and "[ INFO]" styles. */
function parseLine(raw: string): ParsedLine {
  const stamp = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)/);
  const levelMatch = raw.slice(0, 120).match(/\b(ERROR|WARN|INFO|DEBUG|TRACE)\b/);
  let message = raw;
  if (stamp) message = message.slice(stamp[0].length);
  if (levelMatch) {
    const idx = message.indexOf(levelMatch[1]);
    if (idx >= 0) message = message.slice(idx + levelMatch[1].length);
  }
  message = message.replace(/^[\s\]:]+/, '').replace(/^\d+\s+---\s*/, '');
  const raw_level = levelMatch?.[1];
  const level: Level = raw_level === 'ERROR' ? 'ERROR' : raw_level === 'WARN' ? 'WARN' : raw_level === 'INFO' ? 'INFO'
    : raw_level === 'DEBUG' || raw_level === 'TRACE' ? 'DEBUG' : 'OTHER';
  return { raw, time: stamp ? stamp[2] : '', date: stamp ? stamp[1] : '', level, message };
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-yellow-200 px-0.5 text-slate-900">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

export default function AdminServerLogsPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [source, setSource] = useState<'FILE' | 'AUDIT' | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<(typeof LEVEL_FILTERS)[number]>('ALL');
  const [limit, setLimit] = useState(200);
  const [query, setQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [follow, setFollow] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams({ limit: String(limit) });
      if (level !== 'ALL') params.append('level', level);
      const res: any = await apiClient.get(`/api/admin/logs?${params.toString()}`);
      setLines(res?.lines ?? []);
      setSource(res?.source ?? null);
      setFileName(res?.file ?? null);
      setUpdatedAt(new Date());
    } catch {
      if (!silent) toast.error('Không thể nạp log từ máy chủ');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [level, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => fetchLogs(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [autoRefresh, fetchLogs]);

  const parsed = useMemo(() => lines.map(parseLine), [lines]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? parsed.filter((l) => l.raw.toLowerCase().includes(q)) : parsed;
  }, [parsed, query]);

  const counts = useMemo(() => {
    const c = { ERROR: 0, WARN: 0, INFO: 0 };
    parsed.forEach((l) => {
      if (l.level === 'ERROR') c.ERROR++;
      else if (l.level === 'WARN') c.WARN++;
      else if (l.level === 'INFO') c.INFO++;
    });
    return c;
  }, [parsed]);

  // Keep the newest line in view while following.
  useEffect(() => {
    if (follow && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [visible, follow]);

  const handleCopy = async () => {
    if (visible.length === 0) return toast.error('Không có dòng log nào để sao chép');
    try {
      await navigator.clipboard.writeText(visible.map((l) => l.raw).join('\n'));
      toast.success(`Đã sao chép ${visible.length} dòng log`);
    } catch {
      toast.error('Không thể sao chép, vui lòng thử lại');
    }
  };

  const handleDownload = () => {
    if (visible.length === 0) return toast.error('Không có log để tải về');
    const url = URL.createObjectURL(new Blob([visible.map((l) => l.raw).join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `server_log_${new Date().toISOString().slice(0, 10)}.log`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Đã tải file log');
  };

  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']} requiredPermissions={['VIEW_SYS_ERROR_LOG']}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">
        <PageHeader
          title="Nhật ký máy chủ"
          subtitle="Theo dõi thông báo kỹ thuật, cảnh báo và lỗi của hệ thống gần đây nhất."
          actions={
            <div className="flex items-center gap-2.5">
              <Link href="/admin/audit-logs">
                <Button variant="outline">Nhật ký kiểm toán</Button>
              </Link>
              <Button variant="outline" icon={<Copy className="w-4 h-4" />} onClick={handleCopy}>
                Sao chép
              </Button>
              <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleDownload}>
                Tải về
              </Button>
              <Button variant="secondary" icon={<RefreshCw className="w-4 h-4" />} onClick={() => fetchLogs()} loading={loading}>
                Làm mới
              </Button>
            </div>
          }
        />

        {/* ─── Bộ lọc ─── */}
        <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-8">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm trong các dòng log đang hiển thị..."
                className={`${inputClass} pl-10 pr-9`}
                aria-label="Tìm trong log"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Xóa từ khóa"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={`${inputClass} lg:col-span-4`} aria-label="Số dòng">
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} dòng mới nhất</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-500 mr-1">Mức log:</span>
            {LEVEL_FILTERS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`ui-control-medium h-8 px-3.5 rounded-full border font-sans transition-colors ${
                  level === lvl
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-900 hover:text-slate-900'
                }`}
              >
                {lvl === 'ALL' ? 'Tất cả' : lvl}
              </button>
            ))}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`ui-control-medium inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border font-sans transition-colors ${
                autoRefresh ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-900'
              }`}
            >
              {autoRefresh ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {autoRefresh ? `Tự làm mới ${REFRESH_MS / 1000}s` : 'Đã tạm dừng'}
            </button>
            <button
              type="button"
              onClick={() => setFollow((v) => !v)}
              className={`ui-control-medium h-8 px-3.5 rounded-full border font-sans transition-colors ${
                follow ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-900'
              }`}
            >
              Theo dõi dòng mới nhất
            </button>
          </div>
        </div>

        {/* ─── Tổng kết ─── */}
        <p className="text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            <span className="font-bold text-slate-900">{visible.length.toLocaleString('vi-VN')}</span>
            {query ? ` / ${parsed.length.toLocaleString('vi-VN')}` : ''} dòng
          </span>
          <span className="text-rose-600"><span className="font-bold">{counts.ERROR}</span> lỗi</span>
          <span className="text-amber-600"><span className="font-bold">{counts.WARN}</span> cảnh báo</span>
          <span className="text-sky-600"><span className="font-bold">{counts.INFO}</span> thông tin</span>
          {updatedAt && (
            <span className="text-slate-400">
              Cập nhật {updatedAt.toLocaleTimeString('vi-VN')}
              {source === 'FILE' && fileName ? ` · ${fileName}` : ''}
            </span>
          )}
        </p>

        {/* ─── Danh sách log ─── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div ref={bodyRef} className="max-h-[640px] min-h-[320px] overflow-y-auto overflow-x-hidden">
            {loading && lines.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">Đang nạp log từ máy chủ...</div>
            ) : visible.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Không có dòng log nào khớp{query ? ` với “${query}”` : level !== 'ALL' ? ` mức ${level}` : ''}.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visible.map((line, idx) => {
                  const style = LEVEL_STYLE[line.level];
                  return (
                    <li key={idx} className={`flex items-start gap-3 px-4 py-2 hover:bg-slate-50 ${style.row}`}>
                      <span className="w-10 shrink-0 text-right font-mono text-xs leading-6 text-slate-300 select-none">{idx + 1}</span>
                      <span className="w-[92px] shrink-0 font-mono text-xs leading-6 text-slate-400" title={line.date}>
                        {line.time || '—'}
                      </span>
                      <span className={`mt-0.5 inline-flex h-5 w-14 shrink-0 items-center justify-center rounded text-[11px] font-bold ${style.pill}`}>
                        {line.level === 'OTHER' ? '···' : line.level}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-700">
                        <Highlight text={line.message || line.raw} query={query.trim()} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
