import "server-only"
import { headers } from "next/headers"
import zipcodes from "zipcodes"
import { LAUNCH_HUB, haversineMiles, isValidLatLng, type LatLng } from "@openplay/core"

export type SearchOrigin = {
  point: LatLng
  /** Place name used in distance copy, e.g. "Burlington" → "12 miles from Burlington". */
  label: string
  source: "zip" | "ip" | "hub"
}

export const HUB_ORIGIN: SearchOrigin = { point: LAUNCH_HUB, label: "Montpelier", source: "hub" }

/**
 * IP geolocation is city-level at best and often resolves to the ISP's
 * exchange, so it is only trusted when it lands near the service area. A
 * visitor in Boston or on a VPN would otherwise get every listing filtered
 * out by the default radius.
 */
const IP_ORIGIN_MAX_MILES_FROM_HUB = 100

export function originFromZip(zip: string | null | undefined): SearchOrigin | null {
  if (!zip || !/^\d{5}$/.test(zip)) return null
  const match = zipcodes.lookup(zip)
  if (!match) return null
  const point = { lat: match.latitude, lng: match.longitude }
  if (!isValidLatLng(point)) return null
  return { point, label: match.city || `ZIP ${zip}`, source: "zip" }
}

async function originFromVercelHeaders(): Promise<SearchOrigin | null> {
  const h = await headers()
  const point = {
    lat: Number(h.get("x-vercel-ip-latitude")),
    lng: Number(h.get("x-vercel-ip-longitude")),
  }
  if (!isValidLatLng(point)) return null
  if (haversineMiles(point, LAUNCH_HUB) > IP_ORIGIN_MAX_MILES_FROM_HUB) return null

  const rawCity = h.get("x-vercel-ip-city")
  let city: string | null = null
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity)
    } catch {
      city = rawCity
    }
  }
  return { point, label: city || "your area", source: "ip" }
}

/** Where distances are measured from: the ZIP the visitor typed, then their approximate IP location, then Montpelier. */
export async function resolveSearchOrigin(zip: string | null): Promise<SearchOrigin> {
  return originFromZip(zip) ?? (await originFromVercelHeaders()) ?? HUB_ORIGIN
}
