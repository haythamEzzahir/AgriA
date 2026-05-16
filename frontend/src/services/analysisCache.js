const TTL_MS = 60 * 60 * 1000; // 1 hour
const ANALYSIS_KEY = (id) => `analysis:${id}`;
const SELECTED_KEY = 'selected-farm-id';

export function getCachedAnalysis(farmId) {
  if (!farmId) return null;
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY(farmId));
    if (!raw) return null;
    const { result, timestamp } = JSON.parse(raw);
    if (!timestamp || Date.now() - timestamp > TTL_MS) return null;
    return result;
  } catch {
    return null;
  }
}

export function setCachedAnalysis(farmId, result) {
  if (!farmId || !result) return;
  try {
    localStorage.setItem(
      ANALYSIS_KEY(farmId),
      JSON.stringify({ result, timestamp: Date.now() }),
    );
  } catch {
    /* quota exceeded — silently skip */
  }
}

export function invalidateAnalysisCache(farmId) {
  if (!farmId) return;
  try {
    localStorage.removeItem(ANALYSIS_KEY(farmId));
  } catch {
    /* ignore */
  }
}

export function getCacheAgeMinutes(farmId) {
  if (!farmId) return null;
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY(farmId));
    if (!raw) return null;
    const { timestamp } = JSON.parse(raw);
    if (!timestamp) return null;
    return Math.round((Date.now() - timestamp) / 60000);
  } catch {
    return null;
  }
}

export function getSelectedFarmId() {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

export function setSelectedFarmId(id) {
  if (!id) return;
  try {
    localStorage.setItem(SELECTED_KEY, id);
  } catch {
    /* ignore */
  }
}
