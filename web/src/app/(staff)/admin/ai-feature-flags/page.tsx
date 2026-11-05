"use client";

import { useCallback, useEffect, useState } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";

interface FlagState {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt?: string | null;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
};

// Bốn công tắc cố định (backend AiFeatureFlags). Mỗi công tắc được chức năng tương ứng kiểm tra
// thật trước khi chạy mô hình; đổi trạng thái có hiệu lực với khách gần như ngay lập tức.
export default function AdminAiFeatureFlagsPage() {
  const [flags, setFlags] = useState<FlagState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get("/api/admin/feature-flags");
      setFlags(Array.isArray(res) ? res : res?.data ?? []);
    } catch {
      toast.error("Không thể tải cờ tính năng AI");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (flag: FlagState) => {
    setSaving(flag.key);
    try {
      const res: any = await apiClient.put(`/api/admin/feature-flags/${flag.key}`, { enabled: !flag.enabled });
      const updated: FlagState = res?.key ? res : { ...flag, enabled: !flag.enabled };
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? updated : f)));
      toast.success(`${updated.enabled ? "Đã bật" : "Đã tắt"}: ${flag.label}`);
    } catch (e: any) {
      toast.error(e?.message || "Không đổi được trạng thái");
    } finally {
      setSaving(null);
    }
  };

  const onCount = flags.filter((f) => f.enabled).length;

  return (
    <PermissionGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]} requiredPermissions={["MANAGE_AI_MODEL_FEATURE_FLAG"]}>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-8 text-slate-900">
        <PageHeader
          title="Cờ tính năng AI"
          subtitle={loading ? "Bật / tắt từng chức năng AI trên website và ứng dụng." : `Đang bật ${onCount}/${flags.length} chức năng AI. Thay đổi có hiệu lực với khách sau vài giây.`}
          actions={
            <Button variant="outline" onClick={load} loading={loading} icon={<RefreshCw className="w-4 h-4" />}>
              Làm mới
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {flags.map((f) => (
            <div key={f.key} className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${f.enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{f.label}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${f.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {f.enabled ? "Đang bật" : "Đang tắt"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.description}</p>
                {formatDateTime(f.updatedAt) && (
                  <p className="mt-2 text-[11px] text-slate-400">Cập nhật {formatDateTime(f.updatedAt)}</p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={f.enabled}
                aria-label={`${f.enabled ? "Tắt" : "Bật"} ${f.label}`}
                disabled={saving === f.key}
                onClick={() => toggle(f)}
                className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${f.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${f.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </PermissionGuard>
  );
}
