/**
 * Geocoding for OpenPlay.
 *
 * Replaces the prototype's hand-maintained `distance_from_hub` integer with
 * real coordinates. Two providers, tried in order:
 *
 *   1. US Census Geocoder — free, no API key, no rate limit worth worrying
 *      about, and authoritative for US street addresses. Returns rooftop or
 *      street-level precision.
 *   2. A static town gazetteer — the launch region's town centers. Used when
 *      there is no street address at all (very common: "the city fields"), or
 *      when Census is down. Precision is recorded as `town` so callers know
 *      not to present the result as an exact location.
 *
 * Precision is always returned alongside the point. Search must not apply a
 * tight radius filter to a town-centroid match and pretend it is exact — a
 * 1-mile radius on a town centroid is meaningless.
 */

import type { GeocodePrecision, LatLng } from "@openplay/core"

export type GeocodeRequest = {
  address?: string | null
  town?: string | null
  state?: string | null
  zip?: string | null
}

export type GeocodeResult = {
  point: LatLng
  precision: GeocodePrecision
  provider: "census" | "gazetteer"
  matchedAddress: string | null
}

/**
 * Town centers for the Montpelier launch region.
 *
 * Deliberately a small explicit table rather than a bundled dataset: it covers
 * the current service area, makes seeding deterministic and offline, and fails
 * loudly (returns null) for towns outside it rather than guessing. Expand this
 * — or swap in a real gazetteer dataset — as the service area grows.
 */
const TOWN_GAZETTEER: Record<string, LatLng> = {
  "montpelier,vt": { lat: 44.2601, lng: -72.5754 },
  "berlin,vt": { lat: 44.2076, lng: -72.592 },
  "barre,vt": { lat: 44.197, lng: -72.502 },
  "waterbury,vt": { lat: 44.3378, lng: -72.7562 },
  "northfield,vt": { lat: 44.1526, lng: -72.654 },
  "east montpelier,vt": { lat: 44.2673, lng: -72.4879 },
  "middlesex,vt": { lat: 44.3062, lng: -72.679 },
  "plainfield,vt": { lat: 44.2779, lng: -72.4276 },
  "worcester,vt": { lat: 44.397, lng: -72.559 },
  "calais,vt": { lat: 44.402, lng: -72.479 },
  "moretown,vt": { lat: 44.244, lng: -72.759 },
  "waitsfield,vt": { lat: 44.19, lng: -72.822 },
  "duxbury,vt": { lat: 44.2876, lng: -72.7576 },
  "cabot,vt": { lat: 44.3976, lng: -72.3126 },
  "marshfield,vt": { lat: 44.3487, lng: -72.3634 },
}

const CENSUS_ENDPOINT =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"

function townKey(town: string, state: string) {
  return `${town.trim().toLowerCase()},${state.trim().toLowerCase()}`
}

/** Look up a town center. Returns null for towns outside the service area. */
export function geocodeFromGazetteer(
  town: string | null | undefined,
  state: string | null | undefined,
): GeocodeResult | null {
  if (!town || !state) return null
  const point = TOWN_GAZETTEER[townKey(town, state)]
  if (!point) return null
  return {
    point,
    precision: "town",
    provider: "gazetteer",
    matchedAddress: `${town}, ${state}`,
  }
}

/**
 * Census tiers its match quality. "Exact" on a street address is effectively
 * rooftop; anything else we downgrade to street so downstream radius math
 * stays honest.
 */
function precisionFromCensus(matchType: string | undefined): GeocodePrecision {
  return matchType?.toLowerCase() === "exact" ? "rooftop" : "street"
}

type CensusResponse = {
  result?: {
    addressMatches?: Array<{
      matchedAddress?: string
      coordinates?: { x?: number; y?: number }
      tigerLine?: { side?: string }
      addressComponents?: Record<string, string>
      matchType?: string
    }>
  }
}

/**
 * Geocode a full street address through the US Census Geocoder.
 * Returns null on no match, non-200, timeout, or malformed payload — callers
 * fall back to the gazetteer rather than failing the whole ingest run.
 */
export async function geocodeWithCensus(
  oneLineAddress: string,
  options: { timeoutMs?: number } = {},
): Promise<GeocodeResult | null> {
  const url = new URL(CENSUS_ENDPOINT)
  url.searchParams.set("address", oneLineAddress)
  url.searchParams.set("benchmark", "Public_AR_Current")
  url.searchParams.set("format", "json")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null

    const body = (await response.json()) as CensusResponse
    const match = body.result?.addressMatches?.[0]
    const x = match?.coordinates?.x
    const y = match?.coordinates?.y
    if (typeof x !== "number" || typeof y !== "number") return null

    return {
      // Census returns x = longitude, y = latitude.
      point: { lat: y, lng: x },
      precision: precisionFromCensus(match?.matchType),
      provider: "census",
      matchedAddress: match?.matchedAddress ?? null,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Resolve the best available location for a venue.
 *
 * Tries the street address first, then falls back to the town center. Callers
 * should persist both the point and `precision`.
 */
export async function geocode(
  request: GeocodeRequest,
  options: { allowNetwork?: boolean; timeoutMs?: number } = {},
): Promise<GeocodeResult | null> {
  const { address, town, state, zip } = request
  const allowNetwork = options.allowNetwork ?? true

  if (allowNetwork && address && town && state) {
    const oneLine = [address, town, state, zip].filter(Boolean).join(", ")
    const censusResult = await geocodeWithCensus(oneLine, options)
    if (censusResult) return censusResult
  }

  return geocodeFromGazetteer(town, state)
}

/** Towns currently covered by the gazetteer, for admin/debug surfaces. */
export function gazetteerTowns(): string[] {
  return Object.keys(TOWN_GAZETTEER).sort()
}
