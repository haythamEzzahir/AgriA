import React, { useState, useEffect } from 'react';
import WeatherPanel from '../components/Dashboard/WeatherPanel';
import StressAlerts from '../components/Dashboard/StressAlerts';
import CropRecommendations from '../components/Dashboard/CropRecommendations';
import GroundQuality from '../components/Dashboard/GroundQuality';

export default function Dashboard() {
  const [alerts] = useState([
    { type: 'water_stress', severity: 'high', message: 'Water Stress Detected: Low soil moisture in zone A' },
    { type: 'heat_stress', severity: 'moderate', message: 'Heat Risk Moderate: Temperature rising above 35°C' },
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Farm Dashboard</h1>

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
