'use client';

import { ReactNode } from 'react';

type Tone = 'gray' | 'green' | 'amber' | 'red' | 'sky' | 'violet' | 'rose';

// Semantic enterprise color tokens:
//   gray   → neutral surface
//   green  → success  (#059669 / #ECFDF5)
//   amber  → warning  (#D97706 / #FFFBEB)
//   red    → error    (#DC2626 / #FEF2F2)
//   sky    → info     (#2563EB / #EFF6FF)
//   violet → accent (closest neutral-purple kept for variety)
//   rose   → primary  (#E50027 / #F9E2E5)
const TONE_CLASSES: Record<Tone, string> = {
  gray:   'bg-slate-100 text-slate-700 ring-slate-200',
  green:  'bg-[#ECFDF5] text-[#059669] ring-[#A7F3D0]',
  amber:  'bg-[#FFFBEB] text-[#D97706] ring-[#FDE68A]',
  red:    'bg-[#FEF2F2] text-[#DC2626] ring-[#FECACA]',
  sky:    'bg-[#EFF6FF] text-[#2563EB] ring-[#BFDBFE]',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  rose:   'bg-[#F9E2E5] text-[#BD001F] ring-[#FBCDD3]',
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
