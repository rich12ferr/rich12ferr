/** Shared by the server origin resolver and the client location picker. */
export const ORIGIN_COOKIE = "op_origin"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export const DEFAULT_ZIP = "05602"
export const DEFAULT_PLACE = "Montpelier"

export type OriginSource = "geo" | "zip" | "hub"

/** What the filter UI needs to describe the current starting point. */
export type OriginSummary = {
  source: OriginSource
  label: string
  zip: string | null
  /** True when the starting point came from the URL rather than a remembered choice. */
  fromUrl: boolean
  /** Cookie value that reproduces this origin on a later visit, or null for the default. */
  preference: string | null
}

const NEAR_PATTERN = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/

/** Rounds to two decimals (about 1 km) so a shared URL never pinpoints a home. */
export function encodeNear(lat: number, lng: number) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`
}

export function parseNear(value: string | null | undefined): { lat: number; lng: number } | null {
  const match = value ? NEAR_PATTERN.exec(value) : null
  if (!match) return null
  return { lat: Number(match[1]), lng: Number(match[2]) }
}

export function writeOriginPreference(value: string) {
  document.cookie = `${ORIGIN_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
}

export function clearOriginPreference() {
  document.cookie = `${ORIGIN_COOKIE}=; path=/; max-age=0; samesite=lax`
}
