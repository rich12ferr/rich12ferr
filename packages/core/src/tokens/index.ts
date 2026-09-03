import { oklch, toCss, toHex, type Oklch } from "./color"

export { oklch, toCss, toHex, toRgb, toRgba, type Oklch } from "./color"

/**
 * Single source of truth for the OpenPlay visual system, mirroring
 * apps/web/app/globals.css. Consumed as CSS custom properties on web and as a
 * resolved StyleSheet theme on React Native.
 *
 * Semantic names only — no `blue500`. A token describes a *role*, so a future
 * municipality-branded theme can be swapped in by replacing values here without
 * touching a single component.
 */

export type ColorScheme = "light" | "dark"

export type SemanticColors = {
  background: Oklch
  foreground: Oklch
  card: Oklch
  cardForeground: Oklch
  popover: Oklch
  popoverForeground: Oklch
  primary: Oklch
  primaryForeground: Oklch
  secondary: Oklch
  secondaryForeground: Oklch
  muted: Oklch
  mutedForeground: Oklch
  accent: Oklch
  accentForeground: Oklch
  destructive: Oklch
  border: Oklch
  input: Oklch
  ring: Oklch
  highlight: Oklch
  highlightForeground: Oklch

  /** Registration-status palette. These carry meaning, so they are named for it. */
  open: Oklch
  openForeground: Oklch
  openSoft: Oklch
  soon: Oklch
  soonForeground: Oklch
  soonSoft: Oklch
  upcoming: Oklch
  upcomingForeground: Oklch
  upcomingSoft: Oklch
  shut: Oklch
  shutForeground: Oklch
  shutSoft: Oklch

  chart1: Oklch
  chart2: Oklch
  chart3: Oklch
  chart4: Oklch
  chart5: Oklch
}

const light: SemanticColors = {
  background: oklch(0.988, 0.004, 250),
  foreground: oklch(0.24, 0.03, 262),
  card: oklch(1, 0, 0),
  cardForeground: oklch(0.24, 0.03, 262),
  popover: oklch(1, 0, 0),
  popoverForeground: oklch(0.24, 0.03, 262),
  primary: oklch(0.53, 0.2, 254),
  primaryForeground: oklch(0.99, 0.005, 250),
  secondary: oklch(0.955, 0.014, 252),
  secondaryForeground: oklch(0.32, 0.05, 258),
  muted: oklch(0.962, 0.008, 252),
  mutedForeground: oklch(0.52, 0.025, 258),
  accent: oklch(0.945, 0.03, 252),
  accentForeground: oklch(0.32, 0.06, 256),
  destructive: oklch(0.58, 0.22, 27),
  border: oklch(0.912, 0.012, 254),
  input: oklch(0.9, 0.014, 254),
  ring: oklch(0.53, 0.2, 254),
  highlight: oklch(0.87, 0.17, 96),
  highlightForeground: oklch(0.28, 0.06, 80),

  open: oklch(0.56, 0.14, 152),
  openForeground: oklch(0.99, 0.01, 150),
  openSoft: oklch(0.945, 0.05, 152),
  soon: oklch(0.7, 0.17, 62),
  soonForeground: oklch(0.22, 0.05, 60),
  soonSoft: oklch(0.955, 0.06, 76),
  upcoming: oklch(0.55, 0.14, 240),
  upcomingForeground: oklch(0.99, 0.01, 250),
  upcomingSoft: oklch(0.948, 0.035, 244),
  shut: oklch(0.58, 0.02, 258),
  shutForeground: oklch(0.99, 0.005, 250),
  shutSoft: oklch(0.955, 0.006, 258),

  chart1: oklch(0.53, 0.2, 254),
  chart2: oklch(0.56, 0.14, 152),
  chart3: oklch(0.7, 0.17, 62),
  chart4: oklch(0.58, 0.02, 258),
  chart5: oklch(0.67, 0.16, 200),
}

const dark: SemanticColors = {
  background: oklch(0.185, 0.022, 262),
  foreground: oklch(0.965, 0.006, 250),
  card: oklch(0.232, 0.024, 262),
  cardForeground: oklch(0.965, 0.006, 250),
  popover: oklch(0.232, 0.024, 262),
  popoverForeground: oklch(0.965, 0.006, 250),
  primary: oklch(0.7, 0.16, 254),
  primaryForeground: oklch(0.18, 0.04, 258),
  secondary: oklch(0.288, 0.026, 260),
  secondaryForeground: oklch(0.95, 0.008, 250),
  muted: oklch(0.278, 0.024, 260),
  mutedForeground: oklch(0.72, 0.02, 254),
  accent: oklch(0.31, 0.04, 258),
  accentForeground: oklch(0.96, 0.008, 250),
  destructive: oklch(0.68, 0.19, 24),
  border: oklch(1, 0, 0, 0.13),
  input: oklch(1, 0, 0, 0.16),
  ring: oklch(0.7, 0.16, 254),
  highlight: oklch(0.85, 0.17, 96),
  highlightForeground: oklch(0.24, 0.06, 80),

  open: oklch(0.72, 0.16, 154),
  openForeground: oklch(0.18, 0.05, 155),
  openSoft: oklch(0.32, 0.07, 155),
  soon: oklch(0.79, 0.16, 70),
  soonForeground: oklch(0.22, 0.05, 60),
  soonSoft: oklch(0.34, 0.07, 66),
  upcoming: oklch(0.72, 0.13, 242),
  upcomingForeground: oklch(0.18, 0.05, 250),
  upcomingSoft: oklch(0.31, 0.06, 246),
  shut: oklch(0.68, 0.02, 258),
  shutForeground: oklch(0.19, 0.02, 258),
  shutSoft: oklch(0.3, 0.012, 258),

  chart1: oklch(0.7, 0.16, 254),
  chart2: oklch(0.72, 0.16, 154),
  chart3: oklch(0.79, 0.16, 70),
  chart4: oklch(0.68, 0.02, 258),
  chart5: oklch(0.75, 0.13, 200),
}

export const colors: Record<ColorScheme, SemanticColors> = { light, dark }

/** Base radius in rem; the scale below is derived from it, as in globals.css. */
export const RADIUS_BASE_REM = 0.875

export const radius = {
  sm: RADIUS_BASE_REM * 0.6,
  md: RADIUS_BASE_REM * 0.8,
  lg: RADIUS_BASE_REM,
  xl: RADIUS_BASE_REM * 1.4,
  "2xl": RADIUS_BASE_REM * 1.8,
  "3xl": RADIUS_BASE_REM * 2.2,
  full: 9999,
} as const

/** 4px base grid, matching Tailwind's spacing scale. Values in rem. */
export const spacing = {
  0: 0,
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1,
  5: 1.25,
  6: 1.5,
  8: 2,
  10: 2.5,
  12: 3,
  16: 4,
  20: 5,
  24: 6,
} as const

export const fontFamily = {
  sans: "Inter",
  display: "Outfit",
} as const

/** Type scale in rem, paired with the line heights the guidelines require. */
export const typography = {
  xs: { size: 0.75, lineHeight: 1.5 },
  sm: { size: 0.875, lineHeight: 1.5 },
  base: { size: 1, lineHeight: 1.6 },
  lg: { size: 1.125, lineHeight: 1.5 },
  xl: { size: 1.25, lineHeight: 1.4 },
  "2xl": { size: 1.5, lineHeight: 1.3 },
  "3xl": { size: 1.875, lineHeight: 1.2 },
  "4xl": { size: 2.25, lineHeight: 1.1 },
  "5xl": { size: 3, lineHeight: 1.05 },
} as const

/**
 * Breakpoints in px. Web uses these as media queries; React Native compares them
 * against `useWindowDimensions()` so a tablet layout branches identically.
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const

export type Breakpoint = keyof typeof breakpoints

export function resolveBreakpoint(width: number): Breakpoint | "base" {
  if (width >= breakpoints.xl) return "xl"
  if (width >= breakpoints.lg) return "lg"
  if (width >= breakpoints.md) return "md"
  if (width >= breakpoints.sm) return "sm"
  return "base"
}

const ROOT_FONT_SIZE_PX = 16

/** rem -> px, for React Native which has no rem unit. */
export function rem(value: number): number {
  return value * ROOT_FONT_SIZE_PX
}

/** Flattens a scheme to hex, ready for a React Native StyleSheet theme. */
export function nativeTheme(scheme: ColorScheme): Record<keyof SemanticColors, string> {
  const source = colors[scheme]
  const out = {} as Record<keyof SemanticColors, string>
  for (const key of Object.keys(source) as (keyof SemanticColors)[]) {
    out[key] = toHex(source[key])
  }
  return out
}

/** Emits `--token: oklch(...)` pairs, for generating or auditing globals.css. */
export function cssVariables(scheme: ColorScheme): Record<string, string> {
  const source = colors[scheme]
  const out: Record<string, string> = {}
  for (const key of Object.keys(source) as (keyof SemanticColors)[]) {
    const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
    out[`--${kebab}`] = toCss(source[key])
  }
  return out
}
