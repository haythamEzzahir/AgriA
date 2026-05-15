import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, ImageOverlay, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';

function latLngToPixel(bbox, width, height, lat, lng) {
  const x = ((lng - bbox[0]) / (bbox[2] - bbox[0])) * width;
  const y = ((bbox[3] - lat) / (bbox[3] - bbox[1])) * height;
  return [x, y];
}

function PixelGridCanvas({ pixels, bbox, isVisible }) {
  const map = useMap();
  const canvasRef = useRef(null);
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

    for (const p of pixels) {
      const x = (p.lng - bbox[0]) * scaleX + padding;
      const y = (bbox[3] - p.lat) * scaleY + padding;
      const size = Math.max(2, scaleX * 0.0000898);

      const ndvi = p.ndvi ?? 0;
      let r, g, b;
      if (ndvi < 0) { r = 150 + Math.round(ndvi * 100); g = 50; b = 50; }
      else if (ndvi < 0.2) { r = 214 - Math.round(ndvi * 200); g = 96 + Math.round(ndvi * 400); b = 77; }
      else if (ndvi < 0.4) { r = 166 - Math.round((ndvi - 0.2) * 200); g = 217; b = 106 - Math.round((ndvi - 0.2) * 100); }
      else if (ndvi < 0.6) { r = 26 + Math.round((ndvi - 0.4) * 100); g = 152 + Math.round((ndvi - 0.4) * 150); b = 80 - Math.round((ndvi - 0.4) * 100); }
      else { r = 0; g = Math.min(200, 68 + Math.round((ndvi - 0.6) * 200)); b = 27; }

      ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r))},${Math.max(0, Math.min(255, g))},${Math.max(0, Math.min(255, b))})`;
      ctx.fillRect(x, y, Math.max(2, size - 0.5), Math.max(2, size - 0.5));
    }

    const imgUrl = canvas.toDataURL();
    const latLngBounds = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];

    if (overlayRef.current) map.removeLayer(overlayRef.current);
    overlayRef.current = L.imageOverlay(imgUrl, latLngBounds, { opacity: 0.8 }).addTo(map);

    return () => {
      if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
    };
  }, [pixels, bbox, isVisible, map]);

  return null;
}

function NDVILegend() {
  const stops = [
    { label: '< 0', color: '#963232' },
    { label: '0.2', color: '#c8a14d' },
    { label: '0.4', color: '#a6d96a' },
    { label: '0.6', color: '#1a9850' },
    { label: '0.8+', color: '#00441b' },
  ];
  return (
    <div className="flex items-center gap-1">
      {stops.map((s) => (
        <div key={s.label} className="flex items-center gap-0.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.color }} />
          <span className="text-[9px] text-agri-500">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function FarmSatelliteMap({ heatmapUrl, heatmapBbox, pixels, farmPolygon, farmCenter, satelliteDate }) {
  const [showPixels, setShowPixels] = useState(true);
  const [zoom, setZoom] = useState(14);

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
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          {heatmapUrl && (
            <ImageOverlay
              url={heatmapUrl}
              bounds={[[swLat, swLng], [neLat, neLng]]}
              opacity={0.7}
            />
          )}
          {polygonPositions && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{ color: '#22c55e', weight: 2, fill: false, dashArray: '6, 4' }}
            />
          )}
          <PixelGridCanvas pixels={showPixels ? pixels : null} bbox={heatmapBbox} isVisible={showPixels} />
        </MapContainer>
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 bg-agri-900/90 border-t border-agri-700 text-[10px]">
        <div className="flex items-center gap-3">
          <NDVILegend />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showPixels} onChange={(e) => setShowPixels(e.target.checked)} className="accent-agri-500 w-2.5 h-2.5" />
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
