'use client';

import { useEffect, useState } from 'react';
import { Info, Ruler } from 'lucide-react';
import { SizeAdvisorService, SizeAdvice, CONFIDENCE_LABEL } from '@/lib/services/sizeAdvisorService';

/** "XXL" and "2XL" are the same size in different shops' notation. */
const norm = (s?: string | null) => (s ?? '').trim().toUpperCase().replace(/^XXL$/, '2XL').replace(/^XXXL$/, '3XL');

/**
 * Size advice next to the size picker, from the shopper's measurements (account profile, or typed in the
 * size calculator on this device):
 * - no measurements yet: an invitation that opens the size calculator,
 * - measurements: "Gợi ý cho bạn: L" (click selects it),
 * - a different size picked: a gentle note that the suggested size fits better (never blocks the cart).
 * `refreshKey` changes when the size calculator closes, so new measurements show up immediately.
 */
export default function SizeSuggestionChip({
  slug,
  onSelect,
  onOpenGuide,
  selectedSize,
  refreshKey,
}: {
  slug: string;
  onSelect: (size: string) => void;
  onOpenGuide: () => void;
  selectedSize?: string | null;
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

  if (advice?.reason === 'NEED_MEASUREMENTS') {
    return (
      <button
        type="button"
        onClick={onOpenGuide}
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded-full px-3 py-1.5 hover:border-slate-500 hover:bg-white"
      >
        <Ruler className="w-3.5 h-3.5" />
        Nhập chiều cao, cân nặng để được gợi ý size
      </button>
    );
  }

  if (!advice?.size) return null;

  const mismatch = !!selectedSize && norm(selectedSize) !== norm(advice.size);

  return (
    <div className="mb-3 space-y-2">
      <button
        type="button"
        onClick={() => onSelect(advice.size!)}
        title={[advice.confidence ? CONFIDENCE_LABEL[advice.confidence] : '', ...advice.reasons].filter(Boolean).join('\n')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100"
      >
        <Ruler className="w-3.5 h-3.5" />
        Gợi ý cho bạn: size {advice.size}
        {advice.confidence !== 'FITS' && <span className="font-medium text-emerald-700">(gần đúng)</span>}
        {!advice.bestInStock && advice.bestSize && (
          <span className="font-medium text-emerald-700">· size {advice.bestSize} đang hết</span>
        )}
      </button>
      {mismatch && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p>
              Bạn đang chọn size <strong>{selectedSize}</strong>, nhưng theo số đo của bạn{' '}
              <strong>size {advice.size}</strong> sẽ vừa hơn.{' '}
              <button type="button" onClick={() => onSelect(advice.size!)} className="font-semibold underline underline-offset-2">
                Đổi sang {advice.size}
              </button>
            </p>
            {advice.reasons.length > 0 && (
              <p className="mt-1 text-amber-800/80">{advice.reasons.slice(0, 2).join(' · ')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
