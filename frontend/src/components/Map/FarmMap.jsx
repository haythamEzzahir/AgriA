import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, ImageOverlay, Polygon, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';

function FitToPolygon({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length >= 3) {
      map.fitBounds(positions, { padding: [78, 78], maxZoom: 17, animate: true });
      setTimeout(() => map.invalidateSize(), 0);
    }
  }, [positions, map]);
  return null;
}

function buildPinIcon(name) {
  const safe = String(name || 'Farm').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  return L.divIcon({
    className: 'farm-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px">
        <div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #f8fafc;box-shadow:0 0 0 5px rgba(34,197,94,0.22)"></div>
        <div style="padding:3px 8px;background:rgba(2,6,23,0.85);border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:#f8fafc;font-size:11px;font-weight:600;white-space:nowrap;backdrop-filter:blur(4px)">${safe}</div>
      </div>`,
    iconSize: [200, 60],
    iconAnchor: [7, 30],
  });
}

export default function FarmMap({ farm, analysis, layer = 'ndvi', opacity = 0.7 }) {
  const polygonLatLngs = useMemo(() => {
    if (!farm?.polygon) return null;
    const coords = farm.polygon.type === 'Polygon'
      ? farm.polygon.coordinates?.[0]
      : farm.polygon.coordinates?.[0];
    if (!coords || coords.length < 3) return null;
    return coords.map(([lng, lat]) => [lat, lng]);
  }, [farm]);

  const heatmapUrl = analysis?.imagery?.heatmap?.[layer];
  const heatmapBbox = analysis?.imagery?.heatmap?.bbox;
  const heatmapBounds = heatmapBbox
    ? [[heatmapBbox[1], heatmapBbox[0]], [heatmapBbox[3], heatmapBbox[2]]]
    : null;

  const center = farm?.latitude
    ? [farm.latitude, farm.longitude]
    : polygonLatLngs?.[0] || [31.79, -7.09];

  const markerIcon = useMemo(() => buildPinIcon(farm?.name), [farm?.name]);

  return (
    <MapContainer
      center={center}
      zoom={15}
      minZoom={5}
      maxZoom={19}
      zoomControl={false}
      className="h-full w-full"
    >
      <ZoomControl position="topleft" />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
        maxZoom={19}
      />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
        opacity={0.15}
      />

      {polygonLatLngs && <FitToPolygon positions={polygonLatLngs} />}

      {heatmapUrl && heatmapBounds && (
        <ImageOverlay
          key={layer}
          url={heatmapUrl}
          bounds={heatmapBounds}
          opacity={opacity}
        />
      )}

      {polygonLatLngs && (
        <Polygon
          positions={polygonLatLngs}
          pathOptions={{
            color: '#f8fafc',
            fillColor: '#22c55e',
            fillOpacity: heatmapUrl ? 0 : 0.12,
            weight: 3,
            opacity: 1,
          }}
        />
      )}

      <Marker position={center} icon={markerIcon}>
        <Popup>
          <div style={{ minWidth: '160px' }}>
            <strong>{farm?.name}</strong>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
              {(farm?.crops || []).join(', ') || '—'}
            </div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
