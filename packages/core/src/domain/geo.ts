/**
 * Geographic primitives. Replaces the prototype's `distance_from_hub` scalar,
 * which could only measure from one fixed point (Montpelier) and so could never
 * answer "what is near *me*".
 *
 * Authoritative distance filtering happens in Postgres via PostGIS
 * (`ST_DWithin` on a `geography` column). The haversine helper here exists for
 * client-side display and for sorting a result set that has already been
 * filtered server-side — it is not a substitute for the spatial index.
 */

export type LatLng = {
  lat: number
  lng: number
}

/** How a `LatLng` was obtained. Drives re-geocoding priority and UI precision. */
export const GEOCODE_PRECISIONS = [
  "rooftop", // exact street address
  "street", // interpolated along a street segment
  "zip", // ZIP centroid — fine for "near me", wrong for turn-by-turn
  "town", // municipality centroid
  "none", // could not geocode
] as const
export type GeocodePrecision = (typeof GEOCODE_PRECISIONS)[number]

export type Place = {
  town: string
  state: string
  zip: string | null
  venue_name: string | null
  venue_address: string | null
  /** Null until geocoding succeeds; treat null as "unknown location", never as 0,0. */
  point: LatLng | null
  geocode_precision: GeocodePrecision
}

const EARTH_RADIUS_MILES = 3958.7613

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/**
 * Great-circle distance in statute miles. Straight-line, not drive time —
 * in mountainous Vermont these diverge meaningfully, which is why
 * `MAPBOX_TOKEN` is reserved for a future isochrone/drive-time upgrade.
 */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Distance between two places, or null when either side is not geocoded. */
export function distanceBetween(a: Place | null, b: Place | null): number | null {
  if (!a?.point || !b?.point) return null
  return haversineMiles(a.point, b.point)
}

/** Launch hub: Montpelier, VT. Used as the default map centre, not as an origin for distance. */
export const LAUNCH_HUB: LatLng = { lat: 44.2601, lng: -72.5754 }

/** Radius options offered in search UI, in miles. */
export const RADIUS_OPTIONS = [5, 10, 15, 25, 50] as const
export const DEFAULT_RADIUS_MILES = 25

export function isValidLatLng(value: LatLng | null | undefined): value is LatLng {
  if (!value) return false
  const { lat, lng } = value
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    // Null Island is almost always a geocoding failure, not a real location.
    !(lat === 0 && lng === 0)
  )
}
