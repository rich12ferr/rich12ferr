import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { getIssueForRender, publishedEditionsForCompose } from "@openplay/db"
import { NewsletterEditor } from "@/components/newsletter-editor"
import { siteUrl } from "@/lib/site-url"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Edit issue",
}

export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [data, editions] = await Promise.all([
    getIssueForRender(id),
    publishedEditionsForCompose(),
  ])

  if (!data) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/newsletter"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        All issues
      </Link>

      <NewsletterEditor
        issue={data.issue}
        stories={data.stories}
        editions={editions.map((e) => ({
          id: e.id,
          title: e.title,
          weekStart: String(e.weekStart),
        }))}
        appUrl={siteUrl()}
      />
    </div>
  )
}
