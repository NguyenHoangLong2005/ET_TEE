'use client';

import { useEffect, useState } from 'react';
import { Ruler } from 'lucide-react';
import { SizeAdvisorService, SizeAdvice, CONFIDENCE_LABEL } from '@/lib/services/sizeAdvisorService';

/**
 * "Gợi ý cho bạn: L" next to the size picker, from measurements the shopper already gave us (account
 * profile, or typed in the size calculator on this device). Renders nothing until there are some.
 * `refreshKey` changes when the size calculator closes, so new measurements show up immediately.
 */
export default function SizeSuggestionChip({
  slug,
  onSelect,
  refreshKey,
}: {
  slug: string;
  onSelect: (size: string) => void;
  refreshKey: unknown;
}) {
  const [advice, setAdvice] = useState<SizeAdvice | null>(null);

  useEffect(() => {
    let cancelled = false;
    const saved = SizeAdvisorService.loadBody();
    SizeAdvisorService.forProduct(slug, saved ?? undefined).then(a => {
      if (!cancelled) setAdvice(a);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, refreshKey]);

  if (!advice?.size) return null;

  return (
    <button
      type="button"
      onClick={() => onSelect(advice.size!)}
      title={[advice.confidence ? CONFIDENCE_LABEL[advice.confidence] : '', ...advice.reasons].filter(Boolean).join('\n')}
      className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100"
    >
      <Ruler className="w-3.5 h-3.5" />
      Gợi ý cho bạn: size {advice.size}
      {advice.confidence !== 'FITS' && <span className="font-medium text-emerald-700">(gần đúng)</span>}
      {!advice.bestInStock && advice.bestSize && (
        <span className="font-medium text-emerald-700">· size {advice.bestSize} đang hết</span>
      )}
    </button>
  );
}
