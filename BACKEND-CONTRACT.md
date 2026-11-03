# Virgin 1 backend contract and completion order

7 September 2026. This is the implementation target for the remaining launch gates, **not a description of an already deployed backend**. Keep the existing UUIDs, applicant fields, private bucket and structured channels compatible. Virgin 2's male AI example should be a content change, not a database rewrite.

## Applicant intake

Use one versioned server contract with three stages: create an upload session, upload to reserved private paths, finalize the application. A session has a stable random ID, an expiring high-entropy capability stored hashed, a maximum of six reserved photo slots, a request fingerprint and explicit pending/finalized/expired states. The browser retains the attempt identity for retries without storing applicant details in localStorage.

The server validates the application, adult/accuracy/data-use confirmation, independent opportunity-email choice, measurements, permitted channel keys, field lengths and photo manifest. Check file type and bytes rather than trusting a filename. Issue narrowly scoped upload authorizations after abuse/quota checks. Reject arbitrary object paths and manifests belonging to another session.

Finalization verifies the uploaded objects and inserts the application plus a notification-outbox event in **one database transaction**. Repeated finalization with the same authorized session and fingerprint returns the same receipt. A conflicting payload is rejected. A lost response must not create another application. Keep privileged functions in the private schema with fixed search paths; no public applicant SELECT/UPDATE permission is needed.

Expire incomplete sessions and remove only their proven unreferenced objects after a grace period. Cleanup uses the storage API, not SQL deletion of storage metadata alone. Record attempts and failures. Finalized objects are never included in the orphan-cleanup selection.

Deploy the server path and test it before switching the browser. Then remove the old anonymous direct-write grants once the supported client cutover is verified. Record the compatibility window explicitly: leaving the old route available means the new rate limit is not yet an effective global intake limit.

## Review and notifications

Keep the initial staff review in an authenticated surface with explicit reviewer membership. The public catalogue must never be a view of applicant rows. Review photographs through authorized, short-lived access.

A private outbox owns delivery state: event ID, application ID, destination reference, attempt count, next attempt, last error, delivered timestamp and dead-letter state. A worker delivers a minimal notification with an authenticated review link; it must not put applicant contact details or photographs in a notification preview. Retry independently of the original application request. Alert on dead letters and aging pending sessions.

Start with one chosen notification destination. For LINE, use an owner-controlled Official Account/Messaging API channel. Validate webhook signatures using the original body, record the event durably, deduplicate `webhookEventId`, acknowledge promptly and process asynchronously. Preserve a stable outbound retry key when supported; do not assume an API timeout means the message was not delivered. A form's LINE handle is not a Messaging API recipient ID or permission to message the applicant. [LINE receiving guide](https://developers.line.biz/en/docs/messaging-api/receiving-messages/), [Messaging API reference](https://developers.line.biz/en/reference/messaging-api/nojs/).

## Casting and the 30% commission

Future additive records should reference existing applications:

| Record | Stable information to preserve |
| --- | --- |
| Casting source | Platform, exact source URL/account/group, owner, access method, permission, last successful check and enabled state |
| Casting lead | Source event ID/canonical URL, dedupe key, received/posted times, original brief version, location/dates, known and unknown requirements, retracted/expired state |
| Decision | Lead version, applicants considered, availability, selected applicant, human reason, rejected alternatives, decision maker/time, overrides and rubric/model version |
| Booking | Agreed terms, confirmed work, cancellation/refund state, outcome, currency, amount collected, commission rate and calculation basis |
| Delivery event | Stable event identity and notification status, separate from the lead or booking itself |

The intended commission is **3,000 basis points (30%)**. Preserve that agreed rate per booking. Require the calculation basis, expenses/tax treatment and reversal rules before calculating an invoice. A lead or tentative match is not earned commission.

Human explanations are observations to evaluate alongside actual booking outcomes. They do not automatically update a model or establish a fair decision rule. Begin with human selection; later suggestions need a versioned evaluation set, uncertainty and override handling. Applicant data remains in Supabase; chats carry minimal lead summaries and references.

## Social access strategy

Use authorized, manually forwarded casting links/posts first. Then automate exact supported sources. Neither Codex nor Grok acquires broader platform permission merely by using a browser. Her reports no working LINE/Meta connector or management credentials on her seat.

Meta's published Instagram collection supports specific professional-account operations and states that its Facebook Login route cannot access consumer accounts. It is not a universal Instagram group-feed reader. [Meta's Instagram API collection](https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login). The direct Meta Groups deprecation announcement remained rate-limited during this recheck; generic Facebook-group scanning remains unverified, not promised.

For each requested source, prove a permitted read path and capture/update/delete semantics before enabling a schedule. Hourly polling is an option only for sources whose access and rate limits support it. Show failures and last successful checks rather than silently missing posts. No polling routine, account connection or external notification was created in this checkpoint.

## Completion order

1. Restore the approved GitHub publishing route and reliable Supabase management access. Dashboard overview access alone is insufficient for schema changes and restore tests.
2. Implement/test upload sessions, idempotent finalization and orphan cleanup while preserving the existing data model.
3. Implement the staff review path and transactional outbox; connect the chosen recipient/channel.
4. Test two synthetic submissions, interrupted upload, lost insert response, duplicate events, denied anonymous reads and authorized private photo review. Clean up only identified test records and objects. Do not retrieve real applicants for the test.
5. Verify database and photo backups separately, restore to an isolated target, and document a repeatable recovery procedure. The observed Free-plan dashboard showed no backups; no recovery claim is justified yet.
6. Deploy, verify the live client/server contract, monitor failures and tag the final release. Keep Virgin 1 marked incomplete until these gates pass.

Inputs still needed: approved source URLs, notification recipients and LINE account ownership; commission basis before billing. GitHub MCP authentication is currently rejected. No new subscription, dependency or permission expansion was made during this recheck.
