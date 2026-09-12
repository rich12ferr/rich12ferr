/**
 * Newsletter data access — the weekly digest's read/write path.
 *
 * Kept separate from `queries.ts` (the directory search path) the same way
 * `notify.ts` is: this is a self-contained subsystem with its own lifecycle
 * (subscribe → issue → send → engagement) and doesn't share the offering/
 * ranking machinery. It layers on top of the existing `weekly_editions`
 * content rather than duplicating it.
 */

import { and, asc, desc, eq, gte, isNotNull, sql } from "drizzle-orm"
import { db } from "./client"
import {
  newsletterIssues,
  newsletterSends,
  newsletterSubscribers,
  weeklyEditions,
  weeklyStories,
  type NewsletterIssueRow,
} from "./schema"

/* -------------------------------------------------------------------------- */
/*  ID + token helpers (mirrors the conventions in queries.ts)                */
/* -------------------------------------------------------------------------- */

function newSubscriberId(): string {
  return `nsub_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

function newIssueId(): string {
  return `niss_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

function newSendId(): string {
  return `nsnd_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
}

/**
 * The capability token behind the one-click, login-free unsubscribe link every
 * issue footer carries. Two concatenated uuids (not the truncated id) so it
 * stays unguessable — matching `queries.ts`'s alert unsubscribe token.
 */
function newUnsubscribeToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "")
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/* -------------------------------------------------------------------------- */
/*  Subscribe / unsubscribe                                                   */
/* -------------------------------------------------------------------------- */

export type SubscribeResult = {
  status: "subscribed" | "already_subscribed" | "resubscribed"
  email: string
}

/**
 * Opt an email into the weekly digest. Idempotent and safe to call from a
 * logged-out form:
 *   - brand new address → inserted as subscribed
 *   - previously unsubscribed → flipped back to subscribed (keeps the same row
 *     and token so its history stays intact)
 *   - already subscribed → no-op, reported back so the UI can say so
 *
 * A single `onConflict` upsert can't express the "only touch timestamps when
 * actually (re)subscribing" branch cleanly, so we read-then-write. At <100
 * signups the extra round trip is irrelevant and the branch stays readable.
 */
export async function subscribeToNewsletter(
  rawEmail: string,
  source?: string,
): Promise<SubscribeResult> {
  const email = normalizeEmail(rawEmail)

  const [existing] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1)

  if (!existing) {
    await db.insert(newsletterSubscribers).values({
      id: newSubscriberId(),
      email,
      status: "subscribed",
      source: source ?? null,
      unsubscribeToken: newUnsubscribeToken(),
    })
    return { status: "subscribed", email }
  }

  if (existing.status === "subscribed") {
    return { status: "already_subscribed", email }
  }

  await db
    .update(newsletterSubscribers)
    .set({ status: "subscribed", subscribedAt: new Date(), unsubscribedAt: null })
    .where(eq(newsletterSubscribers.id, existing.id))
  return { status: "resubscribed", email }
}

/**
 * Disable a subscription via its capability token. Idempotent and login-free:
 * clicking twice is harmless, an unknown token returns null so the page shows a
 * graceful message instead of throwing. Returns the email on success so the
 * confirmation screen can echo which address was removed.
 */
export async function unsubscribeFromNewsletterByToken(
  token: string,
): Promise<{ email: string } | null> {
  const [row] = await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.unsubscribeToken, token))
    .returning({ email: newsletterSubscribers.email })
  return row ?? null
}

/** Unsubscribe by email — backs the "manage on the Alerts page" entry point where no token is in hand. */
export async function unsubscribeFromNewsletterByEmail(
  rawEmail: string,
): Promise<{ email: string } | null> {
  const email = normalizeEmail(rawEmail)
  const [row] = await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(
      and(eq(newsletterSubscribers.email, email), eq(newsletterSubscribers.status, "subscribed")),
    )
    .returning({ email: newsletterSubscribers.email })
  return row ?? null
}

/** All currently-subscribed rows — the audience a send fans out to. */
export async function activeSubscribers() {
  return db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "subscribed"))
    .orderBy(asc(newsletterSubscribers.subscribedAt))
}

/* -------------------------------------------------------------------------- */
/*  Issues (admin compose path)                                               */
/* -------------------------------------------------------------------------- */

export type NewIssueInput = {
  editionId?: string | null
  subject: string
  intro?: string | null
  sponsorName?: string | null
  sponsorBlurb?: string | null
  sponsorUrl?: string | null
  sponsorImageUrl?: string | null
}

export async function createIssue(input: NewIssueInput): Promise<NewsletterIssueRow> {
  const [row] = await db
    .insert(newsletterIssues)
    .values({
      id: newIssueId(),
      editionId: input.editionId ?? null,
      subject: input.subject,
      intro: input.intro ?? null,
      sponsorName: input.sponsorName ?? null,
      sponsorBlurb: input.sponsorBlurb ?? null,
      sponsorUrl: input.sponsorUrl ?? null,
      sponsorImageUrl: input.sponsorImageUrl ?? null,
      status: "draft",
    })
    .returning()
  if (!row) throw new Error("Failed to create newsletter issue")
  return row
}

export async function updateIssue(
  id: string,
  patch: Partial<NewIssueInput>,
): Promise<NewsletterIssueRow | null> {
  const [row] = await db
    .update(newsletterIssues)
    .set({
      ...(patch.editionId !== undefined ? { editionId: patch.editionId } : {}),
      ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
      ...(patch.intro !== undefined ? { intro: patch.intro } : {}),
      ...(patch.sponsorName !== undefined ? { sponsorName: patch.sponsorName } : {}),
      ...(patch.sponsorBlurb !== undefined ? { sponsorBlurb: patch.sponsorBlurb } : {}),
      ...(patch.sponsorUrl !== undefined ? { sponsorUrl: patch.sponsorUrl } : {}),
      ...(patch.sponsorImageUrl !== undefined ? { sponsorImageUrl: patch.sponsorImageUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(newsletterIssues.id, id))
    .returning()
  return row ?? null
}

/** Every issue newest-first for the admin list. */
export async function listIssues() {
  return db.select().from(newsletterIssues).orderBy(desc(newsletterIssues.createdAt))
}

export async function getIssue(id: string): Promise<NewsletterIssueRow | null> {
  const [row] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, id)).limit(1)
  return row ?? null
}

/**
 * An issue plus everything the email template needs to render: the linked
 * edition's stories (the bite-sized summaries) in display order. Stories are
 * pulled live from `weekly_stories` rather than copied onto the issue, so the
 * newsletter always reflects the edited edition up until the moment it's sent.
 */
export async function getIssueForRender(id: string) {
  const issue = await getIssue(id)
  if (!issue) return null

  const stories = issue.editionId
    ? await db
        .select()
        .from(weeklyStories)
        .where(eq(weeklyStories.editionId, issue.editionId))
        .orderBy(asc(weeklyStories.sortOrder), asc(weeklyStories.id))
    : []

  const edition = issue.editionId
    ? ((await db
        .select()
        .from(weeklyEditions)
        .where(eq(weeklyEditions.id, issue.editionId))
        .limit(1)) ?? [])[0] ?? null
    : null

  return { issue, edition, stories }
}

/** Published editions for the compose dropdown, newest first. */
export async function publishedEditionsForCompose() {
  return db
    .select({
      id: weeklyEditions.id,
      title: weeklyEditions.title,
      weekStart: weeklyEditions.weekStart,
    })
    .from(weeklyEditions)
    .where(eq(weeklyEditions.published, true))
    .orderBy(desc(weeklyEditions.weekStart))
}

/* -------------------------------------------------------------------------- */
/*  Sends (delivery + engagement)                                             */
/* -------------------------------------------------------------------------- */

export type SendableRow = {
  id: string
  email: string
  status: string
  /** Lives on the subscriber, joined in so the sender can build the footer link. */
  unsubscribeToken: string
}

/**
 * Ensure a per-recipient send row exists for every active subscriber of this
 * issue, then return all of them joined to the subscriber's unsubscribe token.
 *
 * Idempotent via `onConflictDoNothing` on the unique (issue, subscriber)
 * index: calling it again after a partial failure re-creates nothing and the
 * caller can re-send only the rows still in a non-sent state. That safe-retry
 * property is why the whole send isn't a single fire-and-forget insert.
 */
export async function ensureSendRows(issueId: string): Promise<SendableRow[]> {
  const subscribers = await activeSubscribers()
  if (subscribers.length === 0) return []

  await db
    .insert(newsletterSends)
    .values(
      subscribers.map((s) => ({
        id: newSendId(),
        issueId,
        subscriberId: s.id,
        email: s.email,
        status: "queued" as const,
      })),
    )
    .onConflictDoNothing({ target: [newsletterSends.issueId, newsletterSends.subscriberId] })

  return db
    .select({
      id: newsletterSends.id,
      email: newsletterSends.email,
      status: newsletterSends.status,
      unsubscribeToken: newsletterSubscribers.unsubscribeToken,
    })
    .from(newsletterSends)
    .innerJoin(newsletterSubscribers, eq(newsletterSubscribers.id, newsletterSends.subscriberId))
    .where(eq(newsletterSends.issueId, issueId))
}

export async function markSendResult(
  sendId: string,
  result: { resendEmailId?: string | null; status: "sent" | "failed"; error?: string | null },
) {
  await db
    .update(newsletterSends)
    .set({
      resendEmailId: result.resendEmailId ?? null,
      status: result.status,
      error: result.error ?? null,
      sentAt: result.status === "sent" ? new Date() : null,
    })
    .where(eq(newsletterSends.id, sendId))
}

/** Flip an issue to sent and snapshot how many recipients it went to. */
export async function markIssueSent(issueId: string, recipientCount: number) {
  await db
    .update(newsletterIssues)
    .set({ status: "sent", sentAt: new Date(), recipientCount, updatedAt: new Date() })
    .where(eq(newsletterIssues.id, issueId))
}

/**
 * Apply an engagement event from the Resend webhook. Matched by
 * `resendEmailId` (globally unique per email) rather than address, and only
 * ever advances state — a late `delivered` after an `opened` won't wipe the
 * open timestamp, so out-of-order webhook delivery can't corrupt the funnel.
 */
export async function recordEngagementEvent(
  resendEmailId: string,
  event: "delivered" | "opened" | "bounced",
) {
  const now = new Date()
  if (event === "delivered") {
    await db
      .update(newsletterSends)
      .set({ deliveredAt: now, status: sql`CASE WHEN ${newsletterSends.status} = 'opened' THEN 'opened' ELSE 'delivered' END` })
      .where(and(eq(newsletterSends.resendEmailId, resendEmailId), sql`${newsletterSends.deliveredAt} IS NULL`))
    return
  }
  if (event === "opened") {
    await db
      .update(newsletterSends)
      .set({ openedAt: now, status: "opened" })
      .where(and(eq(newsletterSends.resendEmailId, resendEmailId), sql`${newsletterSends.openedAt} IS NULL`))
    return
  }
  // bounced
  await db
    .update(newsletterSends)
    .set({ bouncedAt: now, status: "bounced" })
    .where(eq(newsletterSends.resendEmailId, resendEmailId))
}

/* -------------------------------------------------------------------------- */
/*  Analytics / KPIs                                                          */
/* -------------------------------------------------------------------------- */

/** Total currently-subscribed and all-time unsubscribed counts. */
export async function subscriberTotals() {
  const [row] = await db
    .select({
      subscribed: sql<number>`count(*) filter (where ${newsletterSubscribers.status} = 'subscribed')::int`,
      unsubscribed: sql<number>`count(*) filter (where ${newsletterSubscribers.status} = 'unsubscribed')::int`,
    })
    .from(newsletterSubscribers)
  return row ?? { subscribed: 0, unsubscribed: 0 }
}

/**
 * Daily subscribe and unsubscribe counts over the last `days` days, for the
 * KPI trend chart. Two separate date-bucketed aggregates unioned into one
 * row-per-day shape the chart can plot directly.
 */
export async function subscriptionTrend(days = 90) {
  const subs = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${newsletterSubscribers.subscribedAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(newsletterSubscribers)
    .where(gte(newsletterSubscribers.subscribedAt, sql`now() - (${days} || ' days')::interval`))
    .groupBy(sql`date_trunc('day', ${newsletterSubscribers.subscribedAt})`)

  const unsubs = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${newsletterSubscribers.unsubscribedAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(newsletterSubscribers)
    .where(
      and(
        isNotNull(newsletterSubscribers.unsubscribedAt),
        gte(newsletterSubscribers.unsubscribedAt, sql`now() - (${days} || ' days')::interval`),
      ),
    )
    .groupBy(sql`date_trunc('day', ${newsletterSubscribers.unsubscribedAt})`)

  const byDay = new Map<string, { day: string; subscribed: number; unsubscribed: number }>()
  for (const r of subs) byDay.set(r.day, { day: r.day, subscribed: r.count, unsubscribed: 0 })
  for (const r of unsubs) {
    const existing = byDay.get(r.day)
    if (existing) existing.unsubscribed = r.count
    else byDay.set(r.day, { day: r.day, subscribed: 0, unsubscribed: r.count })
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
}

export type IssueEngagement = {
  issueId: string
  subject: string
  sentAt: Date | null
  recipientCount: number
  delivered: number
  opened: number
  bounced: number
  openRate: number
}

/** Per-issue delivery + open KPIs for sent issues, newest first. */
export async function issueEngagement(): Promise<IssueEngagement[]> {
  const rows = await db
    .select({
      issueId: newsletterIssues.id,
      subject: newsletterIssues.subject,
      sentAt: newsletterIssues.sentAt,
      recipientCount: newsletterIssues.recipientCount,
      delivered: sql<number>`count(${newsletterSends.deliveredAt})::int`,
      opened: sql<number>`count(${newsletterSends.openedAt})::int`,
      bounced: sql<number>`count(${newsletterSends.bouncedAt})::int`,
    })
    .from(newsletterIssues)
    .leftJoin(newsletterSends, eq(newsletterSends.issueId, newsletterIssues.id))
    .where(eq(newsletterIssues.status, "sent"))
    .groupBy(
      newsletterIssues.id,
      newsletterIssues.subject,
      newsletterIssues.sentAt,
      newsletterIssues.recipientCount,
    )
    .orderBy(desc(newsletterIssues.sentAt))

  return rows.map((r) => ({
    ...r,
    // Open rate is opens over delivered (not over recipients) so a bounce
    // doesn't drag the rate down — an email that never arrived can't be opened.
    openRate: r.delivered > 0 ? r.opened / r.delivered : 0,
  }))
}
