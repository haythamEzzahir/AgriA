import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, ImageOverlay, Polygon, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';

const INDEX_STOPS = {
  ndvi: [
    { v: -1.0, c: [103, 0, 13] },
    { v: -0.5, c: [178, 24, 43] },
    { v: -0.2, c: [214, 96, 77] },
    { v: 0.0, c: [255, 255, 191] },
    { v: 0.2, c: [166, 217, 106] },
    { v: 0.5, c: [26, 152, 80] },
    { v: 1.0, c: [0, 68, 27] },
  ],
  ndwi: [
    { v: -1.0, c: [84, 48, 5] },
    { v: -0.5, c: [165, 129, 0] },
    { v: -0.2, c: [214, 196, 138] },
    { v: 0.0, c: [255, 255, 255] },
    { v: 0.2, c: [174, 214, 241] },
    { v: 0.5, c: [65, 143, 216] },
    { v: 1.0, c: [8, 48, 107] },
  ],
};

function valueToRgb(value, stops) {
  if (value == null || Number.isNaN(value)) return null;
  if (value <= stops[0].v) return stops[0].c;
  if (value >= stops[stops.length - 1].v) return stops[stops.length - 1].c;
  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i].v && value < stops[i + 1].v) {
      const t = (value - stops[i].v) / (stops[i + 1].v - stops[i].v);
      return [
        Math.round(stops[i].c[0] + t * (stops[i + 1].c[0] - stops[i].c[0])),
        Math.round(stops[i].c[1] + t * (stops[i + 1].c[1] - stops[i].c[1])),
        Math.round(stops[i].c[2] + t * (stops[i + 1].c[2] - stops[i].c[2])),
      ];
    }
  }
  return stops[stops.length - 1].c;
}

function FitToPolygon({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length >= 3) {
      map.fitBounds(positions, { padding: [24, 24], maxZoom: 18, animate: true });
    }
  }, [positions, map]);
  return null;
}

function PixelGridCanvas({ pixels, bbox, isVisible, indexMode }) {
  const map = useMap();
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!pixels?.length || !bbox || !isVisible) {
      if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
      return;
    }

    const canvas = document.createElement('canvas');
    const padding = 5;
    const pxPerMeter = 10 * map.getZoom() * 0.3;
    const lngSpan = bbox[2] - bbox[0];
    const latSpan = bbox[3] - bbox[1];
    const imgW = Math.max(200, Math.round(lngSpan * pxPerMeter));
    const imgH = Math.max(200, Math.round(latSpan * pxPerMeter));
    canvas.width = imgW + padding * 2;
    canvas.height = imgH + padding * 2;
    const ctx = canvas.getContext('2d');

    const scaleX = imgW / lngSpan;
    const scaleY = imgH / latSpan;
    const stops = INDEX_STOPS[indexMode];

    for (const p of pixels) {
      const value = p[indexMode];
      const rgb = valueToRgb(value, stops);
      if (!rgb) continue;

      const x = (p.lng - bbox[0]) * scaleX + padding;
      const y = (bbox[3] - p.lat) * scaleY + padding;
      const size = Math.max(2, scaleX * 0.0000898);

      ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      ctx.fillRect(x, y, Math.max(2, size - 0.5), Math.max(2, size - 0.5));
    }

    const imgUrl = canvas.toDataURL();
    const latLngBounds = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];

    if (overlayRef.current) map.removeLayer(overlayRef.current);
    overlayRef.current = L.imageOverlay(imgUrl, latLngBounds, { opacity: 0.8 }).addTo(map);

    return () => {
      if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
    };
  }, [pixels, bbox, isVisible, indexMode, map]);

  return null;
}

function IndexLegend({ mode }) {
  const stops = mode === 'ndwi'
    ? [
        { v: -0.4, label: 'Dry' },
        { v: -0.1, label: '−0.1' },
        { v: 0.1, label: '0.1' },
        { v: 0.4, label: 'Wet' },
      ]
    : [
        { v: 0.0, label: '0' },
        { v: 0.3, label: '0.3' },
        { v: 0.5, label: '0.5' },
        { v: 0.8, label: '0.8+' },
      ];
  return (
    <div className="flex items-center gap-1">
      {stops.map((s) => {
        const c = valueToRgb(s.v, INDEX_STOPS[mode]);
        return (
          <div key={s.label} className="flex items-center gap-0.5">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ background: `rgb(${c[0]},${c[1]},${c[2]})` }}
            />
            <span className="text-[9px] text-agri-500">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function IndexToggle({ mode, onChange }) {
  return (
    <div className="flex bg-agri-900 rounded overflow-hidden border border-agri-700">
      {['ndvi', 'ndwi'].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition ${
            mode === m
              ? 'bg-agri-600 text-agri-100'
              : 'text-agri-500 hover:text-agri-300'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

export default function FarmSatelliteMap({ heatmapUrls, pixels, farmPolygon, farmCenter, satelliteDate }) {
  const [showPixels, setShowPixels] = useState(true);
  const [indexMode, setIndexMode] = useState('ndvi');
  const [zoom] = useState(14);

  const heatmapUrl = heatmapUrls?.[indexMode];
  const heatmapBbox = heatmapUrls?.bbox;

  const center = farmCenter || [31.79, -7.09];
  const swLat = heatmapBbox?.[1] ?? center[0] - 0.005;
  const swLng = heatmapBbox?.[0] ?? center[1] - 0.005;
  const neLat = heatmapBbox?.[3] ?? center[0] + 0.005;
  const neLng = heatmapBbox?.[2] ?? center[1] + 0.005;

  const polygonPositions = useMemo(() => {
    if (!farmPolygon) return null;
    const coords = farmPolygon.type === 'Polygon'
      ? farmPolygon.coordinates[0]
      : farmPolygon.coordinates?.[0] || [];
    return coords.map(([lng, lat]) => [lat, lng]);
  }, [farmPolygon]);

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute top-2 left-2 z-[1000] shadow-lg shadow-black/30 rounded">
          <IndexToggle mode={indexMode} onChange={setIndexMode} />
        </div>
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-full w-full"
          zoomControl={false}
        >
          <ZoomControl position="topright" />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          {heatmapUrl && (
            <ImageOverlay
              key={indexMode}
              url={heatmapUrl}
              bounds={[[swLat, swLng], [neLat, neLng]]}
              opacity={0.7}
            />
          )}
          {polygonPositions && (
            <>
              <FitToPolygon positions={polygonPositions} />
              <Polygon
                positions={polygonPositions}
                pathOptions={{ color: '#22c55e', weight: 2, fill: false, dashArray: '6, 4' }}
              />
            </>
          )}
          <PixelGridCanvas
            pixels={showPixels ? pixels : null}
            bbox={heatmapBbox}
            isVisible={showPixels}
            indexMode={indexMode}
          />
        </MapContainer>
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 bg-agri-900/90 border-t border-agri-700 text-[10px]">
        <div className="flex items-center gap-3">
          <IndexLegend mode={indexMode} />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showPixels}
              onChange={(e) => setShowPixels(e.target.checked)}
              className="accent-agri-500 w-2.5 h-2.5"
            />
            <span className="text-agri-500">10m pixels</span>
          </label>
          {satelliteDate && (
            <span className="text-agri-600">🛰️ {new Date(satelliteDate).toLocaleDateString()}</span>
          )}
          <span className="text-agri-600">{pixels?.length || 0} pixels</span>
        </div>
      </div>
    </div>
  );
}
