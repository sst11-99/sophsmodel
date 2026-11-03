# LINE notification services

Business context/status: [LINE application alerts](../../../../SOPHS%20Models/LINE-APPLICATION-ALERTS.md).

- `application-line-alert`: deterministic application summary and private signed-photo gallery. No AI. Environment: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_APPLICATION_GROUP_ID`; Supabase server credentials supplied by hosted runtime. Custom event-capability authentication and service-only RPCs; no anonymous applicant reads.
- `line-group-webhook`: HMAC-verified group discovery only. Environment adds `LINE_CHANNEL_SECRET`. Does not retain conversations or reply.

Keep transport reusable; each business owns its account, provider, secrets, destination and data. Do not put credentials in source. Keep this entire folder out of the public website serving bundle. Deploy only through Supabase.

Activated 9 September 2026 after signed discovery of the applicants group. The minute schedule delivered the user-authorized browser test summary and four-photo gallery on its first attempt. The test was explicitly queued because it preceded trigger activation; a fresh real submission remains the final insert-trigger check. See the operating record for evidence, limits and rollback. Tests: `node --test tests/*.test.mjs` from repository root.
