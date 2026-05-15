import React from 'react';
import { useLanguage } from '../i18n/context';
import FarmMap from '../components/Map/FarmMap';
import NDVIOverlay from '../components/Map/NDVIOverlay';

export default function MapView() {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-agri-50">{t('map.title')}</h1>
      <p className="text-agri-500 text-xs">{t('map.subtitle')}</p>
      <div className="h-[500px] rounded-lg overflow-hidden border border-agri-700">
        <FarmMap />
      </div>
      <NDVIOverlay />
    </div>
  );
}
