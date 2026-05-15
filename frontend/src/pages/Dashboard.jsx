import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/context';
import WeatherPanel from '../components/Dashboard/WeatherPanel';
import StressAlerts from '../components/Dashboard/StressAlerts';
import CropRecommendations from '../components/Dashboard/CropRecommendations';
import GroundQuality from '../components/Dashboard/GroundQuality';
import { farms, ndvi, weather, alerts, recommendations } from '../services/api';

export default function Dashboard() {
  const { t, isRTL } = useLanguage();
  const [farm, setFarm] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  const [alertList, setAlertList] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const farmList = await farms.list();
        if (!farmList?.length) { setLoading(false); return; }

        const currentFarm = farmList[0];
        setFarm(currentFarm);

        const [ndviResult, alertResult, recResult] = await Promise.allSettled([
          ndvi.get(currentFarm.id),
          alerts.list(currentFarm.id),
          recommendations.get(currentFarm.id),
        ]);

        if (ndviResult.status === 'fulfilled') setNdviData(ndviResult.value);
        if (alertResult.status === 'fulfilled') setAlertList(alertResult.value);
        if (recResult.status === 'fulfilled') setCrops(recResult.value);

        if (currentFarm.latitude && currentFarm.longitude) {
          const weatherResult = await weather.forecast(currentFarm.latitude, currentFarm.longitude);
          setForecast(weatherResult);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">{t('dashboard.loading')}</p>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">{t('dashboard.noFarm')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('dashboard.title')}</h1>
          <p className="text-gray-500 text-sm">{farm.name} &mdash; {t('dashboard.subtitle')}</p>
        </div>
        <span className="px-3 py-1 bg-farm-100 text-farm-700 rounded-full text-xs font-medium">
          {t('dashboard.lastUpdated')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GroundQuality ndviData={ndviData} />
        </div>
        <div>
          <StressAlerts alerts={alertList} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeatherPanel forecast={forecast} lat={farm.latitude} lon={farm.longitude} />
        <CropRecommendations crops={crops} />
      </div>
    </div>
  );
}
