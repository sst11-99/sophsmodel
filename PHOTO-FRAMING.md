# Application photo framing — 13 September 2026

Update: the additive live Supabase migration is now applied and LINE formatter v5 is active (13 September). The complete upload baseline, including HEIC and photo controls, is included in the complete version-22 release. This supersedes the activation/older-branch limitations below. Frontend deployment evidence is recorded in the owner README.

Requested: clear, uncropped examples in consistent frames, front-facing mid-length plus a separate close-up. Seven slots now show Front · Mid-length, Front · Close-up, Side profile, Full length, Full length · Alternate, Portfolio, Other. The existing waist-up.jpg is a framing reference from the earlier image set, not a claim that it depicts the same person as the other guide images. All originals remain untouched. Uniform 3:4 containers use object-fit: contain; upload controls sit at the bottom, not over the face. Five single-photo slots plus two optional groups of four permit 13 files.

Storage uses a new mid-length path; existing paths remain valid. The SQL migration adds that one path and raises the manifest cap to 13. The LINE formatter splits 13 photos into 12 + 1 bubbles so no photo is dropped. No bucket is made public and no read/delete permissions are added.

Verification: local suite 64/64 passing. Browser loaded all five reference images, each with contain sizing and equal ~340×453px frame dimensions; seven inputs and English captions were present. Read-only Postgres regex checks validate the new path and reject a second file in that single-photo slot. No real applicant was submitted and no LINE message was sent.

Release boundary: Git version-22 only. Production Supabase still allows 12 photos and does not yet allow mid-length paths. Deploy the additive SQL migration and updated application-line-alert formatter before publishing the new frontend. Existing deployed function index.ts/authentication and group routing must be preserved. Live website and backend have not been changed by this release.

The working directory also contains earlier unpublished HEIC/photo-management/submission improvements. This Git patch applies only framing changes to the existing branch files, preserving that branch's other behavior; those older local changes are deliberately not bundled. The new input matches the branch's existing JPG/PNG accept list; local development retains HEIC support. Reconcile the established live upload baseline before any production rollout. Rewind to d6626c9ecfec13c5053b697c79b3a3e13adad143 to undo this branch patch.
