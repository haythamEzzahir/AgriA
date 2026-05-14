import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';

function DrawPolygon({ onPolygon }) {
  const [positions, setPositions] = useState([]);

  useMapEvents({
    click(e) {
      const newPos = [...positions, [e.latlng.lat, e.latlng.lng]];
      setPositions(newPos);
      if (newPos.length >= 3) {
        onPolygon(newPos);
      }
    },
  });

  return positions.length > 0 ? (
    <Polygon positions={positions} pathOptions={{ color: '#22c55e', fillOpacity: 0.2 }} />
  ) : null;
}

export default function FarmMap() {
  const [polygon, setPolygon] = useState(null);
  const center = [31.7917, -7.0926];

  return (
    <MapContainer center={center} zoom={6} className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <DrawPolygon onPolygon={setPolygon} />
      {polygon && polygon.length >= 3 && (
        <Polygon positions={polygon} pathOptions={{ color: '#16a34a', fillOpacity: 0.3 }} />
      )}
    </MapContainer>
  );
}
