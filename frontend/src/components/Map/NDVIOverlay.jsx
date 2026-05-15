import React from 'react';
import { useLanguage } from '../../i18n/context';

export default function NDVIOverlay() {
  const { t } = useLanguage();

  return (
    <div className="bg-agri-800 p-4 rounded-lg border border-agri-700">
      <h3 className="font-semibold text-sm text-agri-200 mb-2">{t('map.ndviLegend')}</h3>
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-agri-400 inline-block" /> {t('map.healthy')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-agri-500 inline-block" /> {t('map.moderate')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-agri-600 inline-block" /> {t('map.stressed')}
        </span>
      </div>
    </div>
  );
}
