PANTHEON REALMS — PERFORMANCE RELEASE, 23 OCTOBER 2026
Version remains 1.0.0, Windows x64.

Changes
1. Adventure objects outside the camera view are culled from drawing. Bounds
   include tall trees, flags, rotation, mirroring and asynchronously loaded art.
   Fog visibility, picking, movement and gameplay state are unchanged.
2. Image decoding is limited to four concurrent jobs. Pending urgent animation
   work takes priority over scenery. GPU uploads keep their existing budget.
3. Decoded ImageBitmaps are explicitly closed when their texture source is
   destroyed, in addition to Pixi's existing GPU resource release.
4. Desktop builds create WebP artwork derivatives and a stable-URL lookup.
   The local protocol serves the correct file and MIME type without changing
   game URLs or atlas coordinates. Source artwork remains untouched.
5. The 54 hero busts are resized from 1024x1536 to 640x960. This reduces their
   decoded pixel memory by 60.94%. Other converted artwork retains dimensions.
   Large artwork uses WebP quality 88 and full-quality alpha. Small images,
   masks, edges, foam, roads and cursors use lossless encoding when converted.
   Already compressed WebPs are left alone, and larger derivatives are rejected.

Asset results
757 PNG derivatives; 462 PNGs kept unchanged.
Converted input: 1,546,153,084 bytes.
Derivatives:       269,315,456 bytes (82.58% smaller).
54 portraits resized; 51,757,056 fewer decoded pixels (197.44 MiB of RGBA).
Complete optimized renderer directory: 747,844,385 bytes.
optimized-assets.json lists every source URL and corresponding derivative.

Observed benchmark, not a hardware FPS guarantee
Existing tests/perf/frames.spec.ts, High preset, 1280x720 viewport, DPR 1,
headless Chromium SwiftShader software rendering. Six-second map scenarios
and a fifteen-second auto-battle scenario. Adaptive resolution remained on.
The comparison was taken before the decode-queue change; it measures culling.

Twin Harbors panning: 12.1 -> 21.8 FPS; mean renderer submission 74.59 -> 30.32 ms.
Twin Harbors idle: 27.8 -> 29.1 drawn FPS (ambient cap 30).
Battle auto: 26.7 -> 27.8 FPS; broadly unchanged, not a battle FPS improvement claim.
Huge random map panning: 33.1 -> 29.0 FPS; these runs generated different maps
and followed timing-dependent pan paths, so they are not a controlled comparison.
Even Twin Harbors mouse paths depend on timing: treat the results as indicative.
Scene renderable diagnostics now correctly account for hidden parents; counts
from the old and new diagnostic implementations are not directly comparable.

Validation
- TypeScript and module boundaries passed.
- 19 focused tests: culling, decode concurrency, figures and graphics settings.
- Release-asset test: dimensions preserved for animation art, portrait resize,
  alpha-channel byte equality, original copied PNG replacement and smaller files.
- Two browser integration tests: Greek and Egyptian maps and temple dialogs.
- Before/after benchmark runs completed map, huge-map and battle scenarios.
- Production client and desktop build passed.
- Packaged checks are recorded separately in packaged-validation.log.
- Packaged Electron: all 757 derivative URLs decoded with WebP MIME; exact
  staged/archived art and JS/CSS comparisons passed. Land, siege and naval
  deployment/battle/results, campaign map and manual save passed without JS errors.

Installer
installer/Pantheon-Realms-Setup-1.0.0-x64.exe
849,739,984 bytes (849.74 MB; 58.81% smaller than the previous 2,062,723,316-byte installer).
SHA256: FECDF16052B35671FA324413E6205271C9956B1E742F62831F4F455C1F2C3DDC
The release remains unsigned. Existing saves are retained by the installer.

Build
npm run desktop:dist
The first build compresses artwork; later builds reuse a content-addressed
apps/desktop/.asset-cache. The cache is disposable and excluded from Git.
Only apps/desktop/renderer is optimized. Browser/dev assets retain full quality.
