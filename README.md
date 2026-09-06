# Fishslop

A playable, cozy 3D aquarium game. Pilot a small submarine from a third-person chase camera, feed a neighborhood of fish, collect their coins, and grow your reef.

## Project prompt

Use the [整合版开发 Prompt](docs/prompt.md) for a reusable task brief covering gameplay, visual quality, species anatomy, scale, performance, validation, and delivery. The original English text and individual follow-up requests remain in [需求沿革](docs/prompt-history.md).

## Run locally

Requires Node.js 20.19+ (or 22.12+) and a WebGL2-capable browser.

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. Production build: `npm run build`. Preview it with `npm run preview`.

## Play

- **W / S / A / D:** move forward, backward, left, or right relative to the camera. The bow smoothly follows travel; turns bank the hull, and rising/diving pitches it.
- **Q / E:** dive / rise.
- **Arrow keys:** turn and pitch, or drag the water to steer.
- **Space:** release food. Hold to keep feeding. Food is free.
- **Shift:** boost; **Esc:** pause. The game also pauses when the tab loses focus.
- Swim near golden coins to collect them. Radar shows fish in orange, coins in gold, and your submarine in white.
- Press **B** or click **The dock** at the bottom right to open the shop. Buy fish and three levels each of food, propeller, and magnet upgrades.
- Fish grow every three meals, produce better coins as they grow, and stop earning when hungry. They never die of neglect.
- Build a reef of 10 fish and collect 500 coins to complete the first milestone. Continue playing afterward, up to 48 residents.
- Touch screens have directional, depth, and feed buttons. Drag the scene to steer.

Progress saves to local storage every five seconds, on purchases, and when leaving. Saved aquariums start paused at the welcome screen; no offline starvation. Sound is opt-in. There is no account or backend. Clear this site's browser storage to start over.

## Implementation

- `src/simulation.js`: deterministic simulation, fixed 60 Hz steps, input smoothing, tank boundaries, reef rock colliders, feeding AI, economy, progression, and validated save loading. Independent of the DOM and renderer.
- `src/pilot.js`: camera-independent hull heading, pitch, and banking with smooth shortest-path turns.
- `src/scene.js`: Three.js PBR rendering, environment reflections, chase camera, independent fin and propeller animation, coins, bubbles, and species-specific movement.
- `src/reef.js`: procedural branching and perforated fan corals, hollow sponges, layered plate corals, ribbon kelp, seagrass, irregular rocks, water surface, and animated caustics. Static geometry is batched by material.
- `src/main.js`: keyboard / pointer / touch input, UI, audio, pausing, and persistence.
- `tools/create_assets.py`: reproducible Blender modeling source. Both editable `.blend` sources and game `.glb` files are included under `public/models`.
- `tests/simulation.test.js` and `tests/pilot.test.js`: deterministic simulation, progression, steering, and save migration regression tests.
- `tools/smoke.mjs`: Chrome browser smoke test, requires the dev server on port 5173. Writes screenshots to `artifacts`.

```sh
npm test
node tools/smoke.mjs
node tools/check-controls.mjs
npm run assets  # optional; requires Blender on PATH
```

The submarine and fish are original Blender assets. The reef geometry is original procedural geometry. No commercial game assets are used. Fonts are DM Sans and Manrope via Google Fonts, with system fallbacks. Three.js model loading follows its [official glTF guide](https://threejs.org/manual/en/loading-3d-models.html).

## Scope and known limits

This is a first playable standalone game, with one aquarium biome and a peaceful progression loop. Tank walls and large reef rocks have simplified colliders; small plants and decorative ruins are non-solid. Saves are local to one browser. There are no enemies, multiplayer, or cloud sync. WebGL performance depends on the device; the renderer starts with pixel ratio capped at 1.25 and can adapt down to 0.85.

The screenshot referenced `~/Code/experimental-projects/fishgame`. That directory was unavailable on this machine, so this implementation was created from the supplied description without inspecting the 2D prototype or other game implementations.

## GitHub Pages deployment

The public game is deployed from this standalone repository using GitHub Actions.
After Pages is enabled with **GitHub Actions** as its source, every push to `main`
runs regression tests, builds for `/fishslop/`, and deploys the static output.
You can also run the **Deploy GitHub Pages** workflow manually.

```sh
npm ci
npm test
npm run build -- --base=/fishslop/
```

Only the production website and runtime resources are published to Pages;
editable Blender source files are retained in Git but excluded from the site artifact.
The game has no backend. Browser saves are tied to the website origin, so previous
VPS saves do not automatically appear on the GitHub Pages address.

## Visual revision 2

Rebuilt against the supplied visual reference. Three fish models now use tapered body profiles, procedural scale textures, curved translucent fin membranes with modeled fin rays, gills, iris details, and independently pivoted tail/pectoral fins. The submarine adds hull seams, window seals and bolts, hatch fittings, external pipes, landing skids, ducted thrusters, and a rotating four-blade propeller. New editable Blender sources are `*-v2.blend`; runtime files are `*-v2.glb`.

The reef now includes perforated sea fans, recursively branched corals, layered plates, genuinely hollow tube sponges, thin kelp leaves, sand grains, seagrass, and animated world-space caustics. The HUD moves to the screen edges and the shop opens with B. Fish remain in a loose shoal around the caretaker; existing fish, coins, upgrades, and save format remain compatible.

Validation: 10 simulation tests, production build, and in-app browser visual checks of the fish, submarine, water, feeding, and dock interaction. Public deployment retains the previous release for rollback.

## Scene and steering revision 3

The aquarium now has a large SUNLIT SHOALS wall sign, visible glass joints, softer rounded reef rocks, foreground reef clusters, taller kelp, blue finger corals, and open pearl clams. Lighting and caustics are softer, with an open central swimming route.

The hull follows the velocity of camera-relative movement independently of the view: sideways and backward travel turn the bow, climbing and diving change pitch, and turns gently bank before leveling. Propeller exhaust and the radar follow the actual hull attitude. Existing saves migrate without losing residents, coins, or upgrades.

Validation: 17 simulation and steering tests, a production build, and in-app browser visual checks of the scene and sideways hull turning. Rise/dive attitudes are covered by simulation tests.

## Water-current animation revision 4

Kelp, sand-floor seagrass, sea fans, branching corals, and finger corals now bend with a shared, spatially phased water current. Flexible kelp has larger motion; coral moves subtly. Bending increases toward the tips while roots stay anchored. Rocks, shells, tube sponges, and rigid plate corals remain stable.

`src/current.js` applies GPU vertex deformation after geometry batching, adjusts surface normals, and uses matching deformation in the directional-light shadow pass. Animation follows simulation time, so pausing also pauses the current.

Validation: 17 existing regression tests and production build passed. In-app browser checks confirmed changing vegetation silhouettes with no shader errors; the public HTML and bundled assets match the new build.

## Fish swimming revision 5

Tail beats now range from about ±32° while cruising slowly to ±41° when swimming quickly (previously ±17°). The body and pectoral fins follow with smaller, offset movements. Smoothed swimming speed controls cadence and amplitude; integrated phase prevents abrupt tail-angle jumps when speed changes. Species keep slightly different rhythms.

Validation: production build and in-app browser visual checks passed; no browser rendering errors were reported. This revision changes animation only.

## Marine diversity and performance revision 6

Four new species join the original three: clownfish, blacktip reef shark, bottlenose dolphin, and moon jelly. The first load adds 12 complimentary residents (17 for a fresh game), once per save, up to a new limit of 32. Existing fish, money, meals, and upgrades are preserved. Select a species at the dock (B) to buy it or use **近距离观察** to follow it closely. **返回驾驶** or movement input restores piloting. Observation hides the submarine and coins so they do not obscure small animals.

Scale is in aquarium meters, using representative adult sizes: clownfish 0.11 m long, blacktip reef shark 1.6 m long, bottlenose dolphin 2.6 m long, moon jelly 0.35 m across the bell. Juveniles start at 82% and reach adult scale with growth. These are chosen sizes within real ranges, not universal or maximum sizes. The three original stylized fish are 0.22–0.28 m long. The aquarium remains a peaceful fictional mixed habitat.

Size references: [Monterey Bay Aquarium clownfish](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/clownfish), [Florida Museum blacktip reef shark](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/blacktip-reef-shark/), [NOAA bottlenose dolphin](https://www.fisheries.noaa.gov/species/common-bottlenose-dolphin), and [Monterey Bay Aquarium moon jelly](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/moon-jelly).

New geometry is authored in `src/species-models.js` (about 5,100–6,300 triangles per species). Sharks swing vertical tails sideways; dolphins move horizontal flukes vertically; jellies pulse their bells and drift. Original Blender fish have lightweight `*-lite.glb` runtime copies, reduced from 51,416 to about 7,100 triangles by `tools/optimize_assets.py`. High-detail sources are retained. Production needs only the four lite GLBs, plus bundled code.

The renderer prepares each species once and shares geometry/materials between residents. Resident shaders are compiled before the loading screen closes to reduce first-appearance hitches. Vertex colors combine detail materials; translucent fins use one pass. Plant/fish shadows are limited, the 1024² sun shadow updates at 10 Hz, caustics use a cheaper interference pattern, and resolution adapts when sustained frame times exceed the target. Vegetation still bends with the current.

### Measured rendering cost

In-app browser, 1422 × 800, deterministic 17-resident legacy-species scene; 60 warmup frames followed by 180 measured frames. These are local measurements, not a frame-rate guarantee for other devices. The new run includes the new scale/camera and quality defaults, so this compares the overall released configuration.

| Metric | Before | After |
| --- | ---: | ---: |
| Pixel ratio | 1.6 | 1.25 |
| Draw calls (final sampled frame) | 596 | 316 |
| Triangles (final sampled frame) | 1,422,908 | 486,365 |
| Median frame interval | 16.5 ms | 8.3 ms |
| 95th percentile frame interval | 17.5 ms | 9.2 ms |
| Median CPU render submission | 5.7 ms | 1.7 ms |
| Geometry allocations on GPU | 352 | 155 |

A mixed-species 32-resident run measured 376 draw calls, 567,405 triangles, 8.3 ms median frame interval, and 2.1 ms median render submission on the same machine. Reproduce in development at `/tools/performance.html`, or `/tools/performance.html?mixed=1&count=32`. The benchmark is not included in the public deployment and does not read or write saved aquariums.

Validation includes 21 simulation, steering, migration, purchase, and geometry-budget tests plus browser checks of species selection and observation.

## Ocean giants and small shoals revision 7

Five new species bring the roster to 12, with representative adult dimensions spanning 5 cm to 12 m:

| Species | Adult dimension used | Movement |
| --- | --- | --- |
| Humpback whale | 12 m body length | Slow vertical fluke beats, open upper water |
| Giant manta ray | 4 m wingspan | Broad pectoral strokes, open water |
| Green sea turtle | 1 m carapace length | Flipper strokes |
| Pacific sardine | 18 cm body length | Small coordinated shoals |
| Neon goby | 5 cm body length | Quick tail beats |

These are representative game adults within natural size ranges. Turtle size measures the shell, manta size the wingspan, and moon jelly size the bell diameter. Juveniles retain the existing growth scale. The setting remains a fictional peaceful mixed habitat.

Sources: [NOAA humpback whale](https://www.fisheries.noaa.gov/species/humpback-whale), [NOAA giant manta ray](https://www.fisheries.noaa.gov/species/giant-manta-ray), [NOAA green turtle](https://www.fisheries.noaa.gov/species/green-turtle), [Monterey Bay Aquarium Pacific sardine](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/pacific-sardine), and [Smithsonian neon goby](https://biogeodb.stri.si.edu/caribbean/en/thefishes/speciesreport/4149).

A versioned migration adds 12 residents once to existing revision 6 saves; fresh games start with 29. Capacity rises to 48, with at most two whales and four mantas. Existing residents, currency, and upgrades survive migration. Whales keep a body-sized clearance from glass and the bottom. Select a species at the dock to observe it; other species are temporarily hidden in observation so large animals cannot obscure small ones. Returning to piloting restores the full community.

All five models use original procedural geometry, shared geometry/materials, and fewer than 10,000 triangles each. The 48-resident mixed benchmark at 1422 × 800 and pixel ratio 1.25 measured 433 draw calls, 649,201 triangles, 8.3 ms median / 9.4 ms p95 frame interval, and 2.5 ms median CPU render submission. These are local measurements under the same warmup/sample procedure as revision 6, not a guarantee for other devices. Reproduce at `/tools/performance.html?mixed=1&count=48`.

Validation: 24 tests covering simulation, steering, save migrations, species purchases and limits, whale boundaries, and geometry budgets; production build; browser model/observation and rendering checks.

## Humpback anatomy and surface revision 8

Replaced the simplified whale with a dedicated original model in `src/whale-model.js`. Mouth seams, small dark eyes behind the rostrum, and head/jaw tubercles are positioned using the same parametric hull surface. Longitudinal ventral pleats now live in the belly color and bump textures, so they follow the lower jaw and throat without floating outside the body. The broad, flatter head tapers into a deep trunk and narrow tail stock. Continuous curved pectoral flippers and paired flukes replace thick polygon slabs.

Dark slate skin has restrained mottling, a soft cream ventral patch, and finer surface response. Textured skin and glossy eye materials survive material batching. The whale remains 12 m at adult scale with the same population limit and swimming behavior. Its 9,992 triangles and six batched draw calls stay within the existing per-model geometry budget. Two small generated textures are shared by whale instances; no additional model download is required.

Anatomy references: [NOAA humpback identification](https://www.pmel.noaa.gov/acoustics/whales/whale-biology-hump.html) and [Aquarium of the Pacific humpback description](https://www.aquariumofpacific.org/onlinelearningcenter/species/humpback_whale). The model is stylized, based on those anatomical features.

Development-only `/tools/whale-review.html` provides side, underside, head, and top views using the runtime material consolidation/batching path. Validation includes those visual checks, the existing 24 regression/budget tests, a production build, and public deployment asset verification.

The revision 8 mixed 48-resident check measured 437 draw calls, 651,241 triangles, 8.3 ms median / 16.8 ms p95 frame interval, and 2.3 ms median CPU submission at the same viewport and pixel ratio. Frame timing is local and affected by concurrent browser/build work.

## Full species review revision 9

Reviewed all 11 animals other than the already revised humpback in normalized side, top, and underside views. The shared runtime preparation path (`src/model-preparation.js`) is also used by the development-only `/tools/species-review.html` so material batching and scale measurements match the game.

| Species | Review result |
| --- | --- |
| Goldfish | Retained the existing Blender body, scale texture, eyes and thin fin membranes after inspection |
| Azure reef fish | Retained its existing narrower body and translucent fin details |
| Orchid reef fish | Retained its existing proportions and fin structure |
| Clownfish | Smaller surface-aligned eyes and gill lines; thinner rounded fins, with original three body bands retained |
| Blacktip reef shark | Surface-aligned eyes, five gill slits and mouth seam; corrected tail direction; rounded dorsal/pectoral fins with dark tips |
| Bottlenose dolphin | Eyes moved out of the hull onto the head; attached mouth seam and blowhole; thinner curved fins and horizontal flukes |
| Moon jelly | Finer rim/tentacles, translucent horseshoe-shaped organs and ribbon-like oral arms |
| Giant manta ray | Continuous cambered wings, countershading, curled cephalic lobes, ventral gill slits and a finer trailing tail |
| Green sea turtle | Upper carapace with a central scute row, four costal pairs and marginal plates; separate pale plastron, neck, small eyes and rounded flippers |
| Pacific sardine | Correctly rearward forked tail, smaller attached eyes, fine gill lines and flank spots; preserved silver material response |
| Neon goby | Rearward rounded tail, two separated dorsal fins, smaller eyes and gill detail; preserved blue stripe |

The procedural fish hulls now have closed ends and smooth normals across their angular seam. Shared glossy eye materials preserve small highlights while allowing left/right eyes to batch together. The three earlier Blender assets and whale remain intact; this revision does not add residents, change species dimensions or alter saved progress.

Reference descriptions: [Florida Museum blacktip reef shark](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/blacktip-reef-shark/), [NOAA bottlenose dolphin](https://www.fisheries.noaa.gov/species/common-bottlenose-dolphin), [NOAA manta ray](https://www.fisheries.noaa.gov/species/giant-manta-ray), [NOAA green turtle](https://www.fisheries.noaa.gov/species/green-turtle), and the species references recorded in revision 6/7. These remain stylized game models.

Validation: 25 tests, including a new check that vertical tails extend behind their pivots and dolphin flukes remain horizontal; finite geometry, matching vertex attributes and existing triangle budgets; production build; multi-angle visual inspection and in-game observation checks. All procedural models remain below 10,000 triangles each.

Final local 48-resident benchmark (1422 × 800, pixel ratio 1.25): 466 draw calls, 654,401 triangles, 2.3 ms median CPU submission, 16.5 ms median and 40.8 ms p95 frame interval. Frame pacing was more variable than the earlier revision 8 run; the cause was not isolated, so this is not a claim of improved FPS. Geometry cost stayed close to revision 8.
