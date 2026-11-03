# SOPHS website — current state

Verified 3 October 2026 in the authorized Supabase/Vercel dashboards and hosted browser.

The public taped-model roster and applications remain public. Login is invitation-only, public signups disabled. Approved applicants may be invited before signing. Initial application photos remain separate from later private comp-card collections.

Callum approved the agency inbox as Sophie’s test identity. The confirmed account is assigned the model side of Sophie’s private collection: 527 archive JPGs, 108,910,478 bytes, all storage paths verified before assignment. Imported agency and model passes contain 1,054 choices; agency baseline is the private selection-snapshots/20261002-full-label-pass/after.json and model pass is current review-selections.json. Originals and imports remain outside website Git/deployment assets. No extra added-media file existed.

Hosted authenticated workspace loads Sophie’s name, 527 photos, 294 kept, 233 rejected, no favourites or unreviewed, and 10 agency/model differences. A favourite change survived reload, then was restored to Keep; two verification edits remain honestly recorded in audit history. Older actorless choices are marked imported rather than dated as new model edits. Membership is model only; no agency editing grant was added.

Cloud loading now paginates all choices and batches private signed URLs by 100. Hosted uploader preserves JPEG/PNG/WebP up to 25 MB, and converts HEIC/HEIF on-device to high-quality JPEG without resizing (quality .95). Original HEIC bytes are not stored; larger originals can be shared through album links. Existing heic-to 1.5.2 CSP build is self-hosted with its license; script-src stays self, worker-src narrowly allows blob workers. A real macOS-generated HEIC completed conversion under deployed CSP in example mode, reaching the expected demo upload refusal; no test photo was stored.

Release commit c08a868e8853a4a92e0738ac1448ba2f6aac7987; Vercel production dpl_GbYa868TC2MNuLAXGySkWhMRf2nc READY. Fourteen focused website tests pass, including 527 photos/1,054 choices, reversed signing responses, existing-choice grants and professional-sized HEIC/JPEG handling. Independent review found and resolved the blob-worker CSP blocker. Screenshot /tmp/sophs-sophie-private-workspace.png.

Next: let Sophie test the hosted workspace. Categories and job matching are deferred by Callum. Profile/application linkage and agency account administration remain separate future work. Galleries use originals rather than thumbnails; adding each photo reloads the collection, a future bulk-upload performance improvement. Keep personal-email deliverability under review; current Gmail confirmation and magic-link delivery were verified earlier today.

Earlier state: [workspace history](2026-10-03-sophie-workspace-history.md), [portal implementation](MODEL-PORTAL.md). Local combined views: http://127.0.0.1:4191/website-preview.
