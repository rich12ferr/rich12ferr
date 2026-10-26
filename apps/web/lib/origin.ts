import "server-only"
import { headers } from "next/headers"
import zipcodes from "zipcodes"
import { LAUNCH_HUB, isValidLatLng, type LatLng } from "@openplay/core"

export type SearchOrigin = {
  point: LatLng
  /** Place name used in distance copy, e.g. "Burlington" → "12 miles from Burlington". */
  label: string
  source: "zip" | "ip" | "hub"
}

export const HUB_ORIGIN: SearchOrigin = { point: LAUNCH_HUB, label: "Montpelier", source: "hub" }

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
  // A far-away IP (Boston, a VPN) is still used; `searchActivitiesNearby`
  // widens the search and the page says nothing was nearby.
  if (!isValidLatLng(point)) return null

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
