import React from 'react';
import { useLanguage } from '../../i18n/context';

export default function GroundQuality({ ndviData }) {
  const { t } = useLanguage();

  const ndvi = ndviData?.ndvi;
  const soilMoisture = ndviData?.soil_moisture;

  const hydration = soilMoisture != null ? Math.round(soilMoisture * 100) : null;
  const vegetation = ndvi != null ? Math.round(ndvi * 100) : null;
  const stressLevel = ndvi != null ? Math.round((1 - ndvi) * 100) : null;

  const metrics = [
    { labelKey: 'hydration', value: hydration ?? 0, color: 'bg-blue-500', available: hydration != null },
    { labelKey: 'vegetation', value: vegetation ?? 0, color: 'bg-emerald-500', available: vegetation != null },
    { labelKey: 'stressLevel', value: stressLevel ?? 0, color: 'bg-red-500', available: stressLevel != null },
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-farm-100">
      <h3 className="font-semibold text-gray-800 mb-4">{t('dashboard.groundQuality')}</h3>
      {metrics.every((m) => !m.available) ? (
        <p className="text-gray-400 text-sm">{t('dashboard.noData')}</p>
      ) : (
        <div className="space-y-4">
          {metrics.map((m) => (
            <div key={m.labelKey}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t(`dashboard.${m.labelKey}`)}</span>
                <span className="font-medium">{m.available ? `${m.value}%` : 'N/A'}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${m.color} transition-all duration-500`}
                  style={{ width: `${m.available ? m.value : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
