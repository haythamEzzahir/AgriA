import React from 'react';
import FarmMap from '../components/Map/FarmMap';
import NDVIOverlay from '../components/Map/NDVIOverlay';

export default function MapView() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Farm Map</h1>
      <p className="text-gray-600">Draw your farm polygon on the map to analyze vegetation health.</p>

      <div className="h-[600px] rounded-xl overflow-hidden shadow-lg border">
        <FarmMap />
      </div>

      <NDVIOverlay />
    </div>
  );
}
