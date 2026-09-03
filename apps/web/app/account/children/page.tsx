import Link from "next/link"
import { SearchIcon, ShieldCheckIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SportMarker } from "@/components/sport-marker"
import { childProfiles } from "@/lib/data/moderation"
import { getSportBySlug } from "@/lib/data/sports"
import { gradeLabel } from "@/lib/format"

export const metadata = { title: "Child profiles" }

export default function ChildrenPage() {
  return (
    <div className="flex flex-col gap-5">
      <Alert>
        <ShieldCheckIcon />
        <AlertTitle>We deliberately know as little as possible</AlertTitle>
        <AlertDescription>
          Profiles store only what is needed to match a program: a nickname you choose, birth year,
          grade, ZIP, and interests. Never a legal name, school ID, medical information, or street
          address.
        </AlertDescription>
      </Alert>

      <ul className="flex flex-col gap-3">
        {childProfiles.map((child) => (
          <li
            key={child.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-lg font-bold">{child.nickname}</h3>
              <Badge variant="secondary">{gradeLabel(child.grade)}</Badge>
              <Badge variant="outline" className="font-normal">
                Born {child.birth_year}
              </Badge>
            </div>

            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Home ZIP</dt>
                <dd className="font-medium">{child.home_zip}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Willing to travel</dt>
                <dd className="font-medium">{child.distance_preference} miles</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Sport interests
              </p>
              <div className="flex flex-wrap gap-2">
                {child.sport_interests.map((slug) => {
                  const sport = getSportBySlug(slug)
                  if (!sport) return null
                  return (
                    <span
                      key={slug}
                      className="inline-flex items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1"
                    >
                      <SportMarker slug={sport.slug} name={sport.name} size="sm" />
                      <span className="text-sm">{sport.name}</span>
                    </span>
                  )
                })}
              </div>
            </div>

            <Button
              render={
                <Link
                  href={`/search?grade=${child.grade}&radius=${child.distance_preference}&status=not_closed`}
                />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
              className="w-fit"
            >
              <SearchIcon data-icon="inline-start" />
              Find activities for {child.nickname}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
