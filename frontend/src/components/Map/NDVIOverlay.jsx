import React from 'react';
import { useLanguage } from '../../i18n/context';

export default function NDVIOverlay() {
  const { t } = useLanguage();

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-farm-100">
      <h3 className="font-semibold text-gray-800 mb-2">{t('map.ndviLegend')}</h3>
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded ndvi-high inline-block" /> {t('map.healthy')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded ndvi-moderate inline-block" /> {t('map.moderate')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded ndvi-low inline-block" /> {t('map.stressed')}
        </span>
      </div>
    </div>
  );
}
