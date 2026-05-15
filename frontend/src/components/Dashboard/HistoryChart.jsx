import React, { useMemo } from 'react';

const W = 400;
const H = 160;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

export default function HistoryChart({ data, dataKey = 'ndvi', label = 'NDVI', color = '#22c55e' }) {
  const chart = useMemo(() => {
    if (!data?.length) return null;

    const values = data.map(d => d[dataKey]).filter(v => v != null);
    if (!values.length) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 0.1;
    const pad = range * 0.1;
    const yMin = Math.max(-1, min - pad);
    const yMax = Math.min(1, max + pad);

    const cw = W - PAD.left - PAD.right;
    const ch = H - PAD.top - PAD.bottom;

    const points = data
      .filter(d => d[dataKey] != null)
      .map((d, i) => ({
        x: PAD.left + (i / Math.max(data.length - 1, 1)) * cw,
        y: PAD.top + ch - ((d[dataKey] - yMin) / (yMax - yMin)) * ch,
        value: d[dataKey],
        label: d.date ? new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
      }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const yTicks = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const val = yMin + (yMax - yMin) * (i / tickCount);
      const y = PAD.top + ch - ((val - yMin) / (yMax - yMin)) * ch;
      yTicks.push({ y, label: val.toFixed(2) });
    }

    const xTicks = data
      .filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0)
      .map((d, i, arr) => ({
        x: PAD.left + (data.indexOf(d) / Math.max(data.length - 1, 1)) * cw,
        label: d.date ? new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
      }));

    return { pathD, points, yTicks, xTicks, yMin, yMax };
  }, [data, dataKey]);

  if (!chart) return null;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {chart.yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="#1a2b1e" strokeWidth="1" />
            <text x={PAD.left - 4} y={t.y + 3} textAnchor="end" fill="#6b7280" fontSize="9">{t.label}</text>
          </g>
        ))}

        {chart.xTicks.map((t, i) => (
          <text key={i} x={t.x} y={H - 4} textAnchor="middle" fill="#6b7280" fontSize="8">{t.label}</text>
        ))}

        <path d={chart.pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />

        <path d={`${chart.pathD} L${W - PAD.right},${H - PAD.bottom} L${PAD.left},${H - PAD.bottom} Z`} fill={`url(#grad-${dataKey})`} />

        {chart.points.filter((_, i) => i % Math.max(1, Math.floor(chart.points.length / 8)) === 0).map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2.5" fill={color} stroke="#0f1a12" strokeWidth="1" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#d1d5db" fontSize="8">{p.value.toFixed(2)}</text>
          </g>
        ))}
      </svg>
      <div className="text-[10px] text-agri-500 mt-1">{label} trend</div>
    </div>
  );
}
