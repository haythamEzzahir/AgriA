import React from 'react';

const STATUS_COLORS = {
  critical: { fill: '#ef444480', border: '#ef4444', text: '#ef4444' },
  stressed: { fill: '#f9731680', border: '#f97316', text: '#f97316' },
  moderate: { fill: '#eab30880', border: '#eab308', text: '#eab308' },
  healthy: { fill: '#22c55e80', border: '#22c55e', text: '#22c55e' },
};

const ZONES_CONFIG = [
  { id: 'A', pos: 'NW', row: 0, col: 0 },
  { id: 'B', pos: 'N', row: 0, col: 1 },
  { id: 'C', pos: 'NE', row: 0, col: 2 },
  { id: 'D', pos: 'W', row: 1, col: 0 },
  { id: 'E', pos: 'Center', row: 1, col: 1 },
  { id: 'F', pos: 'E', row: 1, col: 2 },
  { id: 'G', pos: 'SW', row: 2, col: 0 },
  { id: 'H', pos: 'S', row: 2, col: 1 },
  { id: 'I', pos: 'SE', row: 2, col: 2 },
];

export default function ZoneGridMap({ zones, heatmapUrl }) {
  const zoneMap = {};
  if (zones) {
    for (const z of zones) zoneMap[z.zone_id] = z;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-agri-900/50">
      {heatmapUrl ? (
        <img
          src={heatmapUrl}
          alt="NDVI Heatmap"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #1a2b1e 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #1a2b1e 40px)',
        }} />
      )}

      <svg className="relative w-full h-full max-w-[90%] max-h-[90%]" viewBox="0 0 300 300">
        {ZONES_CONFIG.map((cfg) => {
          const zone = zoneMap[cfg.id];
          const colors = zone ? (STATUS_COLORS[zone.status] || STATUS_COLORS.healthy) : null;
          const x = cfg.col * 100;
          const y = cfg.row * 100;

          return (
            <g key={cfg.id}>
              {colors && (
                <rect x={x} y={y} width={100} height={100}
                  fill={colors.fill} stroke={colors.border} strokeWidth={2} rx={4}
                />
              )}
              <line x1={0} y1={100} x2={300} y2={100} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <line x1={0} y1={200} x2={300} y2={200} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <line x1={100} y1={0} x2={100} y2={300} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <line x1={200} y1={0} x2={200} y2={300} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <text x={x + 50} y={y + 38} textAnchor="middle" fill={colors?.text || '#888'}
                fontSize="20" fontWeight="bold" fontFamily="monospace">
                {cfg.id}
              </text>
              <text x={x + 50} y={y + 55} textAnchor="middle" fill="rgba(255,255,255,0.4)"
                fontSize="9" fontFamily="sans-serif">
                {cfg.pos}
              </text>
              {zone?.metrics?.ndvi_mean != null && (
                <text x={x + 50} y={y + 80} textAnchor="middle" fill="rgba(255,255,255,0.6)"
                  fontSize="9" fontFamily="monospace">
                  NDVI {zone.metrics.ndvi_mean.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {!zones && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-agri-500 text-sm">Run satellite analysis to view zone map</p>
        </div>
      )}
    </div>
  );
}
