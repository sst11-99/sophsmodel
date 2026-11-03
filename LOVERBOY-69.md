# Loverboy 69

25 September 2026 — website snapshot on `loverboy-69`, based on `main` at `f3f98423ebf4428e798271647b9105a1327a624d`.

## Current design

- Printed comp cards retain original model photographs, individually torn cream tape, and fixed top-right lighting.
- Soft curved gloss and fine neutral paper grain; thinner paper edges.
- Sophie’s top-right crease has 30% stronger light/dark contrast. Jennifer has a tapered lower-left handling dent. Duang has a shallow bottom-edge thumb dent toward the right.
- Hover and keyboard focus lift cards 5.5px. Dark base/contact shadows remain intact; the additional soft outer shadow uses only 3% of the preceding effect.
- Separate-photo profiles retain the pending local refinements: no visible captions, evenly spaced larger measurements, and measurement labels matching the model heading.

## Verification

90 relevant Node tests pass. The existing unrelated Meridian sibling-site navigation test is excluded. Inline roster scripts parse. Browser checks verified crease geometry/contrast, paper/gloss layers, and responsive layouts without horizontal overflow. Browser screenshot capture was unreliable; visual judgement remains with the user.

## Scope

This is a GitHub snapshot, not a production deployment. `main` remains the production baseline. All unchanged site code and public assets are inherited from that baseline. Private original photographs, machine-local previews and unrelated LINE demo experiments are excluded.

## Approved tape refinement

The shared `appendPaperTape` renderer adds more translucent wall contact, a slightly darker paper overlap and a faint ridge following the paper edge independently of tape rotation. Seeded variations scale with each card. See [reuse contract](TAPE-MATERIAL.md). Three new material tests pass; 93 relevant tests pass overall. Approved for Git backup; production unchanged.
