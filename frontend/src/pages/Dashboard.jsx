import React from 'react';
import { useLanguage } from '../i18n/context';
import WeatherPanel from '../components/Dashboard/WeatherPanel';
import StressAlerts from '../components/Dashboard/StressAlerts';
import CropRecommendations from '../components/Dashboard/CropRecommendations';
import GroundQuality from '../components/Dashboard/GroundQuality';

const alerts = [
  { type: 'water_stress', severity: 'moderate', message: 'Soil moisture low in zone A. Consider irrigation within 48h.' },
  { type: 'heat_stress', severity: 'low', message: 'Temperature rising above 35°C expected tomorrow.' },
];

export default function Dashboard() {
  const { t, isRTL } = useLanguage();

  return (
    <div className="space-y-6 pb-20 md:pb-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('dashboard.title')}</h1>
          <p className="text-gray-500 text-sm">{t('dashboard.subtitle')}</p>
        </div>
        <span className="px-3 py-1 bg-farm-100 text-farm-700 rounded-full text-xs font-medium">
          {t('dashboard.lastUpdated')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GroundQuality />
        </div>
        <div>
          <StressAlerts alerts={alerts} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeatherPanel />
        <CropRecommendations />
      </div>
    </div>
  );
}
