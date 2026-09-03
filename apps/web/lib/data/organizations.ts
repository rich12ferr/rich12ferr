import type { Organization } from "@/lib/types"

/**
 * Fictitious seed organizations for the Montpelier, VT launch region.
 * No real league, school, or recreation department data is represented here.
 */
export const organizations: Organization[] = [
  {
    id: "org_montpelier_rec",
    name: "Montpelier Parks & Recreation",
    slug: "montpelier-parks-recreation",
    organization_type: "recreation_department",
    website_url: "https://example.org/montpelier-rec",
    registration_platform: "CivicRec",
    contact_email: "rec@example.org",
    phone: "(802) 555-0114",
    town: "Montpelier",
    state: "VT",
    zip: "05602",
    verified: true,
    last_verified_at: "2026-08-23",
    about:
      "Municipal recreation department running low-cost, no-cut programs for kindergarten through eighth grade, plus summer clinics at the city fields.",
  },
  {
    id: "org_union_middle",
    name: "Winooski Valley Union Middle School",
    slug: "winooski-valley-union-middle-school",
    organization_type: "school",
    website_url: "https://example.org/wvums-athletics",
    registration_platform: "FamilyID",
    contact_email: "athletics@example.org",
    phone: "(802) 555-0182",
    town: "Montpelier",
    state: "VT",
    zip: "05602",
    verified: true,
    last_verified_at: "2026-08-19",
    about:
      "Interscholastic athletics for grades 6-8. Most teams are no-cut, though a few competitive rosters hold placement tryouts.",
  },
  {
    id: "org_central_vt_soccer",
    name: "Central Vermont Youth Soccer Club",
    slug: "central-vermont-youth-soccer-club",
    organization_type: "club",
    website_url: "https://example.org/cvysc",
    registration_platform: "SportsEngine",
    contact_email: "info@example.org",
    phone: "(802) 555-0143",
    town: "Berlin",
    state: "VT",
    zip: "05602",
    verified: true,
    last_verified_at: "2026-08-21",
    about:
      "Volunteer-run club offering both recreational divisions and travel teams. Financial aid is available for every program on request.",
  },
  {
    id: "org_barre_little_league",
    name: "Barre Area Little League",
    slug: "barre-area-little-league",
    organization_type: "league",
    website_url: "https://example.org/barre-ll",
    registration_platform: "TeamSnap",
    contact_email: "board@example.org",
    phone: "(802) 555-0177",
    town: "Barre",
    state: "VT",
    zip: "05641",
    verified: false,
    last_verified_at: "2026-06-30",
    about:
      "Chartered baseball and softball league serving Barre City, Barre Town, and neighboring communities from tee-ball through age 14.",
  },
  {
    id: "org_granite_ice",
    name: "Granite Ice Youth Hockey Association",
    slug: "granite-ice-youth-hockey-association",
    organization_type: "nonprofit",
    website_url: "https://example.org/granite-ice",
    registration_platform: "Crossbar",
    contact_email: "register@example.org",
    phone: "(802) 555-0160",
    town: "Barre",
    state: "VT",
    zip: "05641",
    verified: true,
    last_verified_at: "2026-08-12",
    about:
      "Nonprofit hockey association with a loaner-equipment program for first-year skaters and mite through bantam travel teams.",
  },
  {
    id: "org_waterbury_rec",
    name: "Waterbury Recreation Department",
    slug: "waterbury-recreation-department",
    organization_type: "recreation_department",
    website_url: "https://example.org/waterbury-rec",
    registration_platform: "CivicRec",
    contact_email: "play@example.org",
    phone: "(802) 555-0128",
    town: "Waterbury",
    state: "VT",
    zip: "05676",
    verified: true,
    last_verified_at: "2026-08-18",
    about:
      "Town recreation programs open to residents and, space permitting, to families from surrounding towns at a small non-resident rate.",
  },
  {
    id: "org_northfield_athletics",
    name: "Northfield Community Athletics",
    slug: "northfield-community-athletics",
    organization_type: "nonprofit",
    website_url: "https://example.org/northfield-athletics",
    registration_platform: null,
    contact_email: "hello@example.org",
    phone: null,
    town: "Northfield",
    state: "VT",
    zip: "05663",
    verified: false,
    last_verified_at: "2026-05-14",
    about:
      "Small volunteer group coordinating multi-sport programs out of the elementary school gym and village fields.",
  },
]

export function getOrganization(id: string) {
  return organizations.find((o) => o.id === id)
}
