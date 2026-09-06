# Fish school expansion — 2026-09-06

The request was to increase both variety and density. The default population is
72 (29 previous residents plus 43 arrivals), with 16 species and capacity 96.
The additions are 10 yellow tangs, 8 palette surgeonfish, 10 longfin bannerfish,
and 15 lyretail anthias. Full saves retain all existing animals. Migration version
3 runs once and preserves coins, upgrades and existing fish state.

## Original models and references

The models are original procedural geometry; no reference photographs or external
model assets are redistributed. Body length is measured nose to tail; fin height
is not used to resize the body. Sizes are representative game choices, not maxima.

- Yellow tang, 20 cm: yellow compressed body and pointed snout.
  [Georgia Aquarium](https://www.georgiaaquarium.org/animal/yellow-tang/).
- Palette surgeonfish, 25 cm: blue body, dark lateral pattern and yellow tail.
  [Aquarium of the Pacific](https://www.aquariumofpacific.org/onlinelearningcenter/species/palette_surgeonfish).
- Longfin bannerfish, 20 cm: two dark bands and a long dorsal streamer.
  [Australian Museum](https://australian.museum/learn/animals/fishes/longfin-bannerfish-heniochus-acuminatus-linnaeus-1758/).
- Lyretail anthias, 15 cm: stylized orange/pink palette and forked tail.
  [Australian Museum](https://australian.museum/learn/animals/fishes/orange-basslet-pseudanthias-squamipinnis/).

## Rendering and behavior

Sardines, gobies and the four new species use one InstancedMesh per prepared model
part. Geometry and materials are shared, but each fish's tail, fins, pose, feeding,
growth and save state remain independent. Observation mode filters instance counts
and restores the full school on return. Their bodies do not cast dynamic shadows.

Schools circle separate targets and depth bands around the caretaker, including
when the caretaker explores the expanded city. Food still attracts individual fish.
Whale and manta limits remain unchanged. This is a peaceful stylized sanctuary,
not an ecological compatibility simulation.

## Validation

39 Node tests passed, including finite model geometry and triangle budgets,
legacy/full-capacity migration, feeding and save roundtrips, separate school
targets, animated instance transforms and hiding unused instances. Production
build uses `/fishslop/`. The existing bundle-size warning remains.

Browser benchmark, local in-app browser at 1422 × 800 and pixel ratio 1.25:

| Residents | Draw calls | Triangles | Median frame | P95 frame | Median CPU submit |
| --- | ---: | ---: | ---: | ---: | ---: |
| 72, default roster | 300 | 810,051 | 8.3 ms | 9.2 ms | 1.8 ms |
| 96, default plus mixed purchases | 421 | 946,927 | 8.4 ms | 16.7 ms | 2.7 ms |

Run `/tools/performance.html?count=72&mixed&roster` or `count=96` to reproduce.
Each sample discards 60 warm-up frames and measures 180 frames. These short local
samples do not establish performance on mobile or all devices. The final blue
pattern edge adjustment only changed vertex colors after these samples.
All 16 models were inspected in the review grid; live-game selection and close
observation of an instanced palette surgeonfish worked without console errors.
