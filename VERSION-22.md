# Version 22 — alternate models roster

13 September 2026. Separate preview branch, not a replacement of production.

## Responsive release — 13 September 2026

This release supersedes the earlier local-only and concept-footer notes below. The approved cleaner roster is published separately on version-22: no footer or original-layout link, nine names per division, small system-sans labels, consistent SM-26 sizing and the rounded division toggle. Tablet layout remains three columns through 1200px; larger desktops use five columns within a centered 1700px maximum. The device preview now offers phone, iPad portrait, iPad landscape and desktop sizes.

Browser DOM checks found nine cards and no horizontal overflow at phone (~390px), iPad portrait (820px), iPad landscape (~1180px) and desktop (~1440px). Division switching and keyboard profile opening were checked in the browser; the profile contains four labelled images. Prior dependency-free script smoke checks cover click/drag/keyboard and close behavior. Browser screenshot/coordinate scaling was unreliable, so these are responsive DOM checks, not a claim of native-device visual certification.

Scope: only models-concept.html, models-mobile.html and this release record are included in the Git push. Main, application, Supabase and LINE remain unchanged. Invented names and blank positions remain preview content. True transparent cutouts and approved male photography are still outstanding; the current portrait is an original JPEG, not an alpha cutout. Rollback for this preview is the previous branch commit 84b9340564d5fe34f974ec3a1c125106833195ac or the earlier hosted preview recorded below.

## Earlier local revision — 13 September, softer roster

Latest user-approved direction: this is the intended replacement layout, not a comparison page. Removed the entire footer and Original layout link; SM-26 is non-navigating text matching the existing site-code size (11px below768px, 13px from768px). Nine entries per division and the division toggle remain unchanged. This supersedes the concept-footer decision below. Names remain fictional development content; adopting the layout does not establish real roster membership or publish it. Production integration/deployment and the real cutouts remain outstanding.

User requested the original site's system-sans feel rather than Yeezy-like typography. Local `models-concept.html` now uses smaller system-font names/captions, keeps Plex only for SM-26, replaces repeated AI/open-space wording with invented display names, and adds a rounded two-position Female/Male control with tap, drag, keyboard and reduced-motion handling. Both divisions have nine concept names; only Ploy has the existing four photographs. Other names deliberately have no invented photographs yet. A single “Concept roster” footer distinguishes this from a real agency roster. SMR-F/M references appear inside profiles.

The radial fade and repeated faded female silhouettes were removed. A second built-in image-generation extraction returned opaque checkerboard pixels (`hasAlpha: no`) and was rejected. A question to Callum asks approval for Mac-native Remove Background on a copy; no unapproved fallback or installation performed. Original neutral-background JPEG remains pending a real cutout. Failed attempt and exact prompt are recorded under the SOPHS asset library, not used by the site.

Zampolli consultation completed through existing gbot CLI with marker `SOPHS-ROSTER-20260913`: front, side profile and two full-length images match the existing four assets; keep editorial/portfolio separate and cutouts display-only. His proposed Shorts/Jeans labels were not adopted because Callum/Sophie previously requested clothing-neutral labels. Current labels describe existing images honestly: Close-up, Side profile, Full length, Full length · alternate. No jeans image is mislabeled mid-length. This is attributed agent advice, not a universal agency requirement.

This revision is local only at http://127.0.0.1:4176/models-mobile.html ; the hosted preview below is the earlier version. Script syntax, HTTP 200 and a dependency-free VM smoke test passed for division click/keyboard/drag, nine names in each division and four-image profile open/close; no fresh browser interaction QA claimed. Live application, backend, Git main and hosted branch remain unchanged by this revision.

## Changes

- Borderless roster study at `models-concept.html`, with original model profile photography and grey open positions.
- Three-column phone layout inspired by the live Yeezy mobile catalogue inspected at 390px; two columns below 350px, three on tablet, five on desktop.
- `models-mobile.html` offers a 390px embedded phone preview on a computer.
- Female/Male controls and an accessible native profile dialog. AI examples and open positions are labelled.
- Original `/#models` and application remain unchanged. No database, applicants or LINE modifications.

## Known limits

Images are original JPEGs with softly feathered edges, not true transparent cutouts. A generation attempt was rejected for altered identity and missing transparency. Precise background extraction remains unfinished. No approved male-model images found in the project's asset library or targeted Downloads search; male positions remain empty. No fake people have been added to the live roster.

## Rewind

Branch `version-22` starts from main commit `b7ecaa7292febdfcf9e689b0612cfab899182920`. Main and the existing production deployment remain intact. To discard this experiment, use the existing production website; no production rollback is needed. Future publication should promote a reviewed preview, retaining the previous production deployment for rollback. Version 22 contains only this roster experiment; unrelated uncommitted application improvements are intentionally excluded.

## Preview delivery

Hosted preview: https://modeling-company-ayc8cp8fu-callum-viaas-projects.vercel.app/models-concept.html

Phone frame: https://modeling-company-ayc8cp8fu-callum-viaas-projects.vercel.app/models-mobile.html

Vercel deployment `dpl_FYhRWULzGTh6bu7EVzsCGj4wbAHi`, target preview, READY. Git push did not trigger an observed deployment; an explicit allowlisted static preview was created. It contains only the two concept pages plus a root redirect; the four approved public reference images and font load from the existing production asset URLs. No backend code or private records shipped. This depends on those stable production asset paths.
