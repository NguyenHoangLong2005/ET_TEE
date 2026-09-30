'use client';

import React from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';

export interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  title: string;
  description?: string | React.ReactNode;
  message?: string | React.ReactNode;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export function ConfirmDialog({
  open,
  isOpen,
  title,
  description,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant,
  type = 'danger',
  loading,
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) {
  const visible = open !== undefined ? open : (isOpen ?? false);
  const handleClose = onCancel || onClose || (() => {});
  const bodyText = description || message || '';
  const btnConfirm = confirmLabel || confirmText || 'Xác nhận';
  const btnCancel = cancelLabel || cancelText || 'Hủy bỏ';
  const modalType = variant || type || 'danger';
  const modalLoading = loading !== undefined ? loading : isLoading;

  return (
    <ConfirmModal
      isOpen={visible}
      onClose={handleClose}
      onConfirm={onConfirm}
      title={title}
      message={bodyText}
      confirmText={btnConfirm}
      cancelText={btnCancel}
      type={modalType}
      isLoading={modalLoading}
    />
  );
}

export default ConfirmDialog;
