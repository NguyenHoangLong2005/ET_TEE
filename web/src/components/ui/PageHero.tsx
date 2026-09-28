import React from 'react';

interface PageHeroProps {
  badge?: string;
  badgeText?: string;
  title: string;
  description?: string;
  subtitle?: string;
}

export default function PageHero({ badge, badgeText, title, description, subtitle }: PageHeroProps) {
  const displayBadge = badge || badgeText;
  const displayDesc = description || subtitle;

  return (
    <div className="bg-white text-slate-900 p-8 md:p-12 rounded-3xl mb-10 shadow-md relative overflow-hidden border border-slate-200/80">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 max-w-2xl">
        {displayBadge && (
          <span className="inline-block px-3.5 py-1 bg-amber-50 text-amber-900 text-xs font-bold uppercase tracking-widest rounded-full mb-4 border border-amber-200">
            {displayBadge}
          </span>
        )}
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900 mb-4">
          {title}
        </h1>
        {displayDesc && (
          <p className="text-sm text-slate-600 leading-relaxed">{displayDesc}</p>
        )}
      </div>
    </div>
  );
}

