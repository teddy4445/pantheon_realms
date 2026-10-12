Files from the other Claude session (2026-10-10, written 17:47 UTC) that the merged 1.1.1 tree does not use.
Moved here, not deleted, so nothing of that session is lost:
- packages/ui/src/assets/frontendArt.generated.ts  (generated art table; the merged tree reads the delivered manifests directly)
- packages/ui/src/components/cropped.tsx           (CroppedArt; imported guiArt from manifest.ts, which the merged tree does not export)
- tools/assets/frontend_art_table.mjs              (generator of the table above; its npm script art:frontend-table is not in package.json)
The folder can be deleted once you have looked at it. Details: DEVELOPMENT_STATUS.md, App 1.1.1.
