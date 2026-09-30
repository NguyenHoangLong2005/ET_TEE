'use client';

import React from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/**
 * Enterprise Status Badge — Semantic Only
 *
 * Badge colors MUST carry meaning:
 *   success = healthy / delivered / active / sent
 *   warning = pending / near-threshold / on-hold
 *   danger  = failed / locked / cancelled / banned / error
 *   info    = in-progress / shipping / confirmed / neutral informational
 *   neutral = inactive / draft / returned
 *
 * NEVER use badge color decoratively (no rainbow per-card colors).
 */

// Colors aligned with globals.css design tokens
const TONE_CLASSES: Record<StatusTone, { badge: string; dot: string }> = {
  success: {
    badge: 'text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  warning: {
    badge: 'text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  danger: {
    badge: 'text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  info: {
    badge: 'text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  neutral: {
    badge: 'text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

// Inline background styles (semantic token values)
const TONE_BG: Record<StatusTone, string> = {
  success: '#ECFDF5',
  warning: '#FFFBEB',
  danger:  '#FEF2F2',
  info:    '#EFF6FF',
  neutral: '#F8FAFC',
};

export const ORDER_STATUS_CONFIG: Record<string, { label: string; tone: StatusTone }> = {
  PENDING:    { label: 'Chờ xác nhận',   tone: 'warning' },
  CONFIRMED:  { label: 'Đã xác nhận',    tone: 'info' },
  PROCESSING: { label: 'Đang xử lý',     tone: 'info' },
  PICKING:    { label: 'Đang lấy hàng',  tone: 'info' },
  PACKED:     { label: 'Đã đóng gói',    tone: 'info' },
  SHIPPING:   { label: 'Đang vận chuyển', tone: 'info' },
  SHIPPED:    { label: 'Đã xuất kho',    tone: 'info' },
  DELIVERED:  { label: 'Đã giao hàng',   tone: 'success' },
  COMPLETED:  { label: 'Hoàn thành',     tone: 'success' },
  CANCELLED:  { label: 'Đã hủy',         tone: 'danger' },
  RETURNED:   { label: 'Đã trả hàng',    tone: 'neutral' },
  REFUNDED:   { label: 'Đã hoàn tiền',   tone: 'neutral' },
};

export const SHIPMENT_STATUS_CONFIG: Record<string, { label: string; tone: StatusTone }> = {
  CREATED:          { label: 'Mới tạo',         tone: 'neutral' },
  PICKED_UP:        { label: 'Đã lấy hàng',      tone: 'info' },
  IN_TRANSIT:       { label: 'Đang vận chuyển',  tone: 'info' },
  OUT_FOR_DELIVERY: { label: 'Đang phát hàng',   tone: 'warning' },
  DELIVERED:        { label: 'Giao thành công',  tone: 'success' },
  FAILED:           { label: 'Giao thất bại',    tone: 'danger' },
  EXCEPTION:        { label: 'Có sự cố',         tone: 'danger' },
  RETURNED:         { label: 'Chuyển hoàn',      tone: 'neutral' },
};

export const USER_STATUS_CONFIG: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE:   { label: 'Hoạt động',    tone: 'success' },
  INACTIVE: { label: 'Tạm ngưng',    tone: 'neutral' },
  LOCKED:   { label: 'Đang bị khóa', tone: 'warning' },
  BANNED:   { label: 'Đã cấm',       tone: 'danger' },
};

export const TICKET_STATUS_CONFIG: Record<string, { label: string; tone: StatusTone }> = {
  OPEN:        { label: 'Đang mở',        tone: 'warning' },
  IN_PROGRESS: { label: 'Đang xử lý',     tone: 'info' },
  RESOLVED:    { label: 'Đã giải quyết',  tone: 'success' },
  CLOSED:      { label: 'Đã đóng',        tone: 'neutral' },
};

export interface StatusBadgeProps {
  label?: string;
  status?: string;
  tone?: StatusTone;
  type?: 'order' | 'shipment' | 'user' | 'ticket';
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  label,
  status,
  tone,
  type = 'order',
  showDot = true,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  let finalLabel = label;
  let finalTone: StatusTone = tone || 'neutral';

  if (status) {
    const key = status.toUpperCase();
    if (type === 'order' && ORDER_STATUS_CONFIG[key]) {
      finalLabel = finalLabel || ORDER_STATUS_CONFIG[key].label;
      finalTone = tone || ORDER_STATUS_CONFIG[key].tone;
    } else if (type === 'shipment' && SHIPMENT_STATUS_CONFIG[key]) {
      finalLabel = finalLabel || SHIPMENT_STATUS_CONFIG[key].label;
      finalTone = tone || SHIPMENT_STATUS_CONFIG[key].tone;
    } else if (type === 'user' && USER_STATUS_CONFIG[key]) {
      finalLabel = finalLabel || USER_STATUS_CONFIG[key].label;
      finalTone = tone || USER_STATUS_CONFIG[key].tone;
    } else if (type === 'ticket' && TICKET_STATUS_CONFIG[key]) {
      finalLabel = finalLabel || TICKET_STATUS_CONFIG[key].label;
      finalTone = tone || TICKET_STATUS_CONFIG[key].tone;
    } else {
      finalLabel = finalLabel || status;
    }
  }

  const { badge, dot } = TONE_CLASSES[finalTone] || TONE_CLASSES.neutral;
  const bgColor = TONE_BG[finalTone] || TONE_BG.neutral;
  const sizeCls = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded border ${badge} ${sizeCls} ${className}`}
      style={{ background: bgColor }}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />}
      <span>{finalLabel || status || '—'}</span>
    </span>
  );
}

export default StatusBadge;
