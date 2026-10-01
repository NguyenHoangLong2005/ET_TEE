"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive, RefreshCw, CheckCircle2, Clock, ShieldAlert,
  Download, Plus, Trash2, RotateCcw, AlertTriangle, ShieldCheck
} from 'lucide-react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable, { Column } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { apiClient } from '@/lib/api-client';
import { getApiBaseUrl } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'sonner';

interface BackupItem {
  id: string;
  fileName: string;
  size: number;
  sizeFormatted: string;
  type: 'MANUAL' | 'SCHEDULED';
  status: string;
  createdAt: string;
}

export default function AdminBackupPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Trigger Backup State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // Restore State
  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<BackupItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBackups = useCallback(async (silent?: unknown) => {
    try {
      if (silent !== true) setLoading(true);
      const res: any = await apiClient.get('/api/admin/backup');
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setBackups(list);
    } catch {
      toast.error('Không thể nạp danh sách bản sao lưu từ máy chủ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    setIsTriggering(true);
    try {
      const res: any = await apiClient.post('/api/admin/backup/create', {});
      toast.success(res?.message || 'Đã tạo bản sao lưu snapshot thành công!');
      setShowCreateModal(false);
      await fetchBackups(true);
    } catch (err: any) {
      toast.error(err?.message || 'Tạo bản sao lưu thất bại');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleDownloadBackup = async (fileName: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${getApiBaseUrl()}/api/admin/backup/download/${fileName}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error('Không thể tải file sao lưu');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Đã tải xuống file ${fileName}`);
    } catch (err: any) {
      toast.error(err?.message || 'Tải file sao lưu thất bại');
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/admin/backup/${deleteTarget.fileName}`);
      toast.success(`Đã xóa bản sao lưu ${deleteTarget.fileName}`);
      setDeleteTarget(null);
      await fetchBackups(true);
    } catch (err: any) {
      toast.error(err?.message || 'Xóa bản sao lưu thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      const res: any = await apiClient.post(`/api/admin/backup/restore/${restoreTarget.fileName}`, {});
      toast.success(res?.message || `Bản sao lưu ${restoreTarget.fileName} đã được kiểm tra tính toàn vẹn!`);
      setRestoreTarget(null);
    } catch (err: any) {
      toast.error(err?.message || 'Kiểm tra phục hồi thất bại');
    } finally {
      setIsRestoring(false);
    }
  };

  const columns: Column<BackupItem>[] = [
    {
      key: 'fileName',
      header: 'Tên file Snapshot',
      render: (b) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900 block">{b.fileName}</span>
          <span className="text-[10px] text-slate-400 font-mono">Format: SQL Database Dump</span>
        </div>
      ),
    },
    {
      key: 'sizeFormatted',
      header: 'Dung Lượng',
      render: (b) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {b.sizeFormatted || `${(b.size / 1024).toFixed(1)} KB`}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Loại Sao Lưu',
      render: (b) => (
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
            b.type === 'MANUAL'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          {b.type === 'MANUAL' ? 'THỦ CÔNG' : 'ĐỊNH KỲ'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (b) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          HOÀN TẤT
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Thời Gian Tạo',
      render: (b) => (
        <span className="font-mono text-xs text-slate-400 whitespace-nowrap">
          {new Date(b.createdAt).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Thao Tác',
      align: 'right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleDownloadBackup(b.fileName)}
            title="Tải snapshot về máy"
            className="text-xs"
          >
            Tải Về
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
            onClick={() => setRestoreTarget(b)}
            title="Kiểm tra phục hồi"
            className="text-xs text-amber-700 hover:bg-amber-50"
          >
            Phục Hồi
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
            onClick={() => setDeleteTarget(b)}
            title="Xóa snapshot"
            className="text-xs text-red-600 hover:bg-red-50"
          />
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard allowedRoles={['ADMIN', 'SUPER_ADMIN']} requiredPermissions={['MANAGE_BACKUP']}>
      <div className="min-h-screen bg-slate-50 p-6 md:p-8 space-y-6 text-slate-800">
        <PageHeader
          title="Sao Lưu & Khôi Phục Dữ Liệu (Database Backup)"
          subtitle="Quản lý các snapshot cơ sở dữ liệu PostgreSQL định kỳ và xuất file sao lưu hệ thống"
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'Sao lưu dữ liệu' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                onClick={fetchBackups}
                disabled={loading || isTriggering}
              >
                Làm mới
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateModal(true)}
                disabled={isTriggering}
                loading={isTriggering}
              >
                Tạo Bản Sao Lưu Mới
              </Button>
            </div>
          }
        />

        {/* ─── Backup Policy Banner ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Chiến Lược Sao Lưu PostgreSQL Tự Động</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Các bản snapshot được nén và lưu trữ cục bộ tại máy chủ. Toàn bộ schema và dữ liệu các bảng được bảo toàn trọn vẹn.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-slate-500">
            <span>Tổng snapshot: <strong className="text-slate-900">{backups.length} bản ghi</strong></span>
          </div>
        </div>

        {/* ─── Backup Table ─── */}
        <Card noPadding>
          <DataTable
            columns={columns}
            data={backups}
            loading={loading}
            rowKey={(item) => item.fileName}
            emptyTitle="Chưa có bản sao lưu nào"
            emptyMessage="Nhấn 'Tạo Bản Sao Lưu Mới' để khởi tạo snapshot cơ sở dữ liệu."
          />
        </Card>

        {/* ─── Confirm Create Snapshot Modal ─── */}
        <ConfirmModal
          isOpen={showCreateModal}
          title="Tạo bản sao lưu snapshot mới"
          message="Hệ thống sẽ thực hiện kết xuất toàn bộ dữ liệu bảng trong cơ sở dữ liệu PostgreSQL sang file .sql. Thao tác này an toàn và không gây gián đoạn luồng đặt hàng."
          confirmText="Bắt Đầu Sao Lưu"
          cancelText="Hủy"
          type="info"
          isLoading={isTriggering}
          onConfirm={handleCreateBackup}
          onClose={() => setShowCreateModal(false)}
        />

        {/* ─── Confirm Restore Modal ─── */}
        <ConfirmModal
          isOpen={Boolean(restoreTarget)}
          title="Cảnh báo: Kiểm tra phục hồi cơ sở dữ liệu"
          message={`Bạn đang yêu cầu kiểm tra và chuẩn bị phục hồi snapshot "${restoreTarget?.fileName}". Việc phục hồi sẽ đồng bộ dữ liệu về thời điểm sao lưu này. Bạn có muốn tiếp tục kiểm tra tính toàn vẹn của snapshot?`}
          confirmText="Kiểm Tra Toàn Vẹn"
          cancelText="Hủy"
          type="warning"
          isLoading={isRestoring}
          onConfirm={handleRestoreBackup}
          onClose={() => setRestoreTarget(null)}
        />

        {/* ─── Confirm Delete Modal ─── */}
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Xác nhận xóa bản sao lưu"
          message={`Bạn có chắc muốn xóa file snapshot "${deleteTarget?.fileName}" (${deleteTarget?.sizeFormatted}) khỏi máy chủ? Hành động này không thể hoàn tác.`}
          confirmText="Xóa Vĩnh Viễn"
          cancelText="Hủy"
          type="danger"
          isLoading={isDeleting}
          onConfirm={handleDeleteBackup}
          onClose={() => setDeleteTarget(null)}
        />
      </div>
    </PermissionGuard>
  );
}
