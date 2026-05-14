import React from 'react';

const severityColors = {
  high: 'bg-red-50 border-red-200 text-red-800',
  moderate: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  low: 'bg-blue-50 border-blue-200 text-blue-800',
};

const icons = {
  water_stress: '💧',
  heat_stress: '🌡️',
  vegetation_decline: '🌿',
};

export default function StressAlerts({ alerts }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <h3 className="font-semibold text-gray-800 mb-4">Active Alerts</h3>

      {alerts.length === 0 ? (
        <p className="text-green-600 text-sm">✅ No active alerts</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <div key={i} className={`p-3 rounded-lg border ${severityColors[alert.severity]}`}>
              <div className="flex items-center gap-2">
                <span>{icons[alert.type] || '⚠️'}</span>
                <span className="font-medium text-sm capitalize">{alert.type.replace('_', ' ')}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  alert.severity === 'high' ? 'bg-red-200' : alert.severity === 'moderate' ? 'bg-yellow-200' : 'bg-blue-200'
                }`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-sm mt-1">{alert.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
