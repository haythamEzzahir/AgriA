import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/context';
import { weather } from '../../services/api';

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function WeatherPanel({ forecast, lat, lon }) {
  const { t } = useLanguage();
  const [data, setData] = useState(forecast);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (forecast) {
      setData(forecast);
    } else if (lat && lon) {
      setLoading(true);
      weather.forecast(lat, lon)
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [forecast, lat, lon]);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-farm-100">
      <h3 className="font-semibold text-gray-800 mb-3">{t('dashboard.forecast')}</h3>
      {loading ? (
        <p className="text-gray-400 text-sm">{t('dashboard.loading')}</p>
      ) : !data ? (
        <p className="text-gray-400 text-sm">{t('dashboard.noData')}</p>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {data.map((day, i) => (
            <div key={i} className="text-center p-2 rounded-lg bg-farm-50">
              <p className="text-xs font-medium text-gray-500">{formatDate(day.date)}</p>
              <p className="text-lg font-bold my-1">{Math.round(day.temp)}°C</p>
              <p className="text-xs text-gray-400">{day.humidity}%</p>
              {day.rain != null && <p className="text-xs text-blue-500">{Math.round(day.rain * 100)}%</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
