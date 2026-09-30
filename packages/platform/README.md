# @pr/platform — platform services

Contracts (`SaveRepository`, `PreferencesStore`, window/quit) and adapters:
browser (IndexedDB saves, localStorage preferences, download/upload export),
desktop (the Electron preload bridge `window.prDesktop`) and memory.
`detectPlatform()` picks one. Adapters never contain rules.
