'use client';

interface BarChartProps {
  data: Array<{ date: string; revenue?: number; value?: number; orders?: number }>;
  color?: string;
  emptyText?: string;
  /** Appended to the value in the hover tooltip, e.g. ' ₫'. */
  valueSuffix?: string;
}

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function BarChart({ data, color = '#10b981', emptyText = 'Chưa có dữ liệu', valueSuffix = '' }: BarChartProps) {
  if (!data || data.length === 0) return (
    <div className="h-40 flex items-center justify-center text-xs text-slate-400">{emptyText}</div>
  );

  const getValue = (d: BarChartProps['data'][number]) =>
    typeof d.value === 'number' ? d.value : typeof d.revenue === 'number' ? d.revenue : (d.orders ?? 0);

  const max = Math.max(...data.map(getValue), 1);

  const pad = (n: number) => String(n).padStart(2, '0');
  // yyyy-MM = one bar per month; up to 7 bars = weekday names; more = dd/MM, thinned out to stay legible.
  const labelOf = (date: string): string => {
    if (/^\d{4}-\d{2}$/.test(date)) return `${date.slice(5)}/${date.slice(2, 4)}`;
    const dt = new Date(date);
    if (isNaN(dt.getTime())) return date;
    return data.length <= 7 ? DAYS[dt.getDay()] : `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`;
  };
  const fullLabelOf = (date: string): string => {
    if (/^\d{4}-\d{2}$/.test(date)) return `Tháng ${date.slice(5)}/${date.slice(0, 4)}`;
    const dt = new Date(date);
    return isNaN(dt.getTime()) ? date : dt.toLocaleDateString('vi-VN');
  };
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="relative h-40 w-full">
      <svg viewBox={`0 0 ${data.length * 40} 120`} className="w-full h-full" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1="0" y1={t * 100} x2={data.length * 40} y2={t * 100}
            stroke="#e5e7eb" strokeWidth="0.5" />
        ))}
        {data.map((d, i) => {
          const h = (getValue(d) / max) * 90;
          const x = i * 40 + 8;
          return (
            <g key={i}>
              <title>{`${fullLabelOf(d.date)}: ${getValue(d).toLocaleString('vi-VN')}${valueSuffix}`}</title>
              <rect x={i * 40} y={0} width={40} height={100} fill="transparent" />
              <rect x={x} y={100 - h} width={24} height={h}
                rx="3" fill={color} fillOpacity="0.15" />
              <rect x={x} y={100 - h} width={24} height={Math.min(h, 4)}
                rx="3" fill={color} />
            </g>
          );
        })}
      </svg>
      <div className="flex mt-1">
        {data.map((d, i) => {
          return (
            <div key={i} className="flex-1 text-center text-[9px] text-slate-400 font-medium whitespace-nowrap">
              {i % labelStep === 0 || i === data.length - 1 ? labelOf(d.date) : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
