import React from 'react';
import { useLanguage } from '../i18n/context';
import FarmMap from '../components/Map/FarmMap';
import NDVIOverlay from '../components/Map/NDVIOverlay';

export default function MapView() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('map.title')}</h1>
      <p className="text-gray-500 text-sm">{t('map.subtitle')}</p>

      <div className="h-[500px] rounded-xl overflow-hidden shadow-sm border">
        <FarmMap />
      </div>

      <NDVIOverlay />
    </div>
  );
}
