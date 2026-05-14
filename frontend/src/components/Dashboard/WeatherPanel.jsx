import React, { useState, useEffect } from 'react';
import { weather as weatherApi } from '../../services/api';

export default function WeatherPanel() {
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        weatherApi.forecast(pos.coords.latitude, pos.coords.longitude)
          .then(setForecast)
          .catch(() => {});
      },
      () => {},
    );
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h3 className="font-semibold text-gray-800 mb-4">5-Day Weather Forecast</h3>

      {forecast.length === 0 ? (
        <p className="text-gray-400 text-sm">Enable location to see weather</p>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {forecast.map((day, i) => (
            <div key={i} className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">{new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}</p>
              <p className="text-lg font-bold">{Math.round(day.temp)}°C</p>
              <p className="text-xs text-gray-600 capitalize">{day.description}</p>
              <p className="text-xs text-blue-500">{Math.round(day.rain * 100)}% rain</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
