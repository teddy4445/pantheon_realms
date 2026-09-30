# @pr/ui — React interface

* `app/` — `AppStore` (navigation, overlays, toasts, session, presentation queue, AI pacing),
  React bindings, preferences, save-slot policy, read-only view helpers.
* `screens/` — the 18 screens; `dialogs/Overlays.tsx` — modal flows.
* `components/` — UI kit, art components (asset-ID resolution), game widgets.
* `scene/SceneHost.tsx` — mounts the shared Babylon canvas into a screen.
* `assets/` — icons, procedural placeholder portraits, asset manifest.
* `styles/` — tokens, base, components, screens.

Screens change state only through `store.dispatch(command)`.
