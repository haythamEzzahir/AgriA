import React from 'react';
import { useLanguage } from '../../i18n/context';

const recommended = [
  { name: '🍅', label: 'Tomatoes', match: 90, reason: 'High moisture + optimal temperature' },
  { name: '🫑', label: 'Peppers', match: 85, reason: 'Warm and moist conditions ideal' },
  { name: '🫒', label: 'Olives', match: 78, reason: 'Drought-resistant option available' },
];

export default function CropRecommendations() {
  const { t } = useLanguage();

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-farm-100">
      <h3 className="font-semibold text-gray-800 mb-3">{t('dashboard.crops')}</h3>
      <div className="space-y-2">
        {recommended.map((crop) => (
          <div key={crop.label} className="flex items-center gap-3 p-3 rounded-lg bg-farm-50">
            <span className="text-xl">{crop.name}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{crop.label}</span>
                <span className="text-sm font-bold text-farm-600">{crop.match}%</span>
              </div>
              <p className="text-xs text-gray-400">{crop.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
