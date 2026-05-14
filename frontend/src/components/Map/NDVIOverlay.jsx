import React from 'react';

export default function NDVIOverlay() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border">
      <h3 className="font-semibold text-gray-800 mb-2">NDVI Legend</h3>
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded ndvi-high inline-block" /> Healthy (&gt;0.5)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded ndvi-moderate inline-block" /> Moderate (0.2–0.5)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded ndvi-low inline-block" /> Stressed (&lt;0.2)
        </span>
      </div>
    </div>
  );
}
