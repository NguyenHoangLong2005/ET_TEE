'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * ================================================================
 * ET.TEE ENTERPRISE DASHBOARD COMPONENTS
 * ================================================================
 *
 * DESIGN RULES:
 * 1. StatCard has NO decorative top stripes.
 * 2. Icons default to text-muted (#94A3B8).
 * 3. Icon only changes color when semantic meaning requires it.
 * 4. No rainbow multi-color cards.
 * 5. Metric values use JetBrains Mono (font-mono).
 * 6. Color is used ONLY to communicate semantic state.
 *
 * VALID semantic tones for StatCard icon:
 *   'success' = healthy, active, ok
 *   'warning' = near-threshold, pending, watch
 *   'danger'  = failed, error, locked, exceeded
 *   'info'    = neutral informational
 *   'default' = no semantic meaning needed → text-muted
 */

export type StatCardTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** Only use tone when there is real semantic state to communicate. Default = muted. */
  tone?: StatCardTone;
  /** Optional trend delta vs previous period */
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Context text below the metric value */
  subtitle?: string | React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  /**
   * @deprecated Use `tone` instead.
   * Legacy color prop: blue→default, green/success→success,
   * orange/warning→warning, red/danger→danger, purple/slate→default
   */
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'slate' | 'success' | 'warning' | 'danger' | 'info';
}

const TONE_ICON_STYLE: Record<StatCardTone, React.CSSProperties> = {
  default: { color: '#94A3B8' },
  success: { color: '#059669' },
  warning: { color: '#D97706' },
  danger:  { color: '#DC2626' },
  info:    { color: '#2563EB' },
};

function legacyColorToTone(color?: StatCardProps['color']): StatCardTone {
  if (!color) return 'default';
  const map: Record<string, StatCardTone> = {
    blue: 'default', green: 'success', success: 'success',
    orange: 'warning', warning: 'warning', red: 'danger',
    danger: 'danger', info: 'info', purple: 'default', slate: 'default',
  };
  return map[color] ?? 'default';
}

export function StatCard({
  title, value, icon: Icon, tone, trend, subtitle, badge, className = '', color,
}: StatCardProps) {
  const resolvedTone: StatCardTone = tone ?? legacyColorToTone(color);
  const iconStyle = TONE_ICON_STYLE[resolvedTone];

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 ${className}`}
      style={{ boxShadow: 'var(--shadow-flat, 0 1px 2px rgba(15,23,42,0.04))' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-[11px] font-bold text-slate-400 uppercase"
              style={{ letterSpacing: '0.06em' }}
            >
              {title}
            </p>
            {badge}
          </div>
        </div>
        <Icon className="w-4 h-4 shrink-0 mt-0.5" style={iconStyle} aria-hidden="true" />
      </div>

      <p
        className="text-2xl font-bold text-slate-900 leading-none"
        style={{ fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>

      {trend && (
        <div
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: trend.isPositive ? '#059669' : '#DC2626' }}
        >
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{trend.value}%</span>
          <span className="text-slate-400 font-normal">so với tuần trước</span>
        </div>
      )}

      {subtitle && (
        <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

/* ── Dashboard Card ── */

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  action?: { label: string; onClick?: () => void };
  className?: string;
  noPadding?: boolean;
}

export function DashboardCard({ title, children, action, className = '', noPadding }: DashboardCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}
      style={{ boxShadow: 'var(--shadow-flat)' }}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {action && (
          <button onClick={action.onClick} className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">
            {action.label}
          </button>
        )}
      </div>
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}

/* ── Page Header (legacy) ── */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

/* ── Data Table (legacy, kept for compatibility) ── */

interface DataTableProps<T> {
  columns: {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
  }[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function DataTable<T>({
  columns, data, keyExtractor, onRowClick,
  emptyMessage = 'Không có dữ liệu', isLoading,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#E2E8F0', borderTopColor: '#E50027' }} />
        <p className="text-xs text-slate-500">Đang tải...</p>
      </div>
    );
  }
  if (data.length === 0) {
    return <div className="py-12 text-center"><p className="text-xs text-slate-400">{emptyMessage}</p></div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th key={col.key} className="text-left text-[11px] font-bold text-slate-400 uppercase py-3 px-4" style={{ letterSpacing: '0.06em' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={keyExtractor(item)} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(item)}>
              {columns.map((col) => (
                <td key={col.key} className={`py-3.5 px-4 text-sm text-slate-700 ${col.className || ''}`}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Status Badge (legacy, semantic tokens) ── */

interface StatusBadgeProps {
  status: string;
  type?: 'success' | 'warning' | 'error' | 'info' | 'default';
}

const legacyStatusMap: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#ECFDF5', text: '#059669' }, COMPLETED: { bg: '#ECFDF5', text: '#059669' },
  DELIVERED: { bg: '#ECFDF5', text: '#059669' }, APPROVED: { bg: '#ECFDF5', text: '#059669' },
  SUCCESS: { bg: '#ECFDF5', text: '#059669' }, SENT: { bg: '#ECFDF5', text: '#059669' },
  PENDING: { bg: '#FFFBEB', text: '#D97706' }, PROCESSING: { bg: '#FFFBEB', text: '#D97706' },
  WAITING: { bg: '#FFFBEB', text: '#D97706' }, ON_HOLD: { bg: '#FFFBEB', text: '#D97706' },
  CANCELLED: { bg: '#FEF2F2', text: '#DC2626' }, REJECTED: { bg: '#FEF2F2', text: '#DC2626' },
  FAILED: { bg: '#FEF2F2', text: '#DC2626' }, EXPIRED: { bg: '#FEF2F2', text: '#DC2626' },
  SHIPPING: { bg: '#EFF6FF', text: '#2563EB' }, SHIPPED: { bg: '#EFF6FF', text: '#2563EB' },
  CONFIRMED: { bg: '#EFF6FF', text: '#2563EB' }, IN_PROGRESS: { bg: '#EFF6FF', text: '#2563EB' },
  INACTIVE: { bg: '#F8FAFC', text: '#64748B' }, DRAFT: { bg: '#F8FAFC', text: '#64748B' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = status.toUpperCase().replace(/\s+/g, '_');
  const style = legacyStatusMap[key] || { bg: '#F8FAFC', text: '#64748B' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border"
      style={{ background: style.bg, color: style.text, borderColor: style.text + '30' }}
    >
      {status}
    </span>
  );
}

/* ── Quick Action (legacy) ── */

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  color?: string;
}

export function QuickAction({ icon: Icon, label, onClick }: QuickActionProps) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900">
      <Icon className="w-4 h-4 text-slate-400" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
