import { config } from '../config/index.js';
import { fromArrayBuffer } from 'geotiff';

const TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const PROCESS_URL = 'https://sh.dataspace.copernicus.eu/api/v1/process';
const STAC_URL = 'https://stac.dataspace.copernicus.eu/v1/search';

async function getToken() {
  const params = new URLSearchParams({
    client_id: config.copernicus.clientId,
    client_secret: config.copernicus.clientSecret,
    grant_type: 'client_credentials',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!res.ok) throw new Error(`Copernicus auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function searchBestScene(token, bbox, daysBack) {
  const now = new Date();
  const start = new Date(now.getTime() - daysBack * 86400000);

  const params = new URLSearchParams({
    collections: 'sentinel-2-l2a',
    bbox: bbox.join(','),
    datetime: `${start.toISOString()}/${now.toISOString()}`,
    limit: '50',
    fields: '+properties.datetime,+properties.eo:cloud_cover',
  });

  const res = await fetch(`${STAC_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`STAC search failed: ${res.status}`);
  const data = await res.json();

  const features = data.features || [];
  const filtered = features
    .filter(f => (f.properties['eo:cloud_cover'] ?? 100) <= 30)
    .sort((a, b) => (a.properties['eo:cloud_cover'] ?? 100) - (b.properties['eo:cloud_cover'] ?? 100));

  if (!filtered.length) return null;
  const best = filtered[0];
  return {
    datetime: best.properties.datetime,
    cloudCover: best.properties['eo:cloud_cover'],
  };
}

const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "B11"], units: "REFLECTANCE" }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "ndwi", bands: 1, sampleType: "FLOAT32" },
    ],
  };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  let ndwi = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);
  return { ndvi: [ndvi], ndwi: [ndwi] };
}`;

async function fetchIndices(token, bbox, sceneDatetime) {
  const sceneDate = new Date(sceneDatetime);
  const dateFrom = new Date(sceneDate.getTime() - 2 * 86400000).toISOString().split('T')[0];
  const dateTo = new Date(sceneDate.getTime() + 2 * 86400000).toISOString().split('T')[0];

  const lngRange = bbox[2] - bbox[0];
  const latRange = bbox[3] - bbox[1];
  const width = Math.max(32, Math.round(lngRange / 0.0000898));
  const height = Math.max(32, Math.round(latRange / 0.0000898));

  const body = {
    input: {
      bounds: {
        properties: { crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84' },
        bbox: bbox,
      },
      data: [{
        type: 'sentinel-2-l2a',
        dataFilter: {
          timeRange: { from: `${dateFrom}T00:00:00Z`, to: `${dateTo}T23:59:59Z` },
        },
      }],
    },
    output: {
      width, height,
      responses: [
        { identifier: 'ndvi', format: { type: 'image/tiff' } },
        { identifier: 'ndwi', format: { type: 'image/tiff' } },
      ],
    },
    evalscript: EVALSCRIPT,
  };

  const res = await fetch(PROCESS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/tar',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Process API failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const tarBuffer = Buffer.from(await res.arrayBuffer());

  const { default: tar } = await import('tar-stream');
  const extract = tar.extract();
  const files = {};

  return new Promise((resolve, reject) => {
    extract.on('entry', (header, stream, next) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        files[header.name] = Buffer.concat(chunks);
        next();
      });
      stream.resume();
    });
    extract.on('finish', () => {
      if (!files['ndvi.tif'] || !files['ndwi.tif']) {
        return reject(new Error(`Missing ndvi.tif/ndwi.tif in response. Got: ${Object.keys(files).join(', ')}`));
      }
      resolve({
        ndviBuffer: files['ndvi.tif'],
        ndwiBuffer: files['ndwi.tif'],
      });
    });
    extract.on('error', reject);
    extract.end(tarBuffer);
  });
}

async function decodeGeoTIFF(buffer) {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters();
  const pixels = rasters[0];
  const width = image.getWidth();
  const height = image.getHeight();
  let bbox = image.getBoundingBox();

  if (Math.abs(bbox[0]) > 180 || Math.abs(bbox[1]) > 90 || Math.abs(bbox[2]) > 180 || Math.abs(bbox[3]) > 90) {
    const R = 6378137;
    const toWgs = (x, y) => [
      (x / R) * (180 / Math.PI),
      (Math.PI / 2 - 2 * Math.atan(Math.exp(-y / R))) * (180 / Math.PI),
    ];
    const [minLng, minLat] = toWgs(bbox[0], bbox[1]);
    const [maxLng, maxLat] = toWgs(bbox[2], bbox[3]);
    bbox = [minLng, minLat, maxLng, maxLat];
  }

  return { pixels, width, height, bbox };
}

export async function downloadFromCopernicus(bbox, daysBack = 14) {
  if (!config.copernicus.clientId || !config.copernicus.clientSecret) {
    throw new Error('CDSE_CLIENT_ID and CDSE_CLIENT_SECRET are required');
  }

  const token = await getToken();

  let scene = await searchBestScene(token, bbox, daysBack);
  let stale = false;

  if (!scene) {
    scene = await searchBestScene(token, bbox, 30);
    if (!scene) throw new Error('No Sentinel-2 scene found in 30 days');
    stale = true;
  }

  const { ndviBuffer, ndwiBuffer } = await fetchIndices(token, bbox, scene.datetime);

  return {
    ndviBuffer,
    ndwiBuffer,
    satelliteDate: scene.datetime,
    stale,
  };
}

export { decodeGeoTIFF };
