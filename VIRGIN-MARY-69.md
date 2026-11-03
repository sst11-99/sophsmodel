# Virgin Mary 69 — 17 September 2026

Release checkpoint for the approved application/profile refinements.

- Optional Walking video link tile; no video hosting or automatic external fetch.
- Final tile order: Walking video, Other, Portfolio. Other and Portfolio share rounded light-grey surfaces and plus placeholders, each retaining four optional photo uploads.
- English/Thai instructions identify Instagram, Facebook, TikTok and Google Drive. Small X cancels link edits, Done saves; clearing the field and Done removes a saved link.
- Nullable walking_video_url database field with HTTPS/length validation. Existing applicants LINE notification includes the URL; no casting-group changes.
- Four-photo model profiles allocate available viewport height to photos, keeping measurements and Book Model visible. Portrait phones use 2×2; wider layouts use four columns. Images retain their proportions. Accessibility overflow is retained for extreme windows/text enlargement.

## Verification and limits

77 Node tests passed before this checkpoint. Phone 390×844, iPad 820×1180 and 1180×820, desktop 1440×1000 measured no profile overflow and visible booking controls. Walking link open/paste/save tested in browser. Live source byte checks performed after publishing. A real walking-link application through to LINE has not been sent; no synthetic applicant was added for this release.

No new dependencies or permissions. Existing unrelated local changes are excluded from this checkpoint. Database migration is additive; rollback should restore website/formatter code while leaving the nullable column to preserve received links.
