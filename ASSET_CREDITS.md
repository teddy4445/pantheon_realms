# Asset credits and provenance

The root [LICENSE](LICENSE) is the project's existing Apache-2.0 code license. Media and dependencies can have separate terms. This document maps the records available in the repository; it does not replace those records or claim that every historical production file has received a redistribution audit.

| Material | Attribution / provenance | When changing or redistributing |
| --- | --- | --- |
| Project source code | [LICENSE](LICENSE), source and repository history | Preserve the license and applicable notices. |
| Painted environments, portraits, icons, creature strips and effects | `assets-source/`, runtime pack manifests, prompts and dated production folders in `docs/` | Much of the artwork was produced with AI image generation and prepared for the game. Keep source/prompt, processing steps and supplied references. Check separately supplied reference material before reuse. |
| Music | [Music track records](assets-source/audio/music/tracks.json) | Records identify titles, authors, source pages and recorded license information for Pixabay tracks. Retain attribution and check the applicable terms for each recording. |
| Sound effects | [Sound records](assets-source/audio/sounds.json) and [runtime audio manifest](assets-runtime/audio/manifest.json) | Preserve source/author/license records; the recording license is distinct from the code license. |
| Fonts | UI `@fontsource` packages; the website's `fonts/` directory | Preserve upstream font licenses. Check each family rather than applying the code license to it. |
| README screenshots | [Image provenance](docs/images/provenance.json) | Captured from the game and resized to WebP. Cover and logo are promotional art, explicitly distinguished from gameplay captures. |
| Dependencies | Root `package-lock.json` and dependency license/notice files | Respect upstream license and notice requirements when packaging. |

## Adding media

Record who created it, the source URL or local production reference, the license or permission where applicable, and transformations used to produce runtime files. Keep original authoring assets separate from optimized derivatives. Use portable relative paths in new manifests.

Before a public release, inspect the actual files being distributed, including manifests and notices. Historical production folders can contain private working paths or reference inputs not needed by players. The renderer build strips certain legacy absolute provenance paths from shipped copies; that is not a repository-wide privacy or license audit.
