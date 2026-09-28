"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles, Save, Server, RefreshCw, Plus, Trash2,
  CheckCircle2, AlertTriangle, Shield, Cpu, ExternalLink
} from 'lucide-react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface FeatureFlagItem {
  key: string;
  description?: string;
  enabled: boolean;
  updatedAt?: string;
}

export default function AIFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Create Flag Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ key: '', description: '', enabled: true });
  const [isCreating, setIsCreating] = useState(false);

  // Delete Flag Modal
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/api/admin/feature-flags');
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setFlags(list);
    } catch {
      toast.error('Không thể tải cờ tính năng AI từ máy chủ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (key: string, currentStatus: boolean) => {
    setTogglingKey(key);
    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !currentStatus } : f))
    );

    try {
      await apiClient.post(`/api/admin/feature-flags/${key}`, { enabled: !currentStatus });
      toast.success(`Đã ${!currentStatus ? 'bật' : 'tắt'} tính năng "${key}"`);
    } catch {
      toast.error('Không thể cập nhật cờ tính năng. Đang hoàn tác...');
      fetchFlags();
    } finally {
      setTogglingKey(null);
    }
  };

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.key.trim()) {
      toast.error('Key cờ tính năng là bắt buộc');
      return;
    }

    const cleanKey = createForm.key.trim().toLowerCase().replaceAll(/[^a-z0-9_-]/g, '_');
    setIsCreating(true);

    try {
      await apiClient.post('/api/admin/feature-flags', {
        key: cleanKey,
        description: createForm.description.trim(),
        enabled: createForm.enabled,
      });

      toast.success(`Đã thêm cờ tính năng "${cleanKey}" thành công!`);
      setShowCreateModal(false);
      setCreateForm({ key: '', description: '', enabled: true });
      await fetchFlags();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo cờ tính năng');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFlag = async () => {
    if (!deleteTargetKey) return;
    setIsDeleting(true);

    try {
      await apiClient.delete(`/api/admin/feature-flags/${deleteTargetKey}`);
      toast.success(`Đã xóa cờ tính năng "${deleteTargetKey}"`);
      setDeleteTargetKey(null);
      await fetchFlags();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa cờ tính năng này');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']} requiredPermissions={['MANAGE_AI_MODEL_FEATURE_FLAG']}>
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-800">
        <PageHeader
          title="AI Feature Flags & Cờ Tính Năng"
          subtitle="Kiểm soát bật/tắt tức thì các tính năng trí tuệ nhân tạo trên Storefront và Admin"
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'AI Feature Flags' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/admin/ai-config">
                <Button variant="outline" size="sm" icon={<Cpu className="w-3.5 h-3.5" />}>
                  Quản Lý AI Models
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                onClick={fetchFlags}
                disabled={loading}
              >
                Làm mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                Thêm Cờ Mới
              </Button>
            </div>
          }
        />

        {/* ─── Feature Flags List ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {loading && flags.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">Đang tải danh sách cờ tính năng...</div>
          ) : flags.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">Chưa có cờ tính năng nào được cấu hình.</div>
          ) : (
            flags.map((flag) => {
              const isBusy = togglingKey === flag.key;

              return (
                <div
                  key={flag.key}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {flag.key}
                      </span>
                      {flag.enabled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ĐANG BẬT
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          ĐÃ TẮT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                      {flag.description || 'Chưa có mô tả chi tiết cho cờ tính năng này.'}
                    </p>
                    {flag.updatedAt && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        Cập nhật lần cuối: {new Date(flag.updatedAt).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <label className={`relative inline-flex items-center cursor-pointer ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={flag.enabled}
                        onChange={() => handleToggle(flag.key, flag.enabled)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetKey(flag.key)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="Xóa cờ tính năng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── Modal Create Flag ─── */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <form onSubmit={handleCreateFlag}>
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-sm">Thêm Cờ Tính Năng AI Mới</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Key Cờ Tính Năng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: visual_search, chatbot_support"
                      value={createForm.key}
                      onChange={(e) => setCreateForm({ ...createForm, key: e.target.value.toLowerCase() })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Chữ thường, chữ số và dấu gạch dưới.</p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mô Tả Chức Năng</label>
                    <textarea
                      rows={3}
                      placeholder="Mô tả mục đích và tác động khi bật/tắt tính năng này..."
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="enableFlagNow"
                      checked={createForm.enabled}
                      onChange={(e) => setCreateForm({ ...createForm, enabled: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <label htmlFor="enableFlagNow" className="text-slate-700 font-semibold cursor-pointer">
                      Kích hoạt cờ tính năng này ngay sau khi tạo
                    </label>
                  </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isCreating}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isCreating}
                    disabled={isCreating}
                  >
                    Tạo Cờ
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Confirm Delete Modal ─── */}
        <ConfirmModal
          isOpen={Boolean(deleteTargetKey)}
          title="Xác nhận xóa cờ tính năng"
          message={`Bạn có chắc muốn xóa cờ tính năng "${deleteTargetKey}"? Hành động này sẽ loại bỏ hoàn toàn cờ khỏi cơ sở dữ liệu.`}
          confirmText="Xóa Cờ"
          cancelText="Hủy"
          type="danger"
          isLoading={isDeleting}
          onConfirm={handleDeleteFlag}
          onClose={() => setDeleteTargetKey(null)}
        />
      </div>
    </PermissionGuard>
  );
}
