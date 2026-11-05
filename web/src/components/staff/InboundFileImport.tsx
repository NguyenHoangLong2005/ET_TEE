"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

type RowResult = {
  row: number;
  sku: string;
  productName?: string | null;
  variant?: string | null;
  quantity?: number | null;
  location?: string | null;
  note?: string | null;
  status: "VALID" | "INVALID" | "IMPORTED";
  errors: string[];
};

type Report = {
  dryRun: boolean;
  fileName?: string;
  fileErrors: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  totalQuantity: number;
  rows: RowResult[];
};

const inputCls =
  "w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600";

/**
 * Nhap kho bang file (.xlsx/.csv): tai file mau -> dien SKU + so luong -> kiem tra -> xac nhan.
 * Backend nhap tat ca cac dong trong mot giao dich; co dong loi thi khong dong nao duoc nhap.
 */
export default function InboundFileImport({
  suppliers,
  onImported,
}: {
  suppliers: { id: number; name: string }[];
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState<"check" | "import" | "template" | null>(null);

  const send = async (dryRun: boolean) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    if (supplierId) form.append("supplierId", supplierId);
    if (note.trim()) form.append("note", note.trim());
    form.append("dryRun", String(dryRun));
    return apiClient.post<Report>("/api/staff/warehouse/inbound/import", form);
  };

  const check = async (f: File) => {
    setFile(f);
    setReport(null);
    setBusy("check");
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("dryRun", "true");
      setReport(await apiClient.post<Report>("/api/staff/warehouse/inbound/import", form));
    } catch (e: any) {
      toast.error(e?.message || "Không kiểm tra được file");
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    setBusy("import");
    try {
      const r = await send(false);
      if (!r) return;
      setReport(r);
      if (r.importedRows > 0) {
        toast.success(`Đã nhập ${r.importedRows} dòng, tổng ${r.totalQuantity.toLocaleString("vi-VN")} sản phẩm`);
        onImported();
      } else {
        toast.error(r.fileErrors[0] || "Chưa nhập được, hãy xem lỗi từng dòng");
      }
    } catch (e: any) {
      toast.error(e?.message || "Nhập kho thất bại");
    } finally {
      setBusy(null);
    }
  };

  const downloadTemplate = async () => {
    setBusy("template");
    try {
      const token = getAuthToken();
      const res = await fetch(`${getApiBaseUrl()}/api/staff/warehouse/inbound/import/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Tải file mẫu thất bại (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "mau-nhap-kho.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Không tải được file mẫu");
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setFile(null);
    setReport(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const imported = !!report && report.importedRows > 0;
  const canConfirm = !!report && !imported && report.fileErrors.length === 0 && report.invalidRows === 0 && report.validRows > 0;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary-600" />
            <h2 className="text-sm font-bold text-slate-900">Nhập cả lô hàng từ file Excel / CSV</h2>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate} loading={busy === "template"} icon={<Download className="h-3.5 w-3.5" />}>
            Tải file mẫu (.xlsx)
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <ol className="space-y-1.5 text-xs leading-relaxed text-slate-600 md:col-span-2">
            <li>1. Tải file mẫu. Trang <b>“Danh sách SKU”</b> có sẵn mọi màu/size kèm tồn hiện tại để tra cứu.</li>
            <li>2. Ở trang <b>“Nhập kho”</b>, mỗi màu/size một dòng: <b>SKU</b> và <b>Số lượng</b> bắt buộc, Vị trí kho và Ghi chú tùy chọn.</li>
            <li>3. Chọn file để hệ thống kiểm tra, sửa các dòng lỗi (nếu có), rồi bấm <b>Xác nhận nhập kho</b>.</li>
          </ol>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Nhà cung cấp của lô hàng</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputCls} disabled={imported}>
              <option value="">— Không ghi nhà cung cấp —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Ghi chú chung (vd số phiếu giao hàng)</label>
            <input value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="VD: Phiếu giao hàng NCC số 1234" disabled={imported} />
          </div>

          <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-primary-600 hover:bg-primary-50/40 md:col-span-2 ${busy === "check" ? "pointer-events-none opacity-60" : ""}`}>
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              {busy === "check" ? "Đang kiểm tra file..." : file ? file.name : "Chọn file .xlsx hoặc .csv"}
            </span>
            <span className="text-xs text-slate-500">Tối đa 500 dòng mỗi lần. File chỉ được kiểm tra, chưa ghi vào kho.</span>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) check(f); }} />
          </label>
        </div>
      </div>

      {report && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="text-sm">
              {imported ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Đã nhập {report.importedRows} dòng · {report.totalQuantity.toLocaleString("vi-VN")} sản phẩm
                </span>
              ) : (
                <span className="text-slate-700">
                  <b>{report.totalRows}</b> dòng · <b className="text-emerald-700">{report.validRows} hợp lệ</b>
                  {report.invalidRows > 0 && <> · <b className="text-rose-600">{report.invalidRows} lỗi</b></>}
                  {report.validRows > 0 && <> · tổng <b>{report.totalQuantity.toLocaleString("vi-VN")}</b> sản phẩm</>}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset}>{imported ? "Nhập lô khác" : "Chọn file khác"}</Button>
              {!imported && (
                <Button size="sm" onClick={confirm} loading={busy === "import"} disabled={!canConfirm}>
                  Xác nhận nhập kho
                </Button>
              )}
            </div>
          </div>

          {report.fileErrors.length > 0 && (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">
              {report.fileErrors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
          {!imported && report.invalidRows > 0 && (
            <p className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">
              Sửa các dòng lỗi trong file rồi chọn lại file. Có dòng lỗi thì hệ thống không nhập dòng nào, để tránh nhập thiếu một nửa lô hàng.
            </p>
          )}

          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Dòng</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5">Sản phẩm</th>
                  <th className="px-4 py-2.5 text-right">Số lượng</th>
                  <th className="px-4 py-2.5">Vị trí</th>
                  <th className="px-4 py-2.5">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map(r => (
                  <tr key={r.row} className={r.status === "INVALID" ? "bg-rose-50/50" : ""}>
                    <td className="px-4 py-2.5 text-slate-400">{r.row}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-800">{r.sku || "—"}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-slate-900">{r.productName || "—"}</p>
                      {r.variant && <p className="text-xs text-slate-500">{r.variant}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{r.quantity?.toLocaleString("vi-VN") ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.location || "—"}</td>
                    <td className="px-4 py-2.5">
                      {r.status === "INVALID" ? (
                        <span className="inline-flex items-start gap-1 text-xs text-rose-700"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{r.errors.join("; ")}</span>
                      ) : r.status === "IMPORTED" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Đã nhập</span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700">Hợp lệ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
