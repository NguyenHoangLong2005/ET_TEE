"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type FeatureFlag = {
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number | null;
  updatedAt: string | null;
};

type ModelVersion = {
  modelName: string;
  versionTag: string;
  modelType: string;
  embeddingDim?: number | null;
  metrics?: Record<string, number | string> | null;
  trainedAt: string;
};

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("ettee_access_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default function AdminAiConfigPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [flagForm, setFlagForm] = useState({ enabled: true, rolloutPercentage: "100" });
  const [updatingFlag, setUpdatingFlag] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [flagsResponse, modelsResponse] = await Promise.all([
        fetch(`${API_BASE}/api/admin/feature-flags`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_BASE}/api/admin/model-versions`, {
          headers: getAuthHeaders(),
        }),
      ]);

      const flagsPayload = await flagsResponse.json();
      const modelsPayload = await modelsResponse.json();

      if (!flagsResponse.ok || !flagsPayload.success) {
        throw new Error(flagsPayload.message || "Không thể tải feature flags");
      }

      if (!modelsResponse.ok || !modelsPayload.success) {
        throw new Error(modelsPayload.message || "Không thể tải model versions");
      }

      setFlags(flagsPayload.data ?? []);
      setModels(modelsPayload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải cấu hình AI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredModels = searchTerm.trim()
    ? models.filter((model) => model.modelName.toLowerCase().includes(searchTerm.toLowerCase()))
    : models;

  const handleSelectFlag = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    setFlagForm({
      enabled: flag.enabled,
      rolloutPercentage: String(flag.rolloutPercentage ?? 0),
    });
  };

  const handleUpdateFlag = async () => {
    if (!selectedFlag) return;

    try {
      setUpdatingFlag(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/admin/feature-flags/${encodeURIComponent(selectedFlag.key)}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          enabled: flagForm.enabled,
          rolloutPercentage: Number(flagForm.rolloutPercentage),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể cập nhật feature flag");
      }

      await loadData();
      setSelectedFlag(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật feature flag");
    } finally {
      setUpdatingFlag(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]} allowedPermissions={["feature.manage", "model.manage"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-bold">
            SYSTEM ADMIN PORTAL
          </span>
          <h1 className="text-2xl font-bold text-white">AI Models & Recommendation Engine</h1>
        </div>
        <Link
          href="/"
          className="text-xs px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
        >
          ← Về Trang Khách Hàng
        </Link>
      </div>

      <div className="flex gap-4 border-b border-slate-800 pb-3">
        <Link
          href="/admin/users"
          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition"
        >
          👤 Quản lý Tài khoản & Phân quyền
        </Link>
        <Link
          href="/admin/ai-config"
          className="px-4 py-2 rounded-lg bg-violet-600/20 text-violet-300 font-bold text-xs border border-violet-500/30"
        >
          🤖 Cấu hình Mô hình AI
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200 text-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300 text-sm">
          Đang tải cấu hình AI...
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">Feature Flags</h3>
            <span className="text-xs text-slate-400">{flags.length} items</span>
          </div>

          <div className="space-y-3">
            {flags.map((flag) => (
              <div key={flag.key} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{flag.key}</p>
                  <button
                    onClick={() => handleSelectFlag(flag)}
                    className="px-2 py-1 rounded bg-violet-500/10 text-violet-300 text-[11px] font-semibold"
                  >
                    Chỉnh sửa
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">{flag.description}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Rollout</span>
                  <span>{flag.rolloutPercentage ?? 0}%</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Trạng thái</span>
                  <span className={flag.enabled ? "text-emerald-300" : "text-slate-300"}>{flag.enabled ? "ON" : "OFF"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">Model Versions</h3>
            <span className="text-xs text-slate-400">{models.length} versions</span>
          </div>

          <div className="mb-4">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo model name"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="space-y-3">
            {filteredModels.map((model) => (
              <div key={`${model.modelName}-${model.versionTag}`} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">{model.modelName}</p>
                  <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 text-[11px] font-semibold">
                    {model.versionTag}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">Type: {model.modelType}</p>
                <p className="mt-1 text-xs text-slate-400">Embedding: {model.embeddingDim ?? "-"}</p>
                {model.metrics ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Metrics: {JSON.stringify(model.metrics)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedFlag ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <h3 className="font-bold text-white mb-4">Cập nhật Feature Flag: {selectedFlag.key}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={flagForm.enabled}
                onChange={(e) => setFlagForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              Enabled
            </label>
            <input
              value={flagForm.rolloutPercentage}
              onChange={(e) => setFlagForm((prev) => ({ ...prev, rolloutPercentage: e.target.value }))}
              placeholder="Rollout %"
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedFlag(null)}
                className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateFlag}
                disabled={updatingFlag}
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {updatingFlag ? "Đang lưu..." : "Lưu cập nhật"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </ProtectedRoute>
  );
}
