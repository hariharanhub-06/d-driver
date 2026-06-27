// Server-side OSRM proxy for road-following route lines.
//
// The driver map used to call the public OSRM demo server directly from the browser.
// That server is rate-limited and intermittently unreachable, so the road line kept
// falling back to a straight line ("OSM not working"). Proxying through the backend
// gives us: no browser CORS/network flakiness, retries, and an in-memory cache keyed
// by ~110 m cells so repeated ticks and multiple drivers reuse the same lookup.

const OSRM_BASE = process.env.OSRM_BASE || 'https://router.project-osrm.org';
const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 500;
const CACHE = new Map(); // key -> { at, value }

const round3 = (n) => Math.round(n * 1000) / 1000; // ~110 m grid

const parsePair = (s) => {
  if (typeof s !== 'string') return null;
  const [lng, lat] = s.split(',').map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
};

async function fetchOsrm(from, to) {
  const url = `${OSRM_BASE}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 6000);
    try {
      const res = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'OnliveBus/1.0 (+routing)' } });
      if (!res.ok) throw new Error(`osrm ${res.status}`);
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route?.geometry?.coordinates) throw new Error('no route');
      return {
        // OSRM returns [lng, lat]; Leaflet wants [lat, lng].
        coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distance: route.distance,
        duration: route.duration,
      };
    } catch (e) {
      if (attempt === 1) return null;
      await new Promise((r) => setTimeout(r, 400));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

// GET /api/v1/routing/path?from=lng,lat&to=lng,lat
const getPath = async (req, res) => {
  const from = parsePair(req.query.from);
  const to = parsePair(req.query.to);
  if (!from || !to) return res.status(400).json({ error: 'from and to (as "lng,lat") are required' });

  const key = `${round3(from.lng)},${round3(from.lat)};${round3(to.lng)},${round3(to.lat)}`;
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return res.json(cached.value);
  }

  const value = await fetchOsrm(from, to);
  if (!value) {
    // Graceful: tell the client there's no road geometry so it keeps its straight fallback.
    return res.json({ coordinates: null });
  }

  if (CACHE.size >= MAX_ENTRIES) CACHE.clear();
  CACHE.set(key, { at: Date.now(), value });
  res.json(value);
};

module.exports = { getPath };
