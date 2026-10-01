"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Cpu, Plus, RefreshCw, X } from "lucide-react";

interface AiModelVersion {
  id: number;
  modelName: string;
  version: string;
  active: boolean;
  description?: string;
  createdAt: string;
}

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
};

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

export default function AdminAiConfigPage() {
  const [models, setModels] = useState<AiModelVersion[]>([]);
  const [loading, setLoading] = useState(true);

  // Register Model Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    modelName: "",
    version: "",
    description: "",
    active: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Activating Model
  const [activatingModel, setActivatingModel] = useState<AiModelVersion | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const fetchModels = useCallback(async (silent?: unknown) => {
    try {
      if (silent !== true) setLoading(true);
      const res: any = await apiClient.get("/api/admin/model-versions");
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setModels(list);
    } catch {
      toast.error("Không thể nạp danh sách mô hình AI");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Only a model that is really active counts as "serving"; never fall back to models[0].
  const activeModel = models.find((m) => m.active);

  const handleActivateModel = async () => {
    if (!activatingModel) return;
    setIsActivating(true);
    try {
      await apiClient.post(`/api/admin/model-versions/${activatingModel.id}/activate`, {});
      toast.success(`Đã kích hoạt mô hình ${activatingModel.modelName} (${activatingModel.version}) làm mô hình phục vụ chính`);
      setActivatingModel(null);
      await fetchModels(true);
    } catch (err: any) {
      toast.error(err?.message || "Kích hoạt mô hình thất bại");
    } finally {
      setIsActivating(false);
    }
  };

  const handleRegisterModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.modelName.trim() || !registerForm.version.trim()) {
      toast.error("Tên mô hình và phiên bản là bắt buộc");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/api/admin/model-versions", registerForm);
      toast.success("Đã đăng ký phiên bản mô hình mới");
      setShowRegisterModal(false);
      setRegisterForm({ modelName: "", version: "", description: "", active: false });
      await fetchModels(true);
    } catch (err: any) {
      toast.error(err?.message || "Đăng ký mô hình thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<AiModelVersion>[] = [
    {
      key: "modelName",
      header: "Tên mô hình",
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <Cpu className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 text-sm">{m.modelName}</span>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{m.description || "Chưa có mô tả"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "version",
      header: "Phiên bản",
      render: (m) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{m.version}</span>
      ),
    },
    {
      key: "active",
      header: "Trạng thái",
      render: (m) =>
        m.active ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đang phục vụ
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
            Chờ kích hoạt
          </span>
        ),
    },
    {
      key: "createdAt",
      header: "Ngày đăng ký",
      render: (m) => <span className="text-slate-500 text-xs">{formatDate(m.createdAt)}</span>,
    },
    {
      key: "id",
      header: "Thao tác",
      align: "right",
      render: (m) =>
        m.active ? (
          <span className="text-xs text-slate-400">Đang dùng</span>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setActivatingModel(m)}>
            Kích hoạt
          </Button>
        ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]} requiredPermissions={["MANAGE_AI_MODEL_FEATURE_FLAG"]}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto font-sans antialiased text-slate-800">
        <PageHeader
          title="AI Models & Cấu hình"
          subtitle="Quản lý các phiên bản mô hình gợi ý thời trang và chọn phiên bản đang phục vụ cửa hàng."
          actions={
            <div className="flex items-center gap-2.5">
              <Link href="/admin/ai-feature-flags">
                <Button variant="outline">Cờ tính năng AI</Button>
              </Link>
              <Button
                variant="secondary"
                onClick={fetchModels}
                loading={loading}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Làm mới
              </Button>
              <Button onClick={() => setShowRegisterModal(true)} icon={<Plus className="w-4 h-4" />}>
                Đăng ký mô hình
              </Button>
            </div>
          }
        />

        {/* Chỉ báo khi chưa có mô hình nào đang phục vụ (mô hình đang chạy đã hiện trong bảng) */}
        {!loading && !activeModel && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-slate-900">Chưa có mô hình nào đang phục vụ</p>
            <p className="mt-1 text-sm text-slate-500">
              {models.length > 0
                ? "Chọn một phiên bản trong danh sách bên dưới và bấm Kích hoạt."
                : "Đăng ký phiên bản mô hình đầu tiên để bắt đầu."}
            </p>
          </div>
        )}

        {/* ─── Danh sách mô hình ─── */}
        <Card
          title="Mô hình đã đăng ký"
          subtitle="Tất cả phiên bản trong kho lưu trữ. Kích hoạt một phiên bản để chuyển sang phục vụ ngay."
          noPadding
        >
          <DataTable
            columns={columns}
            data={models}
            loading={loading}
            rowKey={(m) => m.id}
            emptyTitle="Chưa có phiên bản mô hình nào"
            emptyMessage="Bấm 'Đăng ký mô hình' để thêm phiên bản đầu tiên."
          />
        </Card>

        {/* ─── Modal đăng ký ─── */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Đăng ký phiên bản mô hình</h3>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  aria-label="Đóng"
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegisterModel} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Tên mô hình <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: ET-StyleMatch"
                    value={registerForm.modelName}
                    onChange={(e) => setRegisterForm({ ...registerForm, modelName: e.target.value })}
                    className={`${inputClass} font-mono`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Phiên bản <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: v2.2.0"
                    value={registerForm.version}
                    onChange={(e) => setRegisterForm({ ...registerForm, version: e.target.value })}
                    className={`${inputClass} font-mono`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Mô tả</label>
                  <textarea
                    rows={3}
                    placeholder="Thuật toán, tập dữ liệu huấn luyện hoặc ghi chú về phiên bản này..."
                    value={registerForm.description}
                    onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={registerForm.active}
                    onChange={(e) => setRegisterForm({ ...registerForm, active: e.target.checked })}
                    className="rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  Kích hoạt làm mô hình phục vụ chính ngay
                </label>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowRegisterModal(false)}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    Đăng ký
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Xác nhận chuyển mô hình ─── */}
        <ConfirmModal
          isOpen={Boolean(activatingModel)}
          title="Chuyển sang mô hình này?"
          message={`Kích hoạt "${activatingModel?.modelName}" (${activatingModel?.version}) làm mô hình phục vụ chính? Các yêu cầu gợi ý và tìm kiếm thông minh sẽ được chuyển sang phiên bản này.`}
          confirmText="Kích hoạt"
          cancelText="Hủy"
          type="warning"
          isLoading={isActivating}
          onConfirm={handleActivateModel}
          onClose={() => setActivatingModel(null)}
        />
      </div>
    </PermissionGuard>
  );
}
