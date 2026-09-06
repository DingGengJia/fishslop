# Demo recording

The preferred demo is a continuous gameplay recording with the original HUD,
menus, tank lettering, and normal camera. Do not add editorial captions or switch
to isolated animal views for this version.

## Complete gameplay with original UI

```sh
npm ci
npm run dev -- --port 5186
```

Open `http://localhost:5186/tools/demo-gameplay.html` in Chrome. Keep this tab
active, wait for the aquarium to load, then click the recording button and allow
capture of **this game tab only**. Capturing another tab or the desktop is unnecessary.
The capture control disappears before recording starts.

The 100-second rehearsal uses normal game simulation and shop handlers. It shows
starting the game, steering and changing depth, feeding, collecting coins,
opening the dock, buying a clownfish and turtle, upgrading food and the propeller,
and pausing/resuming. The first-goal dialog closes after a short viewing interval.
It does not grant currency, teleport the submarine, or focus individual species.
The recording is silent and adds no captions. The existing game interface and
its normal messages remain visible.

After recording, use the download link to save the MP4 (or WebM fallback).
Close the recording tab afterward; gameplay continues after capture finishes.
Reload to begin a fresh rehearsal. Recording saves use a separate local-storage
key and do not overwrite the normal game aquarium.

`tools/demo-gameplay.html` and `tools/demo-gameplay-main.js` are local rehearsal
snapshots derived from `index.html` and `src/main.js`. They are not alternate
production entry points. When the production UI changes, refresh the snapshots
and reapply their recording-only controls and timeline. Keep gameplay fixes in
`src/`; avoid maintaining a separate gameplay implementation in these snapshots.

## Optional clean scene version

`http://localhost:5186/tools/demo-clean.html` records a 90-second, 1280×720 canvas
video. It deliberately excludes the HUD, tank sign, and numbered coins, and uses
individual species shots. It is a different presentation style and should not be
used when the request calls for the original interface or the full operation flow.
This page does not change the production scene or browser saves.

## Inspect the video on macOS

```sh
mkdir -p artifacts/full-gameplay-review
xcrun swiftc tools/inspect-demo.swift -o artifacts/full-gameplay-review/inspect
artifacts/full-gameplay-review/inspect /absolute/path/to/demo.mp4 artifacts/full-gameplay-review
```

The AVFoundation inspector reports actual duration, resolution, and frame rate,
and exports 14 frames from the 100-second video. Visually check the welcome screen,
driving, feeding, coin collection, purchases, upgrade feedback, pause/resume, and
final frames. Check that no capture controls, browser chrome, private desktop
content, or extra captions appear. The inspector's sample times assume a video
longer than 99 seconds; adjust them for shorter clips.

The verified September 6 full-gameplay recording was 100.018 seconds at
1920×1058, averaging 28.30 FPS. Its native viewport aspect ratio is preserved;
these measurements are not a guarantee of future recording performance.

Videos, extracted images, and native inspector binaries stay in ignored local
`artifacts/clean-demo-*/` or `artifacts/full-gameplay-*/` folders. They are not
included in GitHub Pages. The standard Vite production build continues to use
only the root `index.html` entry point.
