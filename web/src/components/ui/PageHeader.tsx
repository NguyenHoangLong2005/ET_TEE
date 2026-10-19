'use client';

import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[]; // Ignored, as global header handles this
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Enterprise Page Header
 * Renders cleanly on the page without duplicate breadcrumbs.
 */
export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${className}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[26px]">{title}</h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
