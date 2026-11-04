# Discovery: camp photos

Status: discovery only (PRD §9). Cards don't depend on photos.

## Current capabilities and gaps

- **Schema:** no image fields on `programs`, `program_offerings`, `organizations` or `locations`. The only image-like columns are `user.image` (auth avatar) and `newsletter_issues.sponsor_image_url` (a plain URL field, with no rights or alt-text metadata).
- **Storage and delivery:** no object storage integration is connected (Neon only). Static assets come from `apps/web/public`. `next/image` is available and could handle responsive resizing for remote sources once their domains are allowlisted.
- **Ingestion:** the AI extraction pipeline (`packages/ingest`) produces text fields only. It doesn't download or classify images, and it must not take them from provider or competitor sites without authorization.
- **Rights and moderation:** there is no attribution, license, consent or review record. The admin review queue handles text fields only.
- **Claimed organizations:** organizations have `claimed` and `verified` flags, so a provider-upload flow could be limited to verified owners.

Gaps: storage, an upload UI, rights records, alt text, moderation, fallbacks and cleanup when a provider revokes permission.

## Options

### Minimal: one provider-supplied hero image per program

- **Data:** a `program_media` table (id, program_id, blob_url, width, height, alt_text, credit, license_basis `provider_owned|licensed`, consent_by_user_id, consent_at, review_status `pending|approved|rejected`, created_at).
- **Upload:** verified organization owners upload from the existing claimed-listing editor (private Blob store, served through a signed or proxied route). Alt text and a rights attestation are required before submitting.
- **Moderation:** new uploads go to the existing admin review queue. Only `approved` images render.
- **Display:** the detail page shows a 16:9 hero above the summary. Cards stay photo-free, so the hierarchy is unchanged.
- **Fallback:** without an image, the layout is exactly today's.

### Complete: galleries plus card thumbnails

- Up to 6 images per program, with sort order, a focal point for cropping, and per-image location tags for multi-site camps.
- Cards gain an optional 4:3 thumbnail on desktop (left column) and a top image on phones, but only for camps that have one. Photo-free cards must keep the same height on desktop to avoid a ragged grid.
- Responsive sizes come through `next/image`. A takedown and expiry flow handles revoked consent. Images of children require the provider to attest to parental media consent.
- Optional: an annual re-attestation reminder emailed to the organization's contact.

Example arrangements:
- *Photo-free card (today):* title, dates, ages, location, price, status, sessions link.
- *Photo-enabled card:* thumbnail on the left (desktop) or top (phone), with the same text stack. Status and price keep their position, so scanning stays consistent across mixed results.

## Effort

| Area | Minimal | Complete |
| --- | --- | --- |
| Implementation (schema, upload, review, render) | 4–6 days | 10–15 days |
| Provider onboarding and content | Outreach to verified orgs; most camps won't upload in the first season | Same, plus gallery curation |
| QA (upload, rights, alt text, fallbacks, a11y, phone) | 2 days | 4–5 days |
| Operating cost | Blob storage and transfer are low at current scale (dozens of camps, about 1 MB per image) | Grows with gallery size; still low |

Confidence: medium for the minimal option, low-medium for the complete option. The main uncertainty is how many providers will supply images, not the engineering. Risks: incomplete coverage making photo-free camps look worse, consent for images of minors, and moderation load.

## Recommendation

Photos deserve a **separate release** after the date-matching follow-up, starting with the minimal option, detail pages only. Decisions needed first:
1. Who may upload: verified organization owners only, or admins acting on emailed images?
2. What rights attestation and minor-consent language is required (legal review)?
3. Should cards ever show photos, given low expected coverage? Recommend no until most active camps have one.
4. Should a Vercel Blob (private) store be provisioned for this?
