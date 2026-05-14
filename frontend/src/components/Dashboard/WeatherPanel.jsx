import React from 'react';
import { useLanguage } from '../../i18n/context';

const mockForecast = [
  { date: 'Mon', temp: 32, humidity: 45, rain: 0.1 },
  { date: 'Tue', temp: 34, humidity: 40, rain: 0.05 },
  { date: 'Wed', temp: 36, humidity: 35, rain: 0 },
  { date: 'Thu', temp: 33, humidity: 42, rain: 0.2 },
  { date: 'Fri', temp: 31, humidity: 48, rain: 0.3 },
];

export default function WeatherPanel() {
  const { t } = useLanguage();

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-farm-100">
      <h3 className="font-semibold text-gray-800 mb-3">{t('dashboard.forecast')}</h3>
      <div className="grid grid-cols-5 gap-2">
        {mockForecast.map((day) => (
          <div key={day.date} className="text-center p-2 rounded-lg bg-farm-50">
            <p className="text-xs font-medium text-gray-500">{day.date}</p>
            <p className="text-lg font-bold my-1">{day.temp}°C</p>
            <p className="text-xs text-gray-400">{day.humidity}% RH</p>
          </div>
        ))}
      </div>
    </div>
  );
}
