import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Shared heading row for storefront sections. Each home section used to style its own title
 * (text-2xl to text-4xl, with/without an underline bar) and its own "Xem tất cả" link, so the
 * page read as four different designs stacked on top of each other.
 */
export default function SectionHeader({
  title,
  subtitle,
  viewAllLink,
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllLink?: string;
  /** Extra controls on the right, e.g. carousel arrows. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
      <div className="min-w-0">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500 mt-1">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {viewAllLink ? (
          <Link
            href={viewAllLink}
            className="group inline-flex items-center gap-1 text-xs md:text-sm font-bold uppercase tracking-wider text-slate-600 hover:text-primary transition-colors"
          >
            Xem tất cả
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/** Round prev/next button used by the product carousels. */
export function CarouselArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Xem sản phẩm trước' : 'Xem sản phẩm tiếp'}
      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
        disabled
          ? 'border-slate-100 text-slate-300 cursor-not-allowed'
          : 'border-slate-300 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900'
      }`}
    >
      {direction === 'left' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>
  );
}
