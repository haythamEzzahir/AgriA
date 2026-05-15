import React from 'react';
import { useLanguage } from '../../i18n/context';

export default function StressAlerts({ alerts }) {
  const { t } = useLanguage();

  if (!alerts?.length) {
    return (
      <div className="bg-white p-5 rounded-xl shadow-sm border border-farm-100">
        <h3 className="font-semibold text-gray-800 mb-3">{t('dashboard.alerts')}</h3>
        <p className="text-gray-400 text-sm">{t('dashboard.noAlerts')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-farm-100">
      <h3 className="font-semibold text-gray-800 mb-3">{t('dashboard.alerts')}</h3>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className={`p-3 rounded-lg border text-sm ${
            alert.severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
            alert.severity === 'moderate' ? 'bg-amber-50 border-amber-200 text-amber-700' :
            'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{alert.type === 'water_stress' ? '💧' : alert.type === 'heat_stress' ? '🌡️' : '🌿'}</span>
              <span className="font-medium capitalize text-xs">{alert.type.replace('_', ' ')}</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                alert.severity === 'high' ? 'bg-red-200' : alert.severity === 'moderate' ? 'bg-amber-200' : 'bg-yellow-200'
              }`}>{alert.severity}</span>
            </div>
            <p className="text-xs">{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
