/**
 * The web theme is authored in OKLCH, which gives perceptually even lightness
 * ramps. React Native cannot parse `oklch()` strings, so tokens are stored as
 * structured triplets and converted per platform:
 *
 *   web    -> `oklch(L C H)`  (native CSS, no conversion loss)
 *   native -> `#rrggbb`       (converted through Oklab -> linear sRGB -> sRGB)
 *
 * Storing a hex value as the source of truth instead would have thrown away the
 * wide-gamut precision the web theme already relies on.
 */

export type Oklch = {
  /** Perceptual lightness, 0-1. */
  l: number
  /** Chroma, 0-~0.4. */
  c: number
  /** Hue angle in degrees, 0-360. */
  h: number
  /** Alpha, 0-1. Defaults to 1. */
  a?: number
}

export function oklch(l: number, c: number, h: number, a = 1): Oklch {
  return { l, c, h, a }
}

/** CSS value for the web. Emits OKLCH natively — no precision lost. */
export function toCss(color: Oklch): string {
  const { l, c, h, a = 1 } = color
  const base = `oklch(${l} ${c} ${h})`
  return a >= 1 ? base : `oklch(${l} ${c} ${h} / ${Math.round(a * 100)}%)`
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** sRGB transfer function (linear -> gamma-encoded). */
function gammaEncode(channel: number): number {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055
}

/** OKLCH -> sRGB in 0-255. Out-of-gamut colors are clipped per channel. */
export function toRgb(color: Oklch): { r: number; g: number; b: number; a: number } {
  const { l: L, c: C, h: H, a = 1 } = color

  const hRad = (H * Math.PI) / 180
  const aLab = C * Math.cos(hRad)
  const bLab = C * Math.sin(hRad)

  // Oklab -> non-linear LMS
  const lCbrt = L + 0.3963377774 * aLab + 0.2158037573 * bLab
  const mCbrt = L - 0.1055613458 * aLab - 0.0638541728 * bLab
  const sCbrt = L - 0.0894841775 * aLab - 1.291485548 * bLab

  const lms = { l: lCbrt ** 3, m: mCbrt ** 3, s: sCbrt ** 3 }

  // LMS -> linear sRGB
  const rLin = 4.0767416621 * lms.l - 3.3077115913 * lms.m + 0.2309699292 * lms.s
  const gLin = -1.2684380046 * lms.l + 2.6097574011 * lms.m - 0.3413193965 * lms.s
  const bLin = -0.0041960863 * lms.l - 0.7034186147 * lms.m + 1.707614701 * lms.s

  return {
    r: Math.round(clamp01(gammaEncode(rLin)) * 255),
    g: Math.round(clamp01(gammaEncode(gLin)) * 255),
    b: Math.round(clamp01(gammaEncode(bLin)) * 255),
    a,
  }
}

/** Hex value for React Native / anywhere OKLCH is unsupported. */
export function toHex(color: Oklch): string {
  const { r, g, b } = toRgb(color)
  const hex = (v: number) => v.toString(16).padStart(2, "0")
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

/** `rgba()` string, for platforms needing explicit alpha. */
export function toRgba(color: Oklch): string {
  const { r, g, b, a } = toRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
