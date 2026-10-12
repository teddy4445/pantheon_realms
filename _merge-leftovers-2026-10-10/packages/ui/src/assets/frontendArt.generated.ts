/**
 * Interface art of the 1.1.0 packs (frontendkit.*, frontend.*, gui.*, encounterkit.*), generated
 * by tools/assets/frontend_art_table.mjs from the delivery manifests in
 * assets-runtime/. Do not edit by hand: replace the art, then run
 * `npm run art:frontend-table`. Files are relative to assets-runtime (served at
 * the app base), byte-identical to the delivered runtime PNGs.
 */
export interface GuiArtEntry {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly alpha: boolean;
  readonly fit?: 'cover' | 'contain';
  /** Visible bounds as fractions [left, top, right, bottom]. */
  readonly visible?: readonly [number, number, number, number];
  /** Frames: source slices (px of the native file) and the CSS border width they were measured for. */
  readonly nineSlice?: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number; readonly cssBorderWidth: number };
  /** Frames: where the surface under the frame starts (top, right, bottom, left) at the measured border width. */
  readonly surfaceInset?: readonly [number, number, number, number];
  readonly contentPadding?: number;
  /** Decorative surfaces: the safe rectangle for live content, as fractions [left, top, right, bottom]. */
  readonly safe?: readonly [number, number, number, number];
}

export const GUI_ART: Readonly<Record<string, GuiArtEntry>> = {
  "encounterkit.intro.scroll": {"file":"encounters-v1.1.0/intro-scroll.png","width":1536,"height":1024,"alpha":true,"safe":[0.12,0.17,0.88,0.83]},
  "encounterkit.meeting.celtic": {"file":"encounters-v1.1.0/meeting-celtic.png","width":1672,"height":941,"alpha":false},
  "encounterkit.meeting.egyptian": {"file":"encounters-v1.1.0/meeting-egyptian.png","width":1672,"height":941,"alpha":false},
  "encounterkit.meeting.greek": {"file":"encounters-v1.1.0/meeting-greek.png","width":1672,"height":940,"alpha":false},
  "encounterkit.meeting.japanese": {"file":"encounters-v1.1.0/meeting-japanese.png","width":1672,"height":941,"alpha":false},
  "encounterkit.meeting.mesoamerican": {"file":"encounters-v1.1.0/meeting-mesoamerican.png","width":1672,"height":941,"alpha":false},
  "encounterkit.meeting.norse": {"file":"encounters-v1.1.0/meeting-norse.png","width":1672,"height":941,"alpha":false},
  "encounterkit.reward.tray": {"file":"encounters-v1.1.0/reward-tray.png","width":1774,"height":887,"alpha":true,"safe":[0.11,0.25,0.89,0.75]},
  "frontend.backdrop.atlas": {"file":"frontend-v1.1.0/backdrop-atlas.png","width":1586,"height":992,"alpha":false,"fit":"cover"},
  "frontend.backdrop.library": {"file":"frontend-v1.1.0/backdrop-library.png","width":1586,"height":992,"alpha":false,"fit":"cover"},
  "frontend.backdrop.title-hall": {"file":"frontend-v1.1.0/backdrop-title-hall.png","width":1586,"height":992,"alpha":false,"fit":"cover"},
  "frontend.empty.archive": {"file":"frontend-v1.1.0/empty-archive.png","width":1536,"height":1024,"alpha":true,"fit":"contain"},
  "frontend.mode.campaign": {"file":"frontend-v1.1.0/mode-campaign.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.mode.map-editor": {"file":"frontend-v1.1.0/mode-map-editor.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.mode.random-map": {"file":"frontend-v1.1.0/mode-random-map.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.mode.skirmish": {"file":"frontend-v1.1.0/mode-skirmish.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.random.archipelago": {"file":"frontend-v1.1.0/random-archipelago.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.random.central_valley": {"file":"frontend-v1.1.0/random-central_valley.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.random.continental": {"file":"frontend-v1.1.0/random-continental.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.random.crossroads": {"file":"frontend-v1.1.0/random-crossroads.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.random.highlands": {"file":"frontend-v1.1.0/random-highlands.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.random.lake_isle": {"file":"frontend-v1.1.0/random-lake_isle.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.random.marshlands": {"file":"frontend-v1.1.0/random-marshlands.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.random.twin_continents": {"file":"frontend-v1.1.0/random-twin_continents.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontend.random.wild_forest": {"file":"frontend-v1.1.0/random-wild_forest.png","width":1448,"height":1086,"alpha":false,"fit":"cover"},
  "frontendkit.backdrop.title": {"file":"frontend-kit-v1.1.0/backdrop-title.png","width":1586,"height":992,"alpha":false,"visible":[0,0,1,1]},
  "frontendkit.banner.celtic": {"file":"frontend-kit-v1.1.0/banner-celtic.png","width":1024,"height":1536,"alpha":true,"visible":[0.043,0.0397,0.958,0.9414]},
  "frontendkit.banner.egyptian": {"file":"frontend-kit-v1.1.0/banner-egyptian.png","width":1024,"height":1536,"alpha":true,"visible":[0.0771,0.0586,0.9229,0.946]},
  "frontendkit.banner.greek": {"file":"frontend-kit-v1.1.0/banner-greek.png","width":1024,"height":1536,"alpha":true,"visible":[0.0537,0.0449,0.9473,0.9447]},
  "frontendkit.banner.japanese": {"file":"frontend-kit-v1.1.0/banner-japanese.png","width":1024,"height":1536,"alpha":true,"visible":[0.0244,0.0384,0.9756,0.9648]},
  "frontendkit.banner.mesoamerican": {"file":"frontend-kit-v1.1.0/banner-mesoamerican.png","width":1024,"height":1536,"alpha":true,"visible":[0.0566,0.0456,0.9443,0.957]},
  "frontendkit.banner.norse": {"file":"frontend-kit-v1.1.0/banner-norse.png","width":1024,"height":1536,"alpha":true,"visible":[0.0693,0.0397,0.9307,0.9297]},
  "frontendkit.brand.logo": {"file":"frontend-kit-v1.1.0/brand-logo-v2.png","width":2172,"height":724,"alpha":true,"visible":[0.1662,0.0166,0.8333,0.9779]},
  "frontendkit.chrome.header": {"file":"frontend-kit-v1.1.0/chrome-header.png","width":2172,"height":724,"alpha":true,"visible":[0.0037,0.232,0.9968,0.7141]},
  "frontendkit.chrome.round-socket": {"file":"frontend-kit-v1.1.0/chrome-round-socket.png","width":1254,"height":1254,"alpha":true,"visible":[0.0359,0.0351,0.9617,0.9625]},
  "frontendkit.icon.accessibility": {"file":"frontend-kit-v1.1.0/icon-accessibility.png","width":1254,"height":1254,"alpha":true,"visible":[0.1029,0.0542,0.8971,0.9474]},
  "frontendkit.icon.artifacts": {"file":"frontend-kit-v1.1.0/icon-artifacts.png","width":1254,"height":1254,"alpha":true,"visible":[0.0463,0.0526,0.9545,0.9442]},
  "frontendkit.icon.audio": {"file":"frontend-kit-v1.1.0/icon-audio.png","width":1254,"height":1254,"alpha":true,"visible":[0.0207,0.0973,0.9817,0.9043]},
  "frontendkit.icon.bestiary": {"file":"frontend-kit-v1.1.0/icon-bestiary.png","width":1254,"height":1254,"alpha":true,"visible":[0.1053,0.0255,0.9306,0.9841]},
  "frontendkit.icon.controls": {"file":"frontend-kit-v1.1.0/icon-controls.png","width":1254,"height":1254,"alpha":true,"visible":[0.0136,0.1882,0.9848,0.8421]},
  "frontendkit.icon.delete": {"file":"frontend-kit-v1.1.0/icon-delete.png","width":1254,"height":1254,"alpha":true,"visible":[0.1148,0.0455,0.8852,0.9522]},
  "frontendkit.icon.display": {"file":"frontend-kit-v1.1.0/icon-display.png","width":1254,"height":1254,"alpha":true,"visible":[0.0375,0.0391,0.9633,0.9466]},
  "frontendkit.icon.erase": {"file":"frontend-kit-v1.1.0/icon-erase.png","width":1254,"height":1254,"alpha":true,"visible":[0.0431,0.0678,0.9625,0.9506]},
  "frontendkit.icon.export": {"file":"frontend-kit-v1.1.0/icon-export.png","width":1254,"height":1254,"alpha":true,"visible":[0.0869,0.0622,0.9131,0.9099]},
  "frontendkit.icon.forest": {"file":"frontend-kit-v1.1.0/icon-forest.png","width":1254,"height":1254,"alpha":true,"visible":[0.0861,0.0718,0.9091,0.9123]},
  "frontendkit.icon.generate": {"file":"frontend-kit-v1.1.0/icon-generate.png","width":1254,"height":1254,"alpha":true,"visible":[0.0885,0.0566,0.9075,0.9426]},
  "frontendkit.icon.hex": {"file":"frontend-kit-v1.1.0/icon-hex.png","width":1254,"height":1254,"alpha":true,"visible":[0.0949,0.0359,0.9059,0.9641]},
  "frontendkit.icon.import": {"file":"frontend-kit-v1.1.0/icon-import.png","width":1254,"height":1254,"alpha":true,"visible":[0.0431,0.0598,0.9569,0.9426]},
  "frontendkit.icon.interface": {"file":"frontend-kit-v1.1.0/icon-interface.png","width":1254,"height":1254,"alpha":true,"visible":[0.0686,0.1021,0.9314,0.8979]},
  "frontendkit.icon.new-map": {"file":"frontend-kit-v1.1.0/icon-new-map.png","width":1254,"height":1254,"alpha":true,"visible":[0.0789,0.0375,0.9553,0.953]},
  "frontendkit.icon.records": {"file":"frontend-kit-v1.1.0/icon-records.png","width":1254,"height":1254,"alpha":true,"visible":[0.0335,0.0774,0.9681,0.9203]},
  "frontendkit.icon.redo": {"file":"frontend-kit-v1.1.0/icon-redo.png","width":1254,"height":1254,"alpha":true,"visible":[0.0518,0.0622,0.9809,0.929]},
  "frontendkit.icon.road": {"file":"frontend-kit-v1.1.0/icon-road.png","width":1254,"height":1254,"alpha":true,"visible":[0.1148,0.0455,0.9019,0.9585]},
  "frontendkit.icon.select": {"file":"frontend-kit-v1.1.0/icon-select.png","width":1254,"height":1254,"alpha":true,"visible":[0.1515,0.0478,0.8453,0.9649]},
  "frontendkit.icon.terrain": {"file":"frontend-kit-v1.1.0/icon-terrain.png","width":1254,"height":1254,"alpha":true,"visible":[0.0175,0.1332,0.9825,0.8684]},
  "frontendkit.icon.undo": {"file":"frontend-kit-v1.1.0/icon-undo.png","width":1254,"height":1254,"alpha":true,"visible":[0.0359,0.1053,0.9617,0.8987]},
  "frontendkit.icon.warning": {"file":"frontend-kit-v1.1.0/icon-warning.png","width":1254,"height":1254,"alpha":true,"visible":[0.0327,0.0183,0.9649,0.9729]},
  "frontendkit.icon.water": {"file":"frontend-kit-v1.1.0/icon-water.png","width":1254,"height":1254,"alpha":true,"visible":[0.0447,0.1802,0.9569,0.8788]},
  "gui.banner.celtic": {"file":"ui-v1.1.0/banner-celtic.png","width":1024,"height":1536,"alpha":true,"visible":[0.0088,0.0293,0.9922,0.9577]},
  "gui.banner.egyptian": {"file":"ui-v1.1.0/banner-egyptian.png","width":1024,"height":1536,"alpha":true,"visible":[0.0068,0.0286,0.9932,0.9616]},
  "gui.banner.greek": {"file":"ui-v1.1.0/banner-greek.png","width":1024,"height":1536,"alpha":true,"visible":[0.0215,0.0286,0.9795,0.9707]},
  "gui.banner.japanese": {"file":"ui-v1.1.0/banner-japanese.png","width":1024,"height":1536,"alpha":true,"visible":[0.0117,0.041,0.9893,0.9616]},
  "gui.banner.mesoamerican": {"file":"ui-v1.1.0/banner-mesoamerican.png","width":1024,"height":1536,"alpha":true,"visible":[0.0117,0.0215,0.9883,0.959]},
  "gui.banner.norse": {"file":"ui-v1.1.0/banner-norse.png","width":1024,"height":1536,"alpha":true,"visible":[0.0137,0.028,0.9863,0.9714]},
  "gui.book.open": {"file":"ui-v1.1.0/book-open.png","width":1536,"height":1024,"alpha":true,"visible":[0.0019,0.0566,0.9987,0.9268]},
  "gui.control.button": {"file":"ui-v1.1.0/control-button.png","width":2172,"height":724,"alpha":true,"visible":[0.0308,0.2389,0.9691,0.7611]},
  "gui.control.socket": {"file":"ui-v1.1.0/control-socket.png","width":1254,"height":1254,"alpha":true,"visible":[0.051,0.063,0.949,0.9234]},
  "gui.encounter.crossroads": {"file":"ui-v1.1.0/encounter-crossroads.png","width":1774,"height":887,"alpha":false,"visible":[0,0,1,1]},
  "gui.encounter.hermit": {"file":"ui-v1.1.0/encounter-hermit.png","width":1774,"height":887,"alpha":false,"visible":[0,0,1,1]},
  "gui.encounter.longship": {"file":"ui-v1.1.0/encounter-longship.png","width":1774,"height":887,"alpha":false,"visible":[0,0,1,1]},
  "gui.encounter.treasure": {"file":"ui-v1.1.0/encounter-treasure.png","width":1774,"height":887,"alpha":false,"visible":[0,0,1,1]},
  "gui.encounter.treasure-empty": {"file":"ui-v1.1.0/encounter-treasure-empty.png","width":1774,"height":887,"alpha":false,"visible":[0,0,1,1]},
  "gui.equipment.figure": {"file":"ui-v1.1.0/equipment-figure.png","width":1024,"height":1536,"alpha":true,"visible":[0.2178,0.0286,0.7832,0.9609]},
  "gui.frame.celtic": {"file":"ui-v1.1.0/frame-celtic.png","width":1536,"height":1024,"alpha":true,"visible":[0.0273,0.0391,0.9733,0.9336],"nineSlice":{"top":256,"right":320,"bottom":256,"left":320,"cssBorderWidth":64},"surfaceInset":[19,16,27,16],"contentPadding":40},
  "gui.frame.egyptian": {"file":"ui-v1.1.0/frame-egyptian.png","width":1536,"height":1024,"alpha":true,"visible":[0.0163,0.0527,0.9837,0.9375],"nineSlice":{"top":256,"right":320,"bottom":256,"left":320,"cssBorderWidth":64},"surfaceInset":[23,14,26,14],"contentPadding":40},
  "gui.frame.greek": {"file":"ui-v1.1.0/frame-greek.png","width":1536,"height":1024,"alpha":true,"visible":[0.0208,0.0557,0.9792,0.916],"nineSlice":{"top":256,"right":320,"bottom":256,"left":320,"cssBorderWidth":64},"surfaceInset":[20,11,28,11],"contentPadding":40},
  "gui.frame.japanese": {"file":"ui-v1.1.0/frame-japanese.png","width":1536,"height":1024,"alpha":true,"visible":[0.0234,0.0361,0.9779,0.9385],"nineSlice":{"top":256,"right":320,"bottom":256,"left":320,"cssBorderWidth":64},"surfaceInset":[19,14,26,14],"contentPadding":40},
  "gui.frame.mesoamerican": {"file":"ui-v1.1.0/frame-mesoamerican.png","width":1536,"height":1024,"alpha":true,"visible":[0.0124,0.0254,0.9876,0.9443],"nineSlice":{"top":256,"right":320,"bottom":256,"left":320,"cssBorderWidth":64},"surfaceInset":[15,11,23,11],"contentPadding":40},
  "gui.frame.norse": {"file":"ui-v1.1.0/frame-norse.png","width":1536,"height":1024,"alpha":true,"visible":[0.0143,0.0332,0.9857,0.956],"nineSlice":{"top":256,"right":320,"bottom":256,"left":320,"cssBorderWidth":64},"surfaceInset":[26,17,28,17],"contentPadding":40},
  "gui.merchant.celtic": {"file":"ui-v1.1.0/merchant-celtic.png","width":2172,"height":724,"alpha":false,"visible":[0,0,1,1]},
  "gui.merchant.egyptian": {"file":"ui-v1.1.0/merchant-egyptian.png","width":2172,"height":724,"alpha":false,"visible":[0,0,1,1]},
  "gui.merchant.greek": {"file":"ui-v1.1.0/merchant-greek.png","width":2172,"height":724,"alpha":false,"visible":[0,0,1,1]},
  "gui.merchant.japanese": {"file":"ui-v1.1.0/merchant-japanese.png","width":2164,"height":727,"alpha":false,"visible":[0,0,1,1]},
  "gui.merchant.mesoamerican": {"file":"ui-v1.1.0/merchant-mesoamerican.png","width":2172,"height":724,"alpha":false,"visible":[0,0,1,1]},
  "gui.merchant.norse": {"file":"ui-v1.1.0/merchant-norse.png","width":2171,"height":724,"alpha":false,"visible":[0,0,1,1]},
  "gui.recruit.celtic": {"file":"ui-v1.1.0/recruit-celtic-v2.png","width":1086,"height":1448,"alpha":false,"visible":[0,0,1,1]},
  "gui.recruit.egyptian": {"file":"ui-v1.1.0/recruit-egyptian-v2.png","width":1086,"height":1448,"alpha":false,"visible":[0,0,1,1]},
  "gui.recruit.greek": {"file":"ui-v1.1.0/recruit-greek.png","width":1086,"height":1448,"alpha":false,"visible":[0,0,1,1]},
  "gui.recruit.japanese": {"file":"ui-v1.1.0/recruit-japanese-v2.png","width":1086,"height":1448,"alpha":false,"visible":[0,0,1,1]},
  "gui.recruit.mesoamerican": {"file":"ui-v1.1.0/recruit-mesoamerican-v2.png","width":1086,"height":1448,"alpha":false,"visible":[0,0,1,1]},
  "gui.recruit.norse": {"file":"ui-v1.1.0/recruit-norse.png","width":1086,"height":1448,"alpha":false,"visible":[0,0,1,1]},
  "gui.surface.leather": {"file":"ui-v1.1.0/surface-leather.png","width":1254,"height":1254,"alpha":false,"visible":[0,0,1,1]},
  "gui.surface.parchment": {"file":"ui-v1.1.0/surface-parchment.png","width":1254,"height":1254,"alpha":false,"visible":[0,0,1,1]},
  "gui.surface.stone": {"file":"ui-v1.1.0/surface-stone.png","width":1254,"height":1254,"alpha":false,"visible":[0,0,1,1]},
};
