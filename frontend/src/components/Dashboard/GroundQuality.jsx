import React from 'react';

const metrics = [
  { label: 'Soil moisture', value: '42%', tone: 'bg-blue-500' },
  { label: 'Vegetation health', value: '68%', tone: 'bg-emerald-500' },
  { label: 'Heat risk', value: 'Medium', tone: 'bg-amber-500' },
];

export default function GroundQuality() {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Ground Quality</h3>
        <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800">
          Live snapshot
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className={`mb-3 h-2 rounded-full ${metric.tone}`} />
            <p className="text-sm text-gray-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
