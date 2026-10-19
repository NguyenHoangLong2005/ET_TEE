'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

/**
 * Enterprise Button — Design System
 *
 * PRIMARY   = ET.TEE brand action (#E50027)
 * SECONDARY = neutral dark
 * DANGER    = destructive/delete (#DC2626) — DISTINCT from primary
 * OUTLINE   = bordered secondary
 * GHOST     = transparent text action
 *
 * Rule: primary ≠ danger. Do NOT use primary for delete actions.
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-700 active:bg-primary-800 font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 font-semibold shadow-[0_1px_2px_rgba(16,24,40,0.08)] focus-visible:ring-2 focus-visible:ring-slate-900/30 focus-visible:ring-offset-1',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-red-600/30 focus-visible:ring-offset-1',
  outline:
    'bg-white text-slate-700 border border-slate-200 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 font-medium focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-1',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-1',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-lg gap-2',
  lg: 'h-11 px-5 text-sm rounded-xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      iconRight,
      children,
      className = '',
      type = 'button',
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all duration-150 outline-none select-none
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          ${VARIANT_CLASSES[variant]}
          ${SIZE_CLASSES[size]}
          ${className}
        `}
        style={style}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {/* inline-flex: many callers pass an icon inside children; svg is display:block (preflight),
            so in a plain span it sat on its own line above the label. */}
        {children && <span className="inline-flex items-center gap-1.5">{children}</span>}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
