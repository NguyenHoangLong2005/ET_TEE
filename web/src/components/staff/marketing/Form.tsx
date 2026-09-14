'use client';

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

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

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900',
        'placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10',
        props.className || '',
      ].join(' ')}
    />
  );
}

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="number"
      className={[
        'mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900',
        'placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10',
        props.className || '',
      ].join(' ')}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        'mt-1.5 w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900',
        'focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10',
        props.className || '',
      ].join(' ')}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        'mt-1.5 w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-[13px] text-slate-900',
        'placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10',
        'resize-y',
        props.className || '',
      ].join(' ')}
    />
  );
}

export function FormRow({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const grid = cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return <div className={`grid gap-4 ${grid}`}>{children}</div>;
}
