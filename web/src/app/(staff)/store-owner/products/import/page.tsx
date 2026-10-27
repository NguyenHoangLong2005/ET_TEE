'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload, XCircle, AlertTriangle, PackagePlus,
} from 'lucide-react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { apiClient } from '@/lib/api-client';
import { getApiBaseUrl } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth';

interface ProductResult {
  rows: number[];
  groupKey?: string | null;
  name?: string | null;
  categoryName?: string | null;
  price?: number | null;
  salePrice?: number | null;
  variantCount: number;
  totalStock: number;
  skus: string[];
  imageCount: number;
  status: 'VALID' | 'INVALID' | 'CREATED' | 'FAILED';
  errors: string[];
  productId?: number | null;
}

interface ImportReport {
  fileName?: string;
  dryRun: boolean;
  totalRows: number;
  totalProducts: number;
  validProducts: number;
  invalidProducts: number;
  createdProducts: number;
  fileErrors: string[];
  products: ProductResult[];
}

type Filter = 'all' | 'ok' | 'error';

const MAX_SIZE = 5 * 1024 * 1024;
const money = (v?: number | null) => (typeof v === 'number' ? `${Math.round(v).toLocaleString('vi-VN')} ₫` : '—');
const rowsLabel = (rows: number[]) =>
  rows.length === 1 ? `${rows[0]}` : `${rows[0]}–${rows[rows.length - 1]}`;

const STATUS_META: Record<ProductResult['status'], { label: string; cls: string; dot: string }> = {
  VALID: { label: 'Hợp lệ', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  CREATED: { label: 'Đã tạo', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  INVALID: { label: 'Có lỗi', cls: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  FAILED: { label: 'Lưu thất bại', cls: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
};

export default function ProductImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const upload = async (f: File, dryRun: boolean) => {
    const body = new FormData();
    body.append('file', f);
    return apiClient.post<ImportReport>(`/api/store-owner/products/import?dryRun=${dryRun}`, body);
  };

  const pickFile = async (f: File | undefined | null) => {
    if (!f) return;
    const lower = f.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) {
      toast.error('Chỉ nhận file .xlsx hoặc .csv');
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error('File lớn hơn 5MB — hãy chia nhỏ file');
      return;
    }
    setFile(f);
    setReport(null);
    setFilter('all');
    setChecking(true);
    try {
      setReport(await upload(f, true));
    } catch (err) {
      toast.error((err as Error)?.message || 'Không kiểm tra được file');
      setFile(null);
    } finally {
      setChecking(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const runImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const res = await upload(file, false);
      setReport(res);
      setFilter('all');
      setConfirmOpen(false);
      if (res.createdProducts > 0) toast.success(`Đã tạo ${res.createdProducts} sản phẩm`);
      else toast.error('Không có sản phẩm nào được tạo');
    } catch (err) {
      toast.error((err as Error)?.message || 'Nhập sản phẩm thất bại');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${getApiBaseUrl()}/api/store-owner/products/import/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Tải file mẫu thất bại (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mau-nhap-san-pham.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error((err as Error)?.message || 'Không tải được file mẫu');
    } finally {
      setDownloading(false);
    }
  };

  const reset = () => { setFile(null); setReport(null); setFilter('all'); };

  const done = report !== null && !report.dryRun;
  const okCount = report ? (done ? report.createdProducts : report.validProducts) : 0;
  const errorCount = report ? report.products.length - okCount : 0;
  const shown = useMemo(() => {
    if (!report) return [];
    if (filter === 'ok') return report.products.filter((p) => p.status === 'VALID' || p.status === 'CREATED');
    if (filter === 'error') return report.products.filter((p) => p.status === 'INVALID' || p.status === 'FAILED');
    return report.products;
  }, [report, filter]);

  return (
    <PermissionGuard allowedRoles={['SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN']}>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-8 text-slate-900">
        <PageHeader
          title="Nhập sản phẩm từ file"
          subtitle="Tạo nhiều sản phẩm cùng lúc từ file Excel (.xlsx) hoặc CSV. Hệ thống kiểm tra toàn bộ file trước, bạn xem lại rồi mới nhập."
          actions={
            <Link href="/store-owner/products">
              <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Về danh sách sản phẩm</Button>
            </Link>
          }
        />

        {/* Bước 1 + 2 */}
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2" title="1. Chuẩn bị file" subtitle="Dùng file mẫu để đúng tên cột">
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span><span>Mỗi dòng là <strong className="text-slate-800">một biến thể</strong> (một SKU: màu + size + tồn kho).</span></li>
              <li className="flex gap-2"><span className="text-slate-400">•</span><span>Các dòng cùng <strong className="text-slate-800">Mã nhóm</strong> gộp thành một sản phẩm; tên, danh mục, giá chỉ cần ghi ở dòng đầu.</span></li>
              <li className="flex gap-2"><span className="text-slate-400">•</span><span>Danh mục ghi theo tên, đường dẫn (VD: <em>Nam &gt; Áo thun</em>) hoặc ID — danh sách có sẵn trong file mẫu.</span></li>
              <li className="flex gap-2"><span className="text-slate-400">•</span><span>Ảnh là đường dẫn http(s), nhiều ảnh cách nhau bởi dấu <code className="rounded bg-slate-100 px-1">|</code>.</span></li>
              <li className="flex gap-2"><span className="text-slate-400">•</span><span>Tối đa 2.000 dòng, file ≤ 5MB.</span></li>
            </ul>
            <Button className="mt-5 w-full" variant="secondary" onClick={downloadTemplate} loading={downloading}
              icon={<Download className="w-4 h-4" />}>
              Tải file mẫu (.xlsx)
            </Button>
          </Card>

          <Card className="lg:col-span-3" title="2. Tải file lên" subtitle="Tải lên chỉ để kiểm tra — chưa có gì được lưu">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
              disabled={checking || importing}
              className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors disabled:cursor-wait ${
                dragging ? 'border-primary bg-primary-50' : 'border-slate-200 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-slate-200">
                {checking ? (
                  <span className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
                ) : file ? (
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Upload className="h-5 w-5 text-slate-500" />
                )}
              </span>
              {checking ? (
                <span className="text-sm font-medium text-slate-700">Đang kiểm tra {file?.name}…</span>
              ) : file ? (
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{file.name}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · bấm hoặc kéo file khác vào để thay</span>
                </span>
              ) : (
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Kéo thả file vào đây hoặc bấm để chọn</span>
                  <span className="block text-xs text-slate-500 mt-0.5">.xlsx hoặc .csv (UTF-8, phân cách bằng dấu phẩy hoặc chấm phẩy)</span>
                </span>
              )}
            </button>
          </Card>
        </div>

        {/* Lỗi cấp file */}
        {report && report.fileErrors.length > 0 && (
          <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
            <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <div className="space-y-1 text-sm text-rose-800">
              <p className="font-semibold">Không đọc được file</p>
              {report.fileErrors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          </div>
        )}

        {/* Bước 3: kết quả */}
        {report && report.fileErrors.length === 0 && (
          <Card
            noPadding
            title={done ? '3. Kết quả nhập' : '3. Kiểm tra trước khi nhập'}
            subtitle={done
              ? `Đã tạo ${report.createdProducts}/${report.totalProducts} sản phẩm từ ${report.totalRows} dòng.`
              : `${report.totalRows} dòng → ${report.totalProducts} sản phẩm. Sản phẩm có lỗi sẽ được bỏ qua khi nhập.`}
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={reset} icon={<RotateCcw className="w-3.5 h-3.5" />}>
                  {done ? 'Nhập file khác' : 'Chọn lại'}
                </Button>
                {!done && (
                  <Button size="sm" disabled={report.validProducts === 0} onClick={() => setConfirmOpen(true)}
                    icon={<PackagePlus className="w-3.5 h-3.5" />}>
                    Nhập {report.validProducts} sản phẩm
                  </Button>
                )}
                {done && report.createdProducts > 0 && (
                  <Link href="/store-owner/products">
                    <Button size="sm" variant="secondary">Xem sản phẩm</Button>
                  </Link>
                )}
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4 border-b border-slate-100">
              {[
                { label: 'Dòng dữ liệu', value: report.totalRows, tone: 'text-slate-900' },
                { label: 'Sản phẩm', value: report.totalProducts, tone: 'text-slate-900' },
                { label: done ? 'Đã tạo' : 'Hợp lệ', value: okCount, tone: 'text-emerald-600' },
                { label: 'Có lỗi', value: errorCount, tone: errorCount ? 'text-rose-600' : 'text-slate-400' },
              ].map((s) => (
                <div key={s.label} className="bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${s.tone}`}>{s.value.toLocaleString('vi-VN')}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-100">
              {([
                { key: 'all', label: `Tất cả (${report.products.length})` },
                { key: 'ok', label: `${done ? 'Đã tạo' : 'Hợp lệ'} (${okCount})` },
                { key: 'error', label: `Có lỗi (${errorCount})` },
              ] as { key: Filter; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFilter(t.key)}
                  className={`h-8 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                    filter === t.key
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-900 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    <th className="px-5 py-3 w-20">Dòng</th>
                    <th className="px-4 py-3">Sản phẩm</th>
                    <th className="px-4 py-3">Danh mục</th>
                    <th className="px-4 py-3 text-right">Giá</th>
                    <th className="px-4 py-3 text-right">Biến thể</th>
                    <th className="px-4 py-3 text-right">Tồn kho</th>
                    <th className="px-4 py-3 w-36">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">Không có sản phẩm nào trong mục này.</td></tr>
                  )}
                  {shown.map((p) => {
                    const meta = STATUS_META[p.status];
                    return (
                      <tr key={p.rows.join('-')} className="align-top hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{rowsLabel(p.rows)}</td>
                        <td className="px-4 py-3 min-w-[240px]">
                          <p className="font-semibold text-slate-900">
                            {p.productId ? (
                              <Link href="/store-owner/products" className="hover:underline">{p.name}</Link>
                            ) : (p.name || <span className="text-slate-400 italic">(chưa có tên)</span>)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {p.groupKey && <span className="font-mono">{p.groupKey} · </span>}
                            {p.skus.length > 0 ? p.skus.slice(0, 3).join(', ') + (p.skus.length > 3 ? ` +${p.skus.length - 3}` : '') : '—'}
                            {p.imageCount > 0 && ` · ${p.imageCount} ảnh`}
                          </p>
                          {p.errors.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {p.errors.map((e, i) => (
                                <li key={i} className="flex gap-1.5 text-xs text-rose-700">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                                  <span>{e}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-4 py-3 min-w-[160px] text-slate-600">{p.categoryName || '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                          {p.salePrice != null ? (
                            <>
                              <span className="block font-semibold text-primary">{money(p.salePrice)}</span>
                              <span className="block text-xs text-slate-400 line-through">{money(p.price)}</span>
                            </>
                          ) : (
                            <span className="font-semibold text-slate-900">{money(p.price)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{p.variantCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{p.totalStock.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
                            {p.status === 'CREATED' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <ConfirmModal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={runImport}
          title={`Nhập ${report?.validProducts ?? 0} sản phẩm?`}
          message={
            report && report.invalidProducts > 0
              ? `${report.validProducts} sản phẩm hợp lệ sẽ được tạo và hiển thị theo trạng thái trong file. ${report.invalidProducts} sản phẩm có lỗi sẽ bị bỏ qua — bạn có thể sửa file và nhập lại riêng các sản phẩm đó.`
              : `${report?.validProducts ?? 0} sản phẩm sẽ được tạo và hiển thị theo trạng thái trong file.`
          }
          confirmText="Nhập sản phẩm"
          cancelText="Hủy"
          isLoading={importing}
          type="info"
        />
      </div>
    </PermissionGuard>
  );
}
