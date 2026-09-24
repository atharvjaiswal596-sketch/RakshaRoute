// ETA helpers: real road routing via OSRM, falling back to a straight-line
// speed heuristic so the app never depends on an external router being up.

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const OSRM_TIMEOUT_MS = 2500;

// Urban average response speed for the fallback (~30 km/h → 500 m/min)
const SPEED_M_PER_MIN = 500;

// Cache successful road results (~0.01° grid ≈ 1 km, 30 s TTL) so the fleet
// simulator's frequent location pings don't hammer the rate-limited router
const ROAD_CACHE_TTL_MS = 30_000;
const GRID = 100; // round(coord * GRID) / GRID → 0.01° precision
const roadCache = new Map();

async function fetchJsonWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function cacheKey(from, to) {
  const r = (n) => (Number.isFinite(n) ? Math.round(n * GRID) / GRID : 0);
  return `${r(from.lng)},${r(from.lat)}|${r(to.lng)},${r(to.lat)}`;
}

// Road-network travel time (minutes), or null if unroutable/unreachable
async function roadMinutes(from, to) {
  const key = cacheKey(from, to);
  const hit = roadCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.minutes;

  const { lng: lon1, lat: lat1 } = from;
  const { lng: lon2, lat: lat2 } = to;
  if (![lon1, lat1, lon2, lat2].every(Number.isFinite)) return null;

  const url = `${OSRM_URL}/${lon1},${lat1};${lon2},${lat2}?overview=false`;
  const data = await fetchJsonWithTimeout(url, OSRM_TIMEOUT_MS);
  const minutes =
    Number.isFinite(data?.routes?.[0]?.duration) ? data.routes[0].duration / 60 : null;

  if (minutes != null) {
    roadCache.set(key, { expiresAt: Date.now() + ROAD_CACHE_TTL_MS, minutes });
  }
  return minutes;
}

// Great-circle distance between two {lng, lat} points, in meters
function haversineMeters(a, b) {
  const R = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Synchronous straight-line estimate, minutes given distance in meters
function heuristicMinutes(distanceMeters) {
  const d = Number(distanceMeters);
  if (!Number.isFinite(d) || d <= 0) return null;
  return d / SPEED_M_PER_MIN;
}

// Road ETA with heuristic fallback → { minutes, source: "road"|"estimated" }
async function computeEta({ from, to }) {
  const road = await roadMinutes(from, to);
  if (road != null) return { minutes: road, source: "road" };
  const est = heuristicMinutes(haversineMeters(from, to));
  if (est != null) return { minutes: est, source: "estimated" };
  return null;
}

module.exports = { computeEta, heuristicMinutes, haversineMeters, roadMinutes };