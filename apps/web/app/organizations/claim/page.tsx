import { OrganizationClaimForm } from "@/components/organization-claim-form"
import { organizationById } from "@/lib/queries"

export const metadata = {
  title: "How organizations work with Sign Up Vermont",
  description:
    "Update your schedule, add images, or see how many parents are visiting your pages on Sign Up Vermont.",
}

export default async function OrganizationClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org } = await searchParams
  const organization = org ? await organizationById(org) : null

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-balance">
          How organizations work with Sign Up Vermont
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Thanks for reviewing your organization&apos;s activities. We&apos;ve mapped out your
          upcoming programs on Sign Up Vermont so local families can easily discover it. We are
          currently routing all interested caregivers directly to your official checkout page. If
          you&apos;d like to update the schedule, add images, or see how many parents are visiting
          your pages, please complete the form below and we&apos;ll update the activity listings
          and we&apos;ll follow up with more details.
        </p>
      </header>

      <OrganizationClaimForm
        organizationId={organization?.id ?? null}
        organizationName={organization?.name ?? ""}
        organizationHref={organization ? `/organizations/${organization.id}` : null}
      />
    </div>
  )
}
