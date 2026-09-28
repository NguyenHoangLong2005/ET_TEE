'use client';

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, useState } from 'react';

export function FieldLabel({ children, hint, required }: { children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-medium text-slate-700">
        {children}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </span>
      {hint ? <span className="block mt-0.5 text-[11.5px] text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ onFocus, onBlur, style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        borderColor: focused ? '#E50027' : undefined,
        boxShadow: focused ? '0 0 0 3px rgba(229,0,39,0.08)' : undefined,
        ...style,
      }}
      className={[
        'mt-1.5 w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900',
        'placeholder:text-slate-400 outline-none transition-shadow',
        props.className || '',
      ].join(' ')}
      onFocus={e => { setFocused(true); onFocus?.(e); }}
      onBlur={e => { setFocused(false); onBlur?.(e); }}
    />
  );
}

export function NumberInput({ onFocus, onBlur, style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      type="number"
      style={{
        borderColor: focused ? '#E50027' : undefined,
        boxShadow: focused ? '0 0 0 3px rgba(229,0,39,0.08)' : undefined,
        ...style,
      }}
      className={[
        'mt-1.5 w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900',
        'placeholder:text-slate-400 outline-none transition-shadow',
        props.className || '',
      ].join(' ')}
      onFocus={e => { setFocused(true); onFocus?.(e); }}
      onBlur={e => { setFocused(false); onBlur?.(e); }}
    />
  );
}

export function SelectInput({ onFocus, onBlur, style, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        borderColor: focused ? '#E50027' : undefined,
        boxShadow: focused ? '0 0 0 3px rgba(229,0,39,0.08)' : undefined,
        ...style,
      }}
      className={[
        'mt-1.5 w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900',
        'outline-none transition-shadow',
        props.className || '',
      ].join(' ')}
      onFocus={e => { setFocused(true); onFocus?.(e); }}
      onBlur={e => { setFocused(false); onBlur?.(e); }}
    />
  );
}

export function TextArea({ onFocus, onBlur, style, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      style={{
        borderColor: focused ? '#E50027' : undefined,
        boxShadow: focused ? '0 0 0 3px rgba(229,0,39,0.08)' : undefined,
        ...style,
      }}
      className={[
        'mt-1.5 w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900',
        'placeholder:text-slate-400 outline-none transition-shadow',
        'resize-y',
        props.className || '',
      ].join(' ')}
      onFocus={e => { setFocused(true); onFocus?.(e); }}
      onBlur={e => { setFocused(false); onBlur?.(e); }}
    />
  );
}

export function FormRow({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const grid = cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return <div className={`grid gap-4 ${grid}`}>{children}</div>;
}
