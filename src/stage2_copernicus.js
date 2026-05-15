'use strict';

// Stage 2 (Copernicus) — Satellite imagery via Copernicus Data Space.
//
// Calls a Python helper that uses Sentinel Hub Process API to:
//   1. Search STAC for the best Sentinel-2 L2A scene
//   2. Compute NDVI + NDWI as single-band FLOAT32 GeoTIFFs
//
// Returns Node.js Buffers, same contract as downloadIndex() in stage2_imagery.js,
// so the rest of the pipeline works unchanged.

const { spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const config = require('./config');

const SCRIPT = path.join(__dirname, 'copernicus', 'fetch_indices.py');
const VENV_PYTHON = path.join(__dirname, '..', '.venv', 'bin', 'python');

/**
 * Download NDVI and NDWI GeoTIFFs for a farm polygon via Copernicus.
 *
 * @param {number[]} bbox  [minLng, minLat, maxLng, maxLat]
 * @param {number}   daysBack  Search window in days (14 or 30)
 * @param {object}   opts  { clientId?, clientSecret?, python? }
 * @returns {{ ndviBuffer: Buffer, ndwiBuffer: Buffer, satelliteDate: string }}
 */
async function downloadFromCopernicus(bbox, daysBack = 14, opts = {}) {
  const python    = opts.python    || VENV_PYTHON;
  const clientId  = opts.clientId  || config.CDSE_CLIENT_ID;
  const clientSecret = opts.clientSecret || config.CDSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'CDSE_CLIENT_ID and CDSE_CLIENT_SECRET are required for Copernicus imagery.\n' +
      'Get them at https://shapps.dataspace.copernicus.eu/dashboard/#/account/settings'
    );
  }

  const tmpDir  = os.tmpdir();
  const ndviPath = path.join(tmpDir, `agricopilot_ndvi_${Date.now()}.tif`);
  const ndwiPath = path.join(tmpDir, `agricopilot_ndwi_${Date.now()}.tif`);

  const bboxStr = bbox.join(',');

  return new Promise((resolve, reject) => {
    const args = [
      SCRIPT,
      '--bbox', bboxStr,
      '--ndvi-out', ndviPath,
      '--ndwi-out', ndwiPath,
      '--days', String(daysBack),
      '--client-id', clientId,
      '--client-secret', clientSecret,
    ];

    const child = spawn(python, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });

    child.on('close', async (code) => {
      if (code !== 0) {
        // Clean up any partial files
        try { fs.unlinkSync(ndviPath); } catch (_) {}
        try { fs.unlinkSync(ndwiPath); } catch (_) {}
        return reject(new Error(`Copernicus fetch failed (exit ${code}): ${stderr.trim()}`));
      }

      try {
        // Parse stderr for scene datetime (Python prints logs to stderr)
        const dateMatch = stderr.match(/Best scene:\s*([\d\-T:]+)/);
        const satelliteDate = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

        const ndviBuffer = fs.readFileSync(ndviPath);
        const ndwiBuffer = fs.readFileSync(ndwiPath);

        // Clean up temp files
        fs.unlinkSync(ndviPath);
        fs.unlinkSync(ndwiPath);

        resolve({ ndviBuffer, ndwiBuffer, satelliteDate });
      } catch (err) {
        reject(err);
      }
    });

    child.on('error', reject);
  });
}

module.exports = { downloadFromCopernicus };
