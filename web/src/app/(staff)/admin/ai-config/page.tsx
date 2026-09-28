"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable, { Column } from "@/components/ui/DataTable";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Cpu, Sparkles, Plus, CheckCircle2, RefreshCw,
  Sliders, ArrowUpRight, Check, Activity, Shield
} from "lucide-react";

interface AiModelVersion {
  id: number;
  modelName: string;
  version: string;
  active: boolean;
  description?: string;
  createdAt: string;
}

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

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
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

  const activeModel = models.find((m) => m.active) || models[0];

  const handleActivateModel = async () => {
    if (!activatingModel) return;
    setIsActivating(true);
    try {
      await apiClient.post(`/api/admin/model-versions/${activatingModel.id}/activate`, {});
      toast.success(`Đã kích hoạt mô hình ${activatingModel.modelName} (${activatingModel.version}) làm mô hình mặc định!`);
      setActivatingModel(null);
      await fetchModels();
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
      toast.success("Đã đăng ký phiên bản mô hình AI mới thành công!");
      setShowRegisterModal(false);
      setRegisterForm({ modelName: "", version: "", description: "", active: false });
      await fetchModels();
    } catch (err: any) {
      toast.error(err?.message || "Đăng ký mô hình thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<AiModelVersion>[] = [
    {
      key: "modelName",
      header: "Tên Mô Hình AI",
      render: (m) => (
        <div>
          <span className="font-bold text-slate-900 text-xs">{m.modelName}</span>
          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{m.description || "—"}</p>
        </div>
      ),
    },
    {
      key: "version",
      header: "Phiên Bản",
      render: (m) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
          {m.version}
        </span>
      ),
    },
    {
      key: "active",
      header: "Trạng Thái",
      render: (m) =>
        m.active ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ĐANG PHỤC VỤ (ACTIVE)
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-slate-400">Sẵn sàng (Standby)</span>
        ),
    },
    {
      key: "createdAt",
      header: "Ngày Đăng Ký",
      render: (m) => (
        <span className="font-mono text-slate-400 text-xs">
          {new Date(m.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      key: "id",
      header: "Hành Động",
      align: "right",
      render: (m) =>
        m.active ? (
          <span className="text-xs text-slate-400 italic font-medium">Mô hình hiện tại</span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActivatingModel(m)}
            className="text-xs"
          >
            Kích Hoạt
          </Button>
        ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]} requiredPermissions={["MANAGE_AI_MODEL_FEATURE_FLAG"]}>
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-800">
        <PageHeader
          title="Quản Lý AI Models & Kiến Trúc Gợi Ý"
          subtitle="Giám sát các phiên bản mô hình học máy gợi ý thời trang và chuyển đổi phiên bản phục vụ"
          breadcrumbs={[
            { label: "Admin", href: "/admin/dashboard" },
            { label: "AI Config" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/admin/ai-feature-flags">
                <Button variant="outline" size="sm" icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}>
                  Cờ Tính Năng AI
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
                onClick={fetchModels}
                disabled={loading}
              >
                Làm mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowRegisterModal(true)}
              >
                Đăng Ký Model Mới
              </Button>
            </div>
          }
        />

        {/* ─── Active Model Spotlight Card ─── */}
        {activeModel && (
          <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-mono font-bold border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  PRODUCTION ACTIVE MODEL
                </div>
                <h2 className="text-2xl font-black tracking-tight">{activeModel.modelName}</h2>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  {activeModel.description || "Mô hình phục vụ gợi ý sản phẩm và tìm kiếm thời trang thông minh."}
                </p>
                <div className="flex items-center gap-4 pt-2 text-xs font-mono text-slate-300">
                  <span>Phiên bản: <strong className="text-white">{activeModel.version}</strong></span>
                  <span>·</span>
                  <span>Đăng ký: {new Date(activeModel.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link href="/admin/ai-feature-flags">
                  <button className="px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm flex items-center gap-1.5">
                    Quản Lý Cờ Tính Năng AI <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─── Model Registry Table ─── */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-900" />
              <span>Danh Sách Mô Hình Học Máy Đã Đăng Ký</span>
            </div>
          }
          subtitle="Tất cả các phiên bản model trong kho lưu trữ. Bạn có thể kích hoạt chuyển đổi tức thì."
          noPadding
        >
          <DataTable
            columns={columns}
            data={models}
            loading={loading}
            rowKey={(m) => m.id}
            emptyTitle="Chưa có phiên bản model nào"
            emptyMessage="Nhấn 'Đăng Ký Model Mới' để thêm phiên bản mô hình AI."
          />
        </Card>

        {/* ─── Register Model Modal ─── */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <form onSubmit={handleRegisterModel}>
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-red-400" />
                    <h3 className="font-bold text-sm">Đăng Ký Phiên Bản AI Model</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên Mô Hình <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: ET-StyleMatch, ET-FashionEmbed"
                      value={registerForm.modelName}
                      onChange={(e) => setRegisterForm({ ...registerForm, modelName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mã Phiên Bản (Version Tag) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: v2.2.0, v3.0-rc1"
                      value={registerForm.version}
                      onChange={(e) => setRegisterForm({ ...registerForm, version: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mô Tả & Trọng Số</label>
                    <textarea
                      rows={3}
                      placeholder="Mô tả thuật toán, tập dữ liệu huấn luyện hoặc trọng số mô hình..."
                      value={registerForm.description}
                      onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="activeNow"
                      checked={registerForm.active}
                      onChange={(e) => setRegisterForm({ ...registerForm, active: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <label htmlFor="activeNow" className="text-slate-700 font-semibold cursor-pointer">
                      Kích hoạt làm mô hình phục vụ chính ngay lập tức
                    </label>
                  </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRegisterModal(false)}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Đăng Ký
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Confirm Model Switch Modal ─── */}
        <ConfirmModal
          isOpen={Boolean(activatingModel)}
          title="Xác nhận chuyển đổi mô hình AI"
          message={`Bạn có chắc muốn kích hoạt mô hình "${activatingModel?.modelName}" (${activatingModel?.version}) làm mô hình phục vụ chính? Toàn bộ các yêu cầu gợi ý trang phục và tìm kiếm thông minh sẽ được định tuyến sang phiên bản này.`}
          confirmText="Kích Hoạt Ngay"
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
