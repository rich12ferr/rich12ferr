import type { ComponentType, SVGProps } from "react"
import { Bike, Disc, Footprints, Snowflake, Target, Tent, Timer, Volleyball, Waves } from "lucide-react"

/**
 * Sport iconography, replacing the two-letter monogram in `SportMarker`.
 *
 * Lucide already ships a handful of icons that map directly onto a sport
 * (Volleyball, a bike for mountain biking, waves for swimming, a disc for
 * ultimate frisbee, a tent for camps, a target for biathlon's marksmanship,
 * a snowflake for the catch-all "snow sports", footprints for cross country,
 * a timer for track & field's races) — those are reused as-is below so they
 * stay pixel-consistent with every other icon in the app.
 *
 * Lucide has no literal ball/stick/skier icons, so the rest are hand-drawn
 * in the same 24x24, stroke-only, round-cap style Lucide uses, keeping the
 * whole set visually uniform regardless of source.
 */

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

function BaseballIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 4C6.5 7 6.5 17 8.5 20" />
      <path d="M15.5 4c2 3 2 13 0 16" />
    </Icon>
  )
}

function BasketballIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="M5.5 5.5c2.7 3.3 2.7 9.7 0 13" />
      <path d="M18.5 5.5c-2.7 3.3-2.7 9.7 0 13" />
    </Icon>
  )
}

function SoccerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.5 9.8 10.1l.8 2.6h2.8l.8-2.6z" />
      <path d="M12 8.5V5M9.8 10.1 6 9M14.2 10.1l3.8-1.1M10.6 12.7 8.3 17M13.4 12.7l2.3 4.3" />
    </Icon>
  )
}

function SoftballIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3C6 3 6 21 12 21" />
    </Icon>
  )
}

function TennisIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="9" rx="6" ry="7" />
      <path d="M12 2v14M6 9h12" />
      <path d="M12 16v6M9.5 20h5" />
    </Icon>
  )
}

function FootballIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12c2-5 14-5 16 0-2 5-14 5-16 0z" />
      <path d="M8 12h8" />
      <path d="M10 10v4M12 9.5v5M14 10v4" />
    </Icon>
  )
}

function FlagFootballIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 17c1.5-3 9-3 10 0-1.5 3-9 3-10 0z" />
      <path d="M4.5 17h4" />
      <path d="M16 2v10" />
      <path d="M16 2l5 2-5 2" />
    </Icon>
  )
}

function FieldHockeyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 2 8 19a3 3 0 0 0 3 3h4" />
      <circle cx="19" cy="20" r="2.2" fill="currentColor" stroke="none" />
    </Icon>
  )
}

function HockeyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 2 8 18a2.5 2.5 0 0 0 2.5 3.5H14" />
      <ellipse cx="19" cy="20.5" rx="3.4" ry="1.5" fill="currentColor" stroke="none" />
    </Icon>
  )
}

function LacrosseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 21 14 6" />
      <ellipse cx="15.5" cy="5" rx="4" ry="5" transform="rotate(12 15.5 5)" />
      <path d="M13 2.5 18 8.5" />
      <circle cx="15.5" cy="5" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  )
}

function MartialArtsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12c3-3 6-3 8 0s5 3 8 0" />
      <path d="M4 12c3 3 6 3 8 0s5-3 8 0" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  )
}

function GymnasticsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5" r="1.8" />
      <path d="M12 7v6" />
      <path d="M12 9 5 5M12 9l7-4" />
      <path d="M12 13 6 21M12 13l6 8" />
    </Icon>
  )
}

function IceSkatingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6" y="4" width="8" height="10" rx="2" />
      <path d="M6 14v5M14 14v3" />
      <path d="M4 19c4-2 14-2 18 0" />
    </Icon>
  )
}

function SledHockeyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 19c1.2-1.2 3.2-1.2 4.4 0h11.2c1.2-1.2 3.2-1.2 4.4 0" />
      <rect x="6" y="9" width="11" height="7" rx="1.5" />
      <path d="M20 3 13 18" />
      <circle cx="21" cy="4.5" r="1.4" fill="currentColor" stroke="none" />
    </Icon>
  )
}

function AlpineSkiingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="14" cy="4.5" r="1.7" />
      <path d="M13 7 9 13l3 2-1 6" />
      <path d="M9 13 4 11" />
      <path d="M12 15 17 18" />
      <path d="M3 21h6M13 21h8" />
    </Icon>
  )
}

function NordicSkiingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="4.5" r="1.7" />
      <path d="M12 7v7" />
      <path d="M12 9 7 6M12 9l6 2" />
      <path d="M7 6 5 12M18 11l1 6" />
      <path d="M12 14 8 21M12 14l5 7" />
      <path d="M2 22h8M14 22h8" />
    </Icon>
  )
}

function SnowboardingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="10.5" width="20" height="3" rx="1.5" transform="rotate(-15 12 12)" />
      <path d="M8 9.5v5M16 9.5v5" transform="rotate(-15 12 12)" />
    </Icon>
  )
}

function FreestyleSkiingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20 10 4M20 20 14 4" />
      <path d="M12 4a5 5 0 0 1 5 3" />
      <path d="M15.5 5.5 17 7l1-2.2" />
    </Icon>
  )
}

/** Used for any sport slug not yet mapped to an icon, so a taxonomy gap renders a plain dot, not a blank marker. */
export function GenericActivityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export const sportIcons: Record<string, ComponentType<IconProps>> = {
  baseball: BaseballIcon,
  basketball: BasketballIcon,
  "cross-country": Footprints,
  "field-hockey": FieldHockeyIcon,
  "flag-football": FlagFootballIcon,
  football: FootballIcon,
  hockey: HockeyIcon,
  "ice-skating": IceSkatingIcon,
  lacrosse: LacrosseIcon,
  "martial-arts": MartialArtsIcon,
  soccer: SoccerIcon,
  softball: SoftballIcon,
  tennis: TennisIcon,
  "track-and-field": Timer,
  volleyball: Volleyball,
  gymnastics: GymnasticsIcon,
  swimming: Waves,
  "mountain-biking": Bike,
  "sled-hockey": SledHockeyIcon,
  "ultimate-frisbee": Disc,
  "camps-enrichment": Tent,
  "alpine-skiing": AlpineSkiingIcon,
  "nordic-skiing": NordicSkiingIcon,
  snowboarding: SnowboardingIcon,
  "freestyle-skiing": FreestyleSkiingIcon,
  biathlon: Target,
  "snow-sports": Snowflake,
}
