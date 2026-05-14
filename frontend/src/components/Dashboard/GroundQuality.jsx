import React from 'react';
import { useLanguage } from '../../i18n/context';

const metrics = [
  { labelKey: 'hydration', value: 45, color: 'bg-blue-500' },
  { labelKey: 'vegetation', value: 62, color: 'bg-emerald-500' },
  { labelKey: 'stressLevel', value: 28, color: 'bg-red-500' },
];

export default function GroundQuality() {
  const { t } = useLanguage();

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-farm-100">
      <h3 className="font-semibold text-gray-800 mb-4">{t('dashboard.groundQuality')}</h3>
      <div className="space-y-4">
        {metrics.map((m) => (
          <div key={m.labelKey}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{t(`dashboard.${m.labelKey}`)}</span>
              <span className="font-medium">{m.value}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${m.color}`} style={{ width: `${m.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
