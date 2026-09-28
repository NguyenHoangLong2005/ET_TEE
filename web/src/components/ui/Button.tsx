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
    'text-white font-semibold shadow-sm focus:ring-2 focus:ring-offset-1',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 font-semibold shadow-sm focus:ring-2 focus:ring-slate-900/30 focus:ring-offset-1',
  danger:
    'text-white font-semibold shadow-sm focus:ring-2 focus:ring-offset-1',
  outline:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-medium focus:ring-2 focus:ring-slate-200 focus:ring-offset-1',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium focus:ring-2 focus:ring-slate-200 focus:ring-offset-1',
};

// Inline styles for brand-specific colors (avoids Tailwind purge issues with dynamic colors)
const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: '#E50027',
  },
  secondary: {},
  danger: {
    background: '#DC2626',
  },
  outline: {},
  ghost: {},
};

const VARIANT_HOVER_STYLES: Record<ButtonVariant, string> = {
  primary:   'hover:opacity-90',
  secondary: '',
  danger:    'hover:opacity-90',
  outline:   '',
  ghost:     '',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-lg gap-2',
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
          inline-flex items-center justify-center transition-all duration-150 outline-none select-none
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          ${VARIANT_CLASSES[variant]}
          ${VARIANT_HOVER_STYLES[variant]}
          ${SIZE_CLASSES[size]}
          ${className}
        `}
        style={{ ...VARIANT_STYLES[variant], ...style }}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
