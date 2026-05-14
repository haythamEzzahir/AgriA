import React, { useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

export default function FarmMap() {
  const [polygon, setPolygon] = useState(null);

  const onCreated = (e) => {
    setPolygon(e.layer.getLatLngs());
  };

  return (
    <MapContainer center={[31.5, -7.0]} zoom={7} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={onCreated}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
            marker: false,
            polyline: false,
          }}
        />
      </FeatureGroup>

      {polygon && (
        <TileLayer
          url={`https://tiles.agromonitoring.com/agro/{z}/{x}/{y}?appid=DEMO_KEY`}
          opacity={0.6}
        />
      )}
    </MapContainer>
  );
}
