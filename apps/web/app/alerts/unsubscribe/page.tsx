import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UnsubscribeAlert } from "@/components/unsubscribe-alert"

export const metadata: Metadata = {
  title: "Unsubscribe | OpenPlay",
  robots: { index: false },
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-16">
      {token ? (
        <UnsubscribeAlert token={token} />
      ) : (
        <div className="flex flex-col items-start gap-4">
          <h1 className="font-display text-xl font-bold">Missing unsubscribe link</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            This page needs the link from one of your alert emails. You can also manage everything
            you&apos;re watching directly.
          </p>
          <Button render={<Link href="/alerts/manage" />} nativeButton={false} variant="outline" size="sm">
            Manage alerts
          </Button>
        </div>
      )}
    </main>
  )
}
