"use client";

import { useEffect, useState, useCallback } from "react";
import PermissionGuard from "@/components/auth/PermissionGuard";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Cpu, RefreshCw } from "lucide-react";

interface AiModelVersion {
  id: number;
  modelName: string;
  version: string;
  /** true chỉ khi backend đang thực sự dùng đúng phiên bản này để phục vụ khách. */
  active: boolean;
  description?: string;
  createdAt: string;
}

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
};

// Trang CHỈ XEM. Phiên bản mô hình do pipeline huấn luyện (scripts/pipeline/retrain.py) tạo ra
// và tự đưa vào phục vụ; backend nạp lại trong vòng ~1 phút (SASRec, phối đồ) hoặc ~10 phút
// (FP-Growth). Nút "Đăng ký mô hình" / "Kích hoạt" cũ chỉ ghi vào bảng mà không đổi mô hình
// đang chạy, nên đã bỏ.
export default function AdminAiConfigPage() {
  const [models, setModels] = useState<AiModelVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get("/api/admin/model-versions");
      setModels(Array.isArray(res) ? res : res?.data ?? []);
    } catch {
      toast.error("Không thể nạp danh sách mô hình AI");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const servingCount = models.filter((m) => m.active).length;

  const columns: Column<AiModelVersion>[] = [
    {
      key: "modelName",
      header: "Mô hình",
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <Cpu className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 text-sm">{m.modelName}</span>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{m.description || "—"}</p>
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
            Bản cũ
          </span>
        ),
    },
    {
      key: "createdAt",
      header: "Ngày huấn luyện",
      render: (m) => <span className="text-slate-500 text-xs">{formatDate(m.createdAt)}</span>,
    },
  ];

  return (
    <PermissionGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]} requiredPermissions={["MANAGE_AI_MODEL_FEATURE_FLAG"]}>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 p-6 lg:p-8 text-slate-900">
        <PageHeader
          title="Mô hình AI"
          subtitle="Các phiên bản mô hình gợi ý đã huấn luyện và phiên bản đang thực sự phục vụ khách."
          actions={
            <Button variant="outline" onClick={fetchModels} loading={loading} icon={<RefreshCw className="w-4 h-4" />}>
              Làm mới
            </Button>
          }
        />

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 leading-relaxed">
          Mô hình mới được tạo bằng pipeline huấn luyện lại (<code className="font-mono text-xs">scripts/pipeline/retrain.py</code>).
          Khi một phiên bản vượt qua bước kiểm tra, pipeline tự đưa nó vào phục vụ và hệ thống nạp lại trong vài phút,
          không cần khởi động lại. Trạng thái <strong>Đang phục vụ</strong> được lấy trực tiếp từ phiên bản mà máy chủ đang nạp.
        </div>

        {!loading && models.length > 0 && servingCount === 0 && (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            Máy chủ hiện chưa nạp được mô hình nào trong danh sách (thiếu file mô hình hoặc luật FP-Growth). Các khối gợi ý
            sẽ dùng phương án dự phòng (sản phẩm phổ biến).
          </div>
        )}

        <Card title="Phiên bản mô hình" subtitle="Mới nhất ở trên cùng." noPadding>
          <DataTable
            columns={columns}
            data={models}
            loading={loading}
            rowKey={(m) => m.id}
            emptyTitle="Chưa có phiên bản mô hình nào"
            emptyMessage="Chạy pipeline huấn luyện lại để tạo phiên bản đầu tiên."
          />
        </Card>
      </div>
    </PermissionGuard>
  );
}
