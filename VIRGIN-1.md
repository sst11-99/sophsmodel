# Virgin 1 — intake checkpoint and launch gates

7 September 2026, Bangkok. Owner: Callum / Sophie. Sophie’s specific design choices take precedence when they differ.

## Release status

Current published runtime: `dfc83c611f6399da3f724c7a5df2bbdd45889982` at https://modeling-company.vercel.app/. This checkpoint records the audit, not a claim that every integration is live. Virgin 2 adds an explicitly AI-generated male example; the current female example is also AI-generated and is not an applicant.

Source, regression tests and migrations belong in this repository. Applicant records belong only in Supabase `model_applications`; private images belong in its `model-applications` bucket. Never put applicant uploads, secrets, screenshots of applicant records or database exports into git, the static deployment or an agent chat. Existing unused image assets are retained, not deleted. Production serving uses a deliberate file allowlist; `.vercelignore` is defense in depth for future CLI deployments.

## Follow-up recheck — 7 September, approximately 18:45 Bangkok

- **Local fix, not deployed:** form submission is locked while pending and after success, including when a photo-change callback runs. This prevents concurrent submit events and accidental repeat submission from the same form instance. Three new regression cases pass; the complete suite is now **43/43**. It does not solve a lost response followed by retry or a page reload; server-owned idempotency is still required.
- **Live public checks:** site, locale endpoint, application script and public Supabase experience options returned 200. Anonymous applicant SELECT returned 401. Git metadata, checkpoint/readme, migrations and script paths returned 404. Two initial fetch transport failures were checked individually with curl: backend.js returned 200 and README.md returned 404. The new application script differs from the deployed copy, as expected before publishing.
- **Supabase browser access recovered partially:** the signed-in project overview identified Meridian Group / modeling-company, healthy status, no advisor issues, latest migration `separate_application_channels`, and **No backups**. SQL Editor and migration-history pages remained blank after navigation/reload, so this does not establish fresh policy inspection, complete migration alignment or recovery readiness.
- **Publishing remains blocked:** GitHub MCP returned 401 Bad credentials. Supabase CLI 2.75.0 is installed but has no access token; it was not upgraded. No working Vercel connector is available here. Her independently reported Vercel `needsAuth` and no Supabase management connector on her seat. No push or deployment was performed.
- **Repeatable work saved:** [backend contract and completion order](BACKEND-CONTRACT.md); `scripts/check-live.cjs` performs read-only checks without creating/retrieving applicants. The new contract file is excluded by `.vercelignore`.
- **Grok alignment:** a short follow-up through her's native app confirmed LINE-first authorized forwarding, structured decisions/outcomes and the need for an interrupted-upload/duplicate-submit production drill. The 30% rate is recorded; calculation basis remains unset. No polling, messages to applicants or new integrations were activated.

The checkpoint is prepared locally. **Do not treat the public site as fully launch-ready or this checkpoint as a successful Virgin 1 push.** Remaining production work follows the contract below and needs working management/deployment access.

## Audit evidence

- Fresh local regression run: 40/40 pass. Covers platform switching, payload transport, photo failure preventing insert, consent serialization, routing, motion and translation.
- Fresh public API probe: active experience options return HTTP 200; anonymous application reads return HTTP 401. No applicant records were retrieved.
- Published asset HEAD checks: results recorded during audit; one transient network failure required a targeted recheck. No production application or photo was created during this audit.
- Earlier same-session management checks: RLS enabled, private bucket, column-specific anonymous insert grants, no public application SELECT/UPDATE, structured channel columns present, security advisor reported no findings. These are earlier evidence, not a fresh management audit.
- Fresh management checks are blocked: Supabase tools became unavailable. Current GitHub MCP authentication returns 401. Vercel connector is also unavailable. No new remote checkpoint/deployment can be claimed until access is restored.
- Local database migration filenames exist. Remote migration-history alignment and restore capability remain unverified. No dependencies installed or permissions expanded.

## Launch blockers / hardening work

1. **Prove one real end-to-end test:** designated synthetic applicant and non-personal fixture image, both divisions, exact structured channels, consent state, private image retrieval through an authorized reviewer, denied anonymous reads, then approved cleanup. Current mock transport tests do not prove a live insert/upload succeeds.
2. **Submission identity and retries:** `applicationPayload()` currently creates a new UUID each attempt. A lost response after a successful insert can lead to duplicate applications on retry. Use a server-owned, idempotent submission/finalization contract with stable attempt identity; do not solve this by granting anonymous update/read access.
3. **Upload lifecycle:** parallel uploads happen before row insertion. A failed upload or insert can leave orphan objects. Add upload sessions, manifest ownership/existence verification and a grace-period cleanup job that only removes verified unreferenced objects. Never delete by a broad bucket prefix.
4. **Abuse controls:** direct anonymous write paths have no application-level rate limit, bot challenge or quota. RLS restricts access, but is not spam protection. Four submissions can also manipulate automatic experience promotion. Put bounded server-side validation/rate limits before intake and promotion; preserve the user’s four-submission rule without treating four UUIDs as four verified people.
5. **Review/notification delivery:** no intake notification worker, retry queue/dead-letter path or production reviewer workflow is implemented here. Add a transactionally recorded notification event, deduplicated delivery and an authenticated review surface. Do not expose applicant data in notification previews.
6. **Operations:** verify database backups AND object-file backups, perform a restore drill, choose retention/deletion rules, record owners, monitor failed submissions and storage growth. A database backup alone is not evidence that image bytes are recoverable.
7. **Schema compatibility:** preserve UUID identifiers and existing primary contact/social fields; future normalized casting/booking tables reference applications rather than rewriting intake. Validate all constraints at the trusted boundary, including consent, age, file size/type, measurements and channel limits.

No backend can be promised to work forever without maintenance. Aim for stable contracts, additive migrations, portable records, tested recovery and observable failures.

## North Star

Approved sources → deduplicated casting brief → human notification → Callum/Sophie shortlist and decision with reasons → booking outcome → reviewed matching suggestions.

Supabase remains the source of truth, independent of Codex or Grok Bot. Proposed future records (not yet deployed): `casting_sources`, `casting_leads`, `lead_events`, `match_decisions`, `bookings`, `notification_outbox`. Keep original source URL/event ID, timestamps, source permission, brief version, known/unknown requirements, who decided, candidates considered, availability, reasons, overrides, outcome and model/rule version. Repeated delivery must not create repeated leads or notifications.

Human explanations are feedback, not automatic training or proof of a good rule. Review biases, rejected alternatives and actual outcomes; evaluate suggestions before granting any additional autonomy. Do not infer ethnicity, health or other sensitive traits from photographs, or automate job eligibility on them. Humans approve selection, outreach, commitments and payments. Learning does not happen simply because someone explained a decision in a chat: preserve structured feedback and versioned evaluation cases.

Commercial direction: **30% agency commission**. Before billing, confirm the base (gross booking fee, amount actually collected, or markup), tax/expenses, cancellation/refund handling, currency and who pays. Store the agreed rate and basis on each booking; no payment action or contract was authorized by this preparation.

## LINE / Meta / Grok preparation

Recommended first slice: humans forward allowlisted casting URLs/text into a controlled intake; deduplicate and notify; humans choose. Add LINE delivery/intake before attempting broad social monitoring.

LINE needs a user-owned Official Account, Messaging API channel, server-held secret/access token, approved recipient IDs and a public HTTPS webhook. Verify the signature against the original body, enqueue durably, acknowledge promptly, deduplicate `webhookEventId`, handle redelivery/out-of-order events and unsends. A typed LINE handle in the application is not a Messaging API user ID and is not permission to message that person. Group access must be explicitly authorized; no assumption that a bot can inspect all personal chats or historical groups.

Official LINE documentation: https://developers.line.biz/en/docs/messaging-api/receiving-messages/ (reviewed 7 September 2026).

Meta access must be verified per exact group/account and permission. Do not assume a generic Facebook Groups or Instagram group-scanning API exists. Current Meta documentation fetches were rate-limited during this audit; recheck official API support before implementation. Browser automation is session-dependent and needs permission/terms review, monitoring and a fallback; it is not equivalent to an API guarantee.

Consultation with **her**, CEO bot in Grok Bot, completed through its native app UI: she reports no connected Facebook/Instagram/LINE connector, Meta token or LINE receiver on her seat. She recommends manually forwarded allowlisted leads tonight, Codex owning intake/integration code, Grok summarizing/deduplicating lead cards, humans selecting. This is her reported capability inventory, not independently authenticated platform access. No routines, outreach, account changes or delegated builds were requested. Follow-up clarified the launch blockers and that reasons require evaluation rather than automatic training.

## Inputs for the next session

- Restore Supabase management and GitHub/Vercel authentication (do not paste credentials into chat).
- Supply approved Facebook group URLs, Instagram accounts and LINE sources plus 3–5 representative casting posts.
- Choose notification recipient(s) and channel; identify the LINE Official Account owner and authorized administrator.
- Supply a short casting rubric, one example human decision and expected outcome tracking.
- Confirm commission calculation basis and authorize the designated synthetic end-to-end test and cleanup.

Tonight’s completion gate is evidence of intake → private storage → authorized review → notification → human decision record, including retry and failure cases. Social account approval/access can be an external dependency; do not promise the deadline until those inputs and the live test are available.
