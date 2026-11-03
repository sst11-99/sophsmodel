# Shared masking-tape material

25 September 2026 — local refinement after Loverboy 69; visual approval pending.

`appendPaperTape(svg, { paper: [x, y, width, height], seed, id }, make)` in `models-concept.html` is the single tape renderer. `finishCard` calls it automatically for every roster card and flip artwork. New models should supply their normal `wallCards` asset and paper bounds; do not draw separate tape or bake it into model photographs.

- `seed` is the stable asset key (currently `card.file`); `id` must be unique per SVG instance.
- All geometry scales with paper width. Seeded width, height, position, angle, tear profile, small edge irregularities, pigment and fibres vary between assets but remain fixed during rerenders.
- The wall portion uses translucent cream pigment (48–55% alpha). The paper overlap adds a small darker pigment layer, clipped to the intersection of tape and paper.
- The torn silhouette and fibres rotate; the material boundary and faint paired highlight/shadow follow the actual horizontal paper edge. Never rotate the paper-edge line with the strip.
- A thin upper highlight and lower shadow describe tape bending over paper thickness. Lighting remains top-right. Keep these faint and preserve existing card gloss and hover styling.
- Tape is layered above card gloss. Original photographs are unchanged.

Reference: user-supplied `/Users/bot/Downloads/IMG_3468.HEIC`, inspected locally. The original remains outside the public website bundle. No image generation is needed for this procedural SVG material.

Regression checks: `node --test tests/tape-material.test.mjs` covers stable variation, substrate-boundary alignment at different strip angles, and scaling. Browser visual review remains the criterion for naturalness.
