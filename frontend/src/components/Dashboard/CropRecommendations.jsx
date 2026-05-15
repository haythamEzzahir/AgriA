import React from 'react';
import { useLanguage } from '../../i18n/context';

const emojis = {
  Tomatoes: '🍅', Peppers: '🫑', Corn: '🌽', Sunflowers: '🌻',
  Olives: '🫒', Argan: '🌿', Potatoes: '🥔', Carrots: '🥕',
};

export default function CropRecommendations({ crops }) {
  const { t } = useLanguage();

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-farm-100">
      <h3 className="font-semibold text-gray-800 mb-3">{t('dashboard.crops')}</h3>
      {!crops?.length ? (
        <p className="text-gray-400 text-sm">{t('dashboard.noData')}</p>
      ) : (
        <div className="space-y-2">
          {crops.map((crop, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-farm-50">
              <span className="text-xl">{emojis[crop.name] || '🌱'}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{crop.name}</span>
                  <span className="text-sm font-bold text-farm-600">{crop.match}%</span>
                </div>
                <p className="text-xs text-gray-400">{crop.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
