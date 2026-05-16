import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';

function polygonAreaHectares(coords) {
  const ring = coords[0];
  if (!ring || ring.length < 3) return 0;
  let areaDeg2 = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    areaDeg2 += lng1 * lat2 - lng2 * lat1;
  }
  areaDeg2 = Math.abs(areaDeg2) / 2;
  const avgLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const latRad = (avgLat * Math.PI) / 180;
  const mPerDegLng = 111320 * Math.cos(latRad);
  const mPerDegLat = 111320;
  return (areaDeg2 * mPerDegLng * mPerDegLat) / 10000;
}

// Dynamically load leaflet-draw CDN once per page
let drawLoaded = false;
let drawLoading = null;

function ensureLeafletDraw() {
  if (drawLoaded) return Promise.resolve();
  if (drawLoading) return drawLoading;
  drawLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
    script.onload = () => { drawLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return drawLoading;
}

function DrawControl({ onCreated, onEdited, onDeleted }) {
  const map = useMap();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.L = L;
    ensureLeafletDraw().then(() => {
      if (cancelled) return;
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      draw: {
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        rectangle: true,
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#22c55e', weight: 2 },
        },
      },
      edit: { featureGroup: drawnItems },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      const geojson = e.layer.toGeoJSON();
      if (geojson.geometry.type === 'Rectangle') {
        const coords = geojson.geometry.coordinates[0];
        geojson.geometry = { type: 'Polygon', coordinates: [[...coords, coords[0]]] };
      }
      if (geojson.geometry.coordinates[0].length >= 4) {
        onCreated(geojson.geometry);
      }
    });

    map.on(L.Draw.Event.EDITED, (e) => {
      const layers = e.layers.getLayers();
      if (layers.length > 0) {
        const geojson = layers[0].toGeoJSON();
        if (geojson.geometry.coordinates[0].length >= 4) {
          onEdited(geojson.geometry);
        }
      }
    });

    map.on(L.Draw.Event.DELETED, () => {
      onDeleted();
    });

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, ready, onCreated, onEdited, onDeleted]);

  return null;
}

export default function FarmDrawer({ onPolygonChange }) {
  const [geojson, setGeojson] = useState(null);
  const [area, setArea] = useState(0);
  const [pointCount, setPointCount] = useState(0);

  const notifyParent = useCallback((geom) => {
    const polygonGeojson = {
      type: 'Polygon',
      coordinates: geom.coordinates,
    };
    setGeojson(polygonGeojson);
    setArea(polygonAreaHectares(geom.coordinates));
    setPointCount(geom.coordinates[0].length);
    if (onPolygonChange) onPolygonChange(polygonGeojson);
  }, [onPolygonChange]);

  const handleCreated = useCallback((geom) => {
    notifyParent(geom);
  }, [notifyParent]);

  const handleEdited = useCallback((geom) => {
    notifyParent(geom);
  }, [notifyParent]);

  const handleDeleted = useCallback(() => {
    setGeojson(null);
    setArea(0);
    setPointCount(0);
    if (onPolygonChange) onPolygonChange(null);
  }, [onPolygonChange]);

  const leafletPositions = geojson
    ? geojson.coordinates[0].map(([lng, lat]) => [lat, lng])
    : [];

  return (
    <div className="w-full">
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden" style={{ height: '420px' }}>
        <MapContainer
          center={[31.7917, -7.0926]}
          zoom={6}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <DrawControl
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
          />
          {geojson && leafletPositions.length > 0 && (
            <Polygon
              positions={leafletPositions}
              pathOptions={{
                color: '#22c55e',
                fillColor: '#22c55e',
                fillOpacity: 0.25,
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex items-center justify-between mt-3 gap-3">
        <div className="text-sm text-gray-400">
          {!geojson && (
            <span>Use the toolbar to draw a rectangle or polygon around your farm</span>
          )}
          {geojson && (
            <span className="text-emerald-400">
              {pointCount} points · Area: <strong>{area.toFixed(2)} ha</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
