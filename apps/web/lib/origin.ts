import "server-only"
import { cookies } from "next/headers"
import zipcodes from "zipcodes"
import { LAUNCH_HUB, isValidLatLng, type LatLng } from "@openplay/core"
import {
  DEFAULT_PLACE,
  DEFAULT_ZIP,
  ORIGIN_COOKIE,
  encodeNear,
  parseNear,
  type OriginSummary,
} from "@/lib/location-preference"

export type SearchOrigin = OriginSummary & {
  point: LatLng
}

export const HUB_ORIGIN: SearchOrigin = {
  point: LAUNCH_HUB,
  label: DEFAULT_PLACE,
  source: "hub",
  zip: DEFAULT_ZIP,
  fromUrl: false,
  preference: null,
}

export function originFromZip(zip: string | null | undefined, fromUrl = true): SearchOrigin | null {
  if (!zip || !/^\d{5}$/.test(zip)) return null
  const match = zipcodes.lookup(zip)
  if (!match) return null
  const point = { lat: match.latitude, lng: match.longitude }
  if (!isValidLatLng(point)) return null
  return { point, label: match.city || `ZIP ${zip}`, source: "zip", zip, fromUrl, preference: `zip:${zip}` }
}

function originFromNear(near: string | null | undefined, fromUrl = true): SearchOrigin | null {
  const parsed = parseNear(near)
  if (!parsed || !isValidLatLng(parsed)) return null
  return {
    point: parsed,
    label: "your location",
    source: "geo",
    zip: null,
    fromUrl,
    preference: `geo:${encodeNear(parsed.lat, parsed.lng)}`,
  }
}

async function originFromCookie(): Promise<SearchOrigin | null> {
  const raw = (await cookies()).get(ORIGIN_COOKIE)?.value
  if (!raw) return null
  const value = decodeURIComponent(raw)
  if (value.startsWith("zip:")) return originFromZip(value.slice(4), false)
  if (value.startsWith("geo:")) return originFromNear(value.slice(4), false)
  return null
}

/**
 * Where distances are measured from, in order: a shared location in the URL
 * ("Use my location"), a ZIP in the URL, the visitor's remembered choice, then
 * Montpelier. IP geolocation is deliberately not used — it routinely places
 * Vermont visitors in Massachusetts.
 */
export async function resolveSearchOrigin(input: { zip: string | null; near?: string | null }): Promise<SearchOrigin> {
  return originFromNear(input.near) ?? originFromZip(input.zip) ?? (await originFromCookie()) ?? HUB_ORIGIN
}

export function originSummary({ point: _point, ...summary }: SearchOrigin): OriginSummary {
  return summary
}
