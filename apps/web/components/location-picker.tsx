"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { LocateFixedIcon, Loader2Icon, MapPinIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_PLACE,
  DEFAULT_ZIP,
  clearOriginPreference,
  encodeNear,
  writeOriginPreference,
  type OriginSummary,
} from "@/lib/location-preference"

type Props = {
  basePath: "/search" | "/camps"
  idPrefix: string
  origin: OriginSummary
  inputClassName?: string
}

function describe(origin: OriginSummary) {
  if (origin.source === "geo") return "Distances from your location"
  if (origin.source === "zip") return `Distances from ${origin.label} (${origin.zip})`
  return `Distances from ${DEFAULT_PLACE} (${DEFAULT_ZIP}), the default`
}

/** ZIP entry plus an opt-in "Use my location". The choice is remembered in a cookie. */
export function LocationPicker({ basePath, idPrefix, origin, inputClassName = "h-9" }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shownZip = origin.source === "zip" ? (origin.zip ?? "") : ""

  useEffect(() => {
    if (origin.fromUrl && origin.preference) writeOriginPreference(origin.preference)
  }, [origin.fromUrl, origin.preference])

  function navigate(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString())
    mutate(next)
    const query = next.toString()
    router.replace(`${basePath}${query ? `?${query}` : ""}`, { scroll: false })
  }

  function resetToDefault() {
    clearOriginPreference()
    setError(null)
    navigate((next) => {
      next.delete("zip")
      next.delete("near")
    })
  }

  function commitZip(raw: string) {
    const zip = raw.replace(/\D/g, "")
    if (zip === shownZip) return
    if (!zip) return resetToDefault()
    if (zip.length !== 5) return setError("Enter a 5-digit ZIP code.")
    setError(null)
    navigate((next) => {
      next.set("zip", zip)
      next.delete("near")
    })
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Your browser can't share location. Enter a ZIP instead.")
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        const near = encodeNear(position.coords.latitude, position.coords.longitude)
        navigate((next) => {
          next.set("near", near)
          next.delete("zip")
        })
      },
      (failure) => {
        setLocating(false)
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? "Location access was blocked. Enter a ZIP instead."
            : "Couldn't find your location. Enter a ZIP instead.",
        )
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-zip`}>ZIP code</FieldLabel>
        <Input
          key={shownZip}
          id={`${idPrefix}-zip`}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder={DEFAULT_ZIP}
          defaultValue={shownZip}
          aria-invalid={error ? true : undefined}
          onBlur={(e) => commitZip(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return
            commitZip(e.currentTarget.value)
          }}
          className={inputClassName}
        />
      </Field>
      <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
        {locating ? (
          <Loader2Icon data-icon="inline-start" className="animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixedIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {locating ? "Locating…" : "Use my location"}
      </Button>
      <div className="flex flex-col gap-1" aria-live="polite">
        <FieldDescription className="flex items-start gap-1.5 text-xs leading-relaxed">
          <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {describe(origin)}
            {origin.source !== "hub" ? (
              <>
                {" · "}
                <button type="button" onClick={resetToDefault} className="underline underline-offset-2 hover:text-foreground">
                  Reset
                </button>
              </>
            ) : null}
          </span>
        </FieldDescription>
        {error ? <p className="text-xs leading-relaxed text-destructive">{error}</p> : null}
      </div>
    </div>
  )
}
