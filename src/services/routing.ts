import { LngLatPoint } from '../types/game';

const EARTH_RADIUS_KM = 6371;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineKm(a: LngLatPoint, b: LngLatPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function computeBearingDeg(from: LngLatPoint, to: LngLatPoint): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

export function offsetLngLat(origin: LngLatPoint, dxMeters: number, dyMeters: number): LngLatPoint {
  const dLat = dyMeters / 111320;
  const dLng = dxMeters / (111320 * Math.cos(toRad(origin.lat)));
  return {
    lng: origin.lng + dLng,
    lat: origin.lat + dLat,
  };
}

/**
 * Generates a realistic street-grid Manhattan/diagonal fallback route
 * when OSRM is unavailable or throttled.
 */
function buildFallbackStreetRoute(from: LngLatPoint, to: LngLatPoint): LngLatPoint[] {
  const mid1: LngLatPoint = {
    lng: from.lng + (to.lng - from.lng) * 0.45,
    lat: from.lat + (to.lat - from.lat) * 0.12,
  };
  const mid2: LngLatPoint = {
    lng: from.lng + (to.lng - from.lng) * 0.55,
    lat: from.lat + (to.lat - from.lat) * 0.88,
  };
  return [from, mid1, mid2, to];
}

export function calculateRouteDistanceKm(points: LngLatPoint[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineKm(points[i], points[i + 1]);
  }
  return total;
}

/**
 * Fetches a real street route using OSRM public driving router.
 * Falls back cleanly to a multi-segment tactical path on timeout/error.
 */
export async function fetchStreetRoute(
  from: LngLatPoint,
  to: LngLatPoint,
  isAir: boolean
): Promise<{ points: LngLatPoint[]; distanceKm: number; isRealStreet: boolean }> {
  if (isAir) {
    // Helicopter flies direct air corridor with slight midpoint for smooth tracking
    const points = [from, to];
    return {
      points,
      distanceKm: Math.max(0.05, haversineKm(from, to)),
      isRealStreet: false,
    };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3200);

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`OSRM status ${res.status}`);
    }

    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance: number;
        geometry?: { coordinates: Array<[number, number]> };
      }>;
    };

    const route = data.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (!route || !coords || coords.length < 2) {
      throw new Error('No OSRM route geometry');
    }

    const points: LngLatPoint[] = coords.map(([lng, lat]) => ({ lng, lat }));
    return {
      points,
      distanceKm: Math.max(0.05, route.distance / 1000),
      isRealStreet: true,
    };
  } catch {
    window.clearTimeout(timeout);
    const points = buildFallbackStreetRoute(from, to);
    return {
      points,
      distanceKm: Math.max(0.05, calculateRouteDistanceKm(points)),
      isRealStreet: false,
    };
  }
}

/**
 * Snaps a random coordinate near the city center onto a real street via OSRM Nearest API.
 */
export async function snapPointToStreet(candidate: LngLatPoint): Promise<LngLatPoint> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2200);
  try {
    const url = `https://router.project-osrm.org/nearest/v1/driving/${candidate.lng.toFixed(6)},${candidate.lat.toFixed(6)}?number=1`;
    const res = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timeout);
    if (!res.ok) return candidate;
    const data = (await res.json()) as {
      waypoints?: Array<{ location: [number, number] }>;
    };
    const loc = data.waypoints?.[0]?.location;
    if (loc && loc.length === 2) {
      return { lng: loc[0], lat: loc[1] };
    }
    return candidate;
  } catch {
    window.clearTimeout(timeout);
    return candidate;
  }
}
