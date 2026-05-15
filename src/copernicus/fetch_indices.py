#!/usr/bin/env python3
"""
Copernicus Data Space — Sentinel-2 NDVI & NDWI fetcher.

Uses Sentinel Hub Process API to compute vegetation indices server-side
and return them as single-band FLOAT32 GeoTIFF files.

Usage:
  python fetch_indices.py \
    --bbox -9.5375,30.4156,-9.5360,30.4170 \
    --ndvi-out /tmp/ndvi.tif \
    --ndwi-out /tmp/ndwi.tif \
    [--days 14] \
    [--client-id ID] [--client-secret SECRET]

Environment variables (fallback for --client-id / --client-secret):
  CDSE_CLIENT_ID
  CDSE_CLIENT_SECRET
"""

import argparse, json, os, sys, tarfile, io, time
from datetime import datetime, timezone, timedelta

import requests
from oauthlib.oauth2 import BackendApplicationClient
from requests_oauthlib import OAuth2Session


TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"
STAC_URL = "https://stac.dataspace.copernicus.eu/v1/search"


# ── Auth ──────────────────────────────────────────────────────────────────────

def get_session(client_id, client_secret):
    """Return an OAuth2Session with a valid access token."""
    client = BackendApplicationClient(client_id=client_id)
    oauth = OAuth2Session(client=client)

    def compliance_hook(resp):
        resp.raise_for_status()
        return resp

    oauth.register_compliance_hook("access_token_response", compliance_hook)
    oauth.fetch_token(
        token_url=TOKEN_URL,
        client_secret=client_secret,
        include_client_id=True,
    )
    return oauth


# ── Scene search via STAC ─────────────────────────────────────────────────────

def search_best_scene(session, bbox, days_back):
    """Search STAC for the best Sentinel-2 L2A scene. Returns (datetime, cloud_cover)."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days_back)

    # GET search — simpler and well-tested.  For small areas and short time
    # windows the result set is tiny, so we fetch all scenes then filter/sort
    # client-side rather than wrestling with CQL2 JSON syntax.
    params = {
        "collections": "sentinel-2-l2a",
        "bbox":         f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}",
        "datetime":     f"{start.strftime('%Y-%m-%dT%H:%M:%SZ')}/{now.strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "limit":        50,
        "fields":       "+properties.datetime,+properties.eo:cloud_cover",
    }

    resp = session.get(STAC_URL, params=params)
    resp.raise_for_status()
    data = resp.json()

    features = data.get("features", [])
    if not features:
        return None, None

    # Client-side filter: cloud < 30%, sorted ascending by cloud cover
    filtered = [f for f in features
                if (f["properties"].get("eo:cloud_cover") or 100) <= 30]
    filtered.sort(key=lambda f: f["properties"].get("eo:cloud_cover", 100))

    if not filtered:
        return None, None

    best = filtered[0]
    return best["properties"]["datetime"], best["properties"]["eo:cloud_cover"]


# ── NDVI + NDWI via Sentinel Hub Process API ──────────────────────────────────

NDVI_NDWI_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "B11"], units: "REFLECTANCE" }],
    output: [
      { id: "ndvi", bands: 1, sampleType: SampleType.FLOAT32 },
      { id: "ndwi", bands: 1, sampleType: SampleType.FLOAT32 },
    ],
  };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  let ndwi = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);
  return { ndvi: [ndvi], ndwi: [ndwi] };
}
"""


def fetch_indices(session, bbox, date_from, date_to, ndvi_path, ndwi_path):
    """
    Call Sentinel Hub Process API to compute NDVI + NDWI for the given bbox
    and time window.  Saves two single-band FLOAT32 GeoTIFFs.
    """
    # Compute pixel dimensions at ~10 m Sentinel-2 native resolution
    lng_range = bbox[2] - bbox[0]
    lat_range = bbox[3] - bbox[1]
    width  = max(32, int(lng_range / 0.0000898))   # ~10 m/px at equator
    height = max(32, int(lat_range / 0.0000898))

    request_body = {
        "input": {
            "bounds": {
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
                "bbox": bbox,
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {
                        "from": f"{date_from}T00:00:00Z",
                        "to":   f"{date_to}T23:59:59Z",
                    },
                },
            }],
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [
                {"identifier": "ndvi", "format": {"type": "image/tiff"}},
                {"identifier": "ndwi", "format": {"type": "image/tiff"}},
            ],
        },
        "evalscript": NDVI_NDWI_EVALSCRIPT,
    }

    resp = session.post(
        PROCESS_URL,
        json=request_body,
        headers={"Accept": "application/tar"},
    )
    resp.raise_for_status()

    # Response is a tar archive with ndvi.tif and ndwi.tif
    tar_bytes = resp.content
    with tarfile.open(fileobj=io.BytesIO(tar_bytes)) as tar:
        members = {m.name: m for m in tar.getmembers() if m.isfile()}

        ndvi_member = members.get("ndvi.tif")
        ndwi_member = members.get("ndwi.tif")

        if not ndvi_member or not ndwi_member:
            available = list(members.keys())
            raise RuntimeError(
                f"Expected ndvi.tif and ndwi.tif in tar response, got: {available}"
            )

        with open(ndvi_path, "wb") as f:
            f.write(tar.extractfile(ndvi_member).read())

        with open(ndwi_path, "wb") as f:
            f.write(tar.extractfile(ndwi_member).read())


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch Sentinel-2 NDVI & NDWI from Copernicus")
    parser.add_argument("--bbox", required=True,
                        help="Bounding box: west,south,east,north (WGS84)")
    parser.add_argument("--ndvi-out", required=True, help="Output path for NDVI GeoTIFF")
    parser.add_argument("--ndwi-out", required=True, help="Output path for NDWI GeoTIFF")
    parser.add_argument("--days", type=int, default=14,
                        help="Search window in days (default: 14)")
    parser.add_argument("--client-id", default=os.environ.get("CDSE_CLIENT_ID", ""))
    parser.add_argument("--client-secret", default=os.environ.get("CDSE_CLIENT_SECRET", ""))
    args = parser.parse_args()

    if not args.client_id or not args.client_secret:
        print("Error: CDSE_CLIENT_ID and CDSE_CLIENT_SECRET are required.", file=sys.stderr)
        print("Set them via --client-id/--client-secret or environment variables.", file=sys.stderr)
        sys.exit(1)

    bbox = [float(x) for x in args.bbox.split(",")]
    if len(bbox) != 4:
        print("Error: --bbox must be west,south,east,north", file=sys.stderr)
        sys.exit(1)

    print(f"Authenticating with Copernicus Data Space...", file=sys.stderr)
    session = get_session(args.client_id, args.client_secret)

    print(f"Searching Sentinel-2 L2A scenes (last {args.days} days)...", file=sys.stderr)
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=args.days)
    scene_dt, cloud_cover = search_best_scene(session, bbox, args.days)

    if scene_dt is None:
        # Widen to 30 days
        print(f"No scene found in {args.days} days, trying 30 days...", file=sys.stderr)
        scene_dt, cloud_cover = search_best_scene(session, bbox, 30)

    if scene_dt is None:
        print("Error: No Sentinel-2 L2A scene found in the last 30 days.", file=sys.stderr)
        sys.exit(2)

    print(f"Best scene: {scene_dt}  (cloud: {cloud_cover:.1f}%)", file=sys.stderr)
    print(f"Computing NDVI & NDWI via Sentinel Hub Process API...", file=sys.stderr)

    # Process API needs a date range that covers the scene. Use ±2 days around
    # the scene datetime to ensure the satellite pass is included.
    scene_dt_parsed = datetime.fromisoformat(scene_dt)
    date_from = (scene_dt_parsed - timedelta(days=2)).strftime("%Y-%m-%d")
    date_to   = (scene_dt_parsed + timedelta(days=2)).strftime("%Y-%m-%d")

    fetch_indices(session, bbox, date_from, date_to,
                  args.ndvi_out, args.ndwi_out)

    print(f"NDVI → {args.ndvi_out}", file=sys.stderr)
    print(f"NDWI → {args.ndwi_out}", file=sys.stderr)


if __name__ == "__main__":
    main()
