'use client';

import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

/**
 * Enterprise Card
 *
 * Design Rules:
 * - White surface (#FFFFFF)
 * - 1px border (#E2E8F0)
 * - radius 12px
 * - flat shadow (no decorative shadow)
 * - No colored top stripe
 * - Header uses eyebrow-level typography
 */
export function Card({
  title,
  subtitle,
  action,
  footer,
  noPadding = false,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  ...props
}: CardProps) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.03)] ${className}`}
      {...props}
    >
      {hasHeader && (
        <div
          className={`px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${headerClassName}`}
        >
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-[15px] font-semibold text-slate-900 truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0 flex flex-wrap items-center gap-2">{action}</div>
          )}
        </div>
      )}

      <div className={`${noPadding ? '' : 'p-5 md:p-6'} ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div
          className={`px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between ${footerClassName}`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;
