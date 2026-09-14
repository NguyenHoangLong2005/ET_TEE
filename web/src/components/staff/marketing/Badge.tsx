'use client';

import { ReactNode } from 'react';

type Tone = 'gray' | 'green' | 'amber' | 'red' | 'sky' | 'violet' | 'rose';

const TONE_CLASSES: Record<Tone, string> = {
  gray:   'bg-slate-100 text-slate-700 ring-slate-200',
  green:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber:  'bg-amber-50 text-amber-700 ring-amber-200',
  red:    'bg-red-50 text-red-700 ring-red-200',
  sky:    'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  rose:   'bg-rose-50 text-rose-700 ring-rose-200',
};

export function Badge({ tone = 'gray', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11.5px] font-medium ring-1 ring-inset whitespace-nowrap',
      TONE_CLASSES[tone],
    ].join(' ')}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

export function statusTone(status?: string): Tone {
  switch (status) {
    case 'ACTIVE': return 'green';
    case 'PAUSED':
    case 'DRAFT':  return 'gray';
    case 'EXPIRED':
    case 'ENDED':  return 'red';
    default: return 'gray';
  }
}
