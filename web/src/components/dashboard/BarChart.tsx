'use client';

interface BarChartProps {
  data: Array<{ date: string; revenue?: number; value?: number; orders?: number }>;
  color?: string;
  emptyText?: string;
}

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function BarChart({ data, color = '#10b981', emptyText = 'Chưa có dữ liệu' }: BarChartProps) {
  if (!data || data.length === 0) return (
    <div className="h-40 flex items-center justify-center text-xs text-slate-400">{emptyText}</div>
  );

  const getValue = (d: BarChartProps['data'][number]) =>
    typeof d.value === 'number' ? d.value : typeof d.revenue === 'number' ? d.revenue : (d.orders ?? 0);

  const max = Math.max(...data.map(getValue), 1);

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
          const dt = new Date(d.date);
          const label = isNaN(dt.getTime()) ? d.date : DAYS[dt.getDay()];
          return (
            <div key={i} className="flex-1 text-center text-[9px] text-slate-400 font-medium">{label}</div>
          );
        })}
      </div>
    </div>
  );
}
