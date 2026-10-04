# Pantheon Realms — Opening Cinematic Production Brief for Codex

**Purpose:** Prepare everything needed to produce the Pantheon Realms opening cinematic with our existing game artwork, GPT-6 for missing still/reference art, and Google Flow / Veo 3.1 for animated shots.

**Important:** Do not redesign the game or create unrelated marketing art. First inspect the repository and reuse the strongest approved Pantheon Realms assets already present.

---

# 1. Goal

Create a complete production package for a **~60–70 second cinematic opening** that introduces the six pantheons and ends by transitioning naturally into the Pantheon Realms main menu.

The cinematic should feel like a premium mythological strategy-game introduction, but it must use **Pantheon Realms' own visual identity**.

Target structure:

```text
0–6 s     World / gods awakening
6–14 s    Greek
14–22 s   Norse
22–30 s   Egyptian
30–38 s   Japanese
38–46 s   Celtic
46–54 s   Mesoamerican
54–62 s   Rapid conflict montage
62–68 s   Pantheon Realms logo reveal
```

This timing is a guide. Adjust slightly if required for better pacing.

---

# 2. First: inspect everything we already have

Before creating prompts or placeholders, search the project thoroughly.

Look for:

- `full_logo.png`
- `logo.png`
- `intro_frame.png`
- `opening_screen_background_1.png` through `opening_screen_background_12.png`
- pantheon concept/reference images
- Greek/Norse/Egyptian/Japanese/Celtic/Mesoamerican artwork
- mounted hero references
- creature reference images
- town backgrounds
- building art
- map artwork
- GUI reference sheets
- finalized creature portraits/sprites
- spell/VFX art
- any existing cinematic/marketing assets

Do not assume the exact filenames above still exist; inspect the repository.

Create:

```text
opening-cinematic/ASSET_AUDIT.md
```

For each relevant asset record:

- file path;
- pantheon;
- what it depicts;
- quality/status;
- whether it is suitable for:
  - Veo reference;
  - GPT-6 reference;
  - direct cinematic use;
  - not suitable;
- any consistency concern.

Reuse existing assets whenever they are strong enough.

---

# 3. Cinematic narrative

Use this simple arc:

```text
The world is shaped by divine powers
        ↓
six civilizations rise under their gods
        ↓
their armies and creatures prepare for conflict
        ↓
the realms collide
        ↓
Pantheon Realms
```

The opening should communicate mythology, scale, war, exploration and faction identity without explaining detailed game rules.

Avoid excessive text.

---

# 4. Suggested voice-over script

Use a short cinematic voice-over, not continuous narration.

Working script:

```text
Before kingdoms rose, the gods shaped the world.

Beneath their gaze, mortals built realms of their own.

Six pantheons.
Six paths to power.

But no god would rule alone.

Now armies gather.
Legends awaken.
And the age of realms begins.
```

Final logo:

```text
PANTHEON REALMS
```

Optional tagline:

```text
Choose your gods. Shape your realm.
```

Codex may improve punctuation/timing, but keep the script concise and do not rewrite it into a long lore monologue.

---

# 5. Voice-over is NOT automatically generated

Prepare a guide so the owner can either:

1. record the voice-over personally; or
2. generate the voice-over using an external voice tool.

Create:

```text
opening-cinematic/audio/VOICEOVER_GUIDE.md
```

It must contain:

- final narration text;
- one line per recording segment;
- target duration for each line;
- emotional direction;
- recommended pauses;
- pronunciation notes only if needed;
- suggested voice character:
  - mature;
  - cinematic;
  - calm authority;
  - mythological storyteller;
  - not exaggerated "movie trailer" shouting;
- processing suggestions:
  - clean recording;
  - light compression;
  - gentle low-frequency warmth;
  - minimal reverb;
  - narration always understandable over music;
- export recommendation:
  - 48 kHz WAV preferred;
  - one clean file per narration segment;
- exact filenames.

Example:

```text
vo_01_before_kingdoms.wav
vo_02_beneath_their_gaze.wav
...
```

Also include an alternate **no-voice-over cut** so the cinematic can work with music and sound alone.

---

# 6. Production folder to create

Create this structure, adapting paths if the repository already has an established convention:

```text
opening-cinematic/
  README.md
  ASSET_AUDIT.md
  SHOT_LIST.md
  TIMELINE.md

  veo-3.1-package/
    README_UPLOAD_ORDER.md
    MASTER_VEO_GUIDE.md

    shot_01_world/
      prompt.txt
      references/
      notes.md

    shot_02_greek/
      prompt.txt
      references/
      notes.md

    shot_03_norse/
      prompt.txt
      references/
      notes.md

    shot_04_egyptian/
      prompt.txt
      references/
      notes.md

    shot_05_japanese/
      prompt.txt
      references/
      notes.md

    shot_06_celtic/
      prompt.txt
      references/
      notes.md

    shot_07_mesoamerican/
      prompt.txt
      references/
      notes.md

    shot_08_conflict/
      prompt.txt
      references/
      notes.md

    shot_09_logo/
      prompt.txt
      references/
      notes.md

  gpt6-missing-art/
    GPT6_GENERATION_QUEUE.md
    prompts/

  audio/
    AUDIO_PLAN.md
    MUSIC_GUIDE.md
    SOUND_EFFECTS_GUIDE.md
    VOICEOVER_GUIDE.md
    cue_sheet.csv

  edit/
    EDIT_GUIDE.md
    shot_manifest.json
```

Copy only the relevant visuals into each shot's `references/` folder.

Do not copy the entire art repository into every folder.

---

# 7. Veo 3.1 rule: use our art as the visual authority

The Veo prompts must not say merely:

```text
make it like Age of Mythology
```

Use Pantheon Realms visual references as the primary authority.

For each shot, prepare the smallest useful reference set, normally:

```text
1 master/key environment image
1 pantheon visual reference
1 hero reference if visible
1–2 creature references if visible
```

Do not overload Veo with many contradictory images.

If a needed reference does not yet exist, add it to the GPT-6 generation queue first.

---

# 8. GPT-6 missing-art package

After the asset audit, determine exactly what is missing.

Create:

```text
opening-cinematic/gpt6-missing-art/GPT6_GENERATION_QUEUE.md
```

For every required missing image include:

- asset ID;
- exact filename;
- purpose;
- shot number;
- existing references to attach;
- dimensions/aspect ratio;
- exact GPT-6 image prompt;
- whether background should be transparent;
- whether this is:
  - master cinematic keyframe;
  - character/creature reference;
  - environment;
  - separated foreground layer;
  - separated background layer;
  - transition asset;
  - logo treatment.

Do not generate unnecessary content.

Prefer a small number of strong cinematic master frames.

---

# 9. Cinematic shot plan

## Shot 01 — World awakening

**Approx:** 0–6 s

Purpose:
- establish mythic world;
- calm beginning;
- imply multiple divine powers.

Visual idea:
- dark world/map/landscape;
- six distant divine lights or symbols emerge;
- subtle cloud/fog motion;
- camera slowly approaches.

Voice-over:

```text
Before kingdoms rose, the gods shaped the world.
```

Sound:
- low wind;
- distant choir/drone;
- subtle deep impact when divine lights appear.

Veo motion should be restrained.

---

## Shot 02 — Greek

**Approx:** 6–14 s

Visual:
- Greek coastal realm/city;
- heroic mounted commander or soldiers in foreground;
- Griffin crosses sky;
- banners move;
- distant divine lightning.

Visual identity:
- marble;
- bronze/gold;
- deep blue;
- Mediterranean light.

Voice-over starts or continues:

```text
Beneath their gaze, mortals built realms of their own.
```

Sound:
- distant army movement;
- cloth/banner;
- Griffin wing pass;
- thunder.

Camera:
- slow cinematic push toward city;
- moderate parallax.

---

## Shot 03 — Norse

**Approx:** 14–22 s

Visual:
- snow mountains;
- Norse warriors;
- ravens;
- mounted commander if appropriate;
- giant/monster silhouette in distance;
- storm/lightning.

Sound:
- cold wind;
- ravens;
- shield/armor;
- low war drum;
- thunder.

Camera:
- lateral movement or forward rise over ridge.

---

## Shot 04 — Egyptian

**Approx:** 22–30 s

Visual:
- monumental Egyptian city/temple;
- desert/Nile atmosphere;
- royal commander;
- undead or mythological forces awakening;
- enormous statue or creature silhouette.

Sound:
- desert wind;
- low stone rumble;
- ritual percussion;
- distant supernatural whisper/energy.

Voice-over:

```text
Six pantheons.
Six paths to power.
```

---

## Shot 05 — Japanese

**Approx:** 30–38 s

Visual:
- shrine/forest/mountain environment;
- samurai commander;
- drifting petals or leaves;
- spirits;
- Oni or other mythic silhouette;
- mist.

Sound:
- wind through forest;
- subtle bell;
- blade draw;
- supernatural tonal layer.

Camera:
- quiet controlled move that becomes more threatening near the end.

---

## Shot 06 — Celtic

**Approx:** 38–46 s

Visual:
- ancient forest;
- standing stones;
- druid/warrior forces;
- nature magic;
- large mythic beast;
- roots/leaves/fog movement.

Sound:
- forest ambience;
- low horn;
- stone resonance;
- leaves/branches;
- creature movement.

Voice-over:

```text
But no god would rule alone.
```

---

## Shot 07 — Mesoamerican

**Approx:** 46–54 s

Visual:
- jungle;
- monumental stepped temple;
- elite warriors;
- feathers/banners;
- giant serpent/creature presence;
- volcano/smoke.

Sound:
- stronger percussion;
- jungle ambience;
- distant rumble;
- creature/serpent movement;
- fire/volcanic impact.

Camera:
- rising/reveal motion toward temple.

---

## Shot 08 — Conflict montage

**Approx:** 54–62 s

Use rapid 1–2 second beats.

Possible sequence:

```text
Greek army advances
Norse warrior impact
Egyptian supernatural force rises
Japanese spirit/warrior strike
Celtic beast charges
Mesoamerican warriors ascend/attack
town / map / army / artifact / portal glimpse
two armies about to collide
```

Reuse final game sprites/art where possible.

Voice-over:

```text
Now armies gather.
Legends awaken.
And the age of realms begins.
```

Music reaches climax.

Sound:
- impacts;
- war cries used sparingly;
- creature roar;
- magic;
- weapon clash;
- final heavy impact.

---

## Shot 09 — Logo reveal

**Approx:** 62–68 s

Use the actual approved Pantheon Realms logo.

Do not ask Veo to recreate or redesign the logo.

Preferred sequence:

```text
bright impact / divine spark
↓
darkness / particles
↓
approved logo appears
↓
main theme resolves
↓
transition into main menu
```

The final logo placement should visually align as closely as practical with the main-menu logo placement.

Optional tagline:

```text
Choose your gods. Shape your realm.
```

---

# 10. Veo prompt requirements

For every shot, create an exact `prompt.txt`.

The prompt should:

- identify the attached Pantheon Realms reference images;
- instruct Veo to preserve their:
  - characters;
  - costumes;
  - creatures;
  - architecture;
  - palette;
  - visual identity;
- describe **movement and camera behavior more than redesign**;
- specify cinematic 16:9 composition;
- discourage visual mutation;
- avoid added text;
- avoid invented logos;
- avoid changing weapons/armor/species;
- request natural restrained motion;
- state that the result is part of one coherent cinematic.

Example pattern:

```text
Use the attached Pantheon Realms [PANTHEON] environment as the primary
scene reference and the attached [HERO/CREATURE] images as visual identity
references.

Preserve the exact faction design language, architecture, costume, creature
anatomy, palette and painterly fantasy-strategy style.

Create a cinematic [CAMERA MOTION].

Animate only natural scene motion:
[ACTIONS].

Do not redesign the characters or creatures.
Do not add text or logos.
Do not introduce unrelated architecture or modern objects.
Do not dramatically change lighting or palette during the shot.

16:9 cinematic composition, atmospheric depth, restrained high-quality
motion, coherent with the other Pantheon Realms opening shots.
```

Customize it for every shot.

---

# 11. First/last frame planning

Where useful, prepare:

```text
first_frame.png
last_frame.png
```

or instructions identifying which existing image should be used.

Use first/last frame control for important transitions when it helps consistency.

If a final frame must transition into another pantheon shot, document:

- brightness;
- dominant motion direction;
- color;
- framing;
- object position.

Example:

```text
Greek lightning flash ends nearly white
→ Norse snow/cloud scene begins bright
```

This makes editing easier.

---

# 12. Sound design

The opening must have three audio layers:

```text
MUSIC
VOICE-OVER
SOUND EFFECTS / AMBIENCE
```

Create:

```text
audio/AUDIO_PLAN.md
audio/MUSIC_GUIDE.md
audio/SOUND_EFFECTS_GUIDE.md
audio/cue_sheet.csv
```

---

# 13. Music guide

Prepare a guide for one continuous Pantheon Realms main-theme arrangement.

Do not simply use six unrelated music tracks.

Suggested arc:

```text
0–6     quiet mythic opening
6–14    Greek color
14–22   Norse percussion/color
22–30   Egyptian color
30–38   Japanese color
38–46   Celtic color
46–54   Mesoamerican color
54–62   combined climax
62–68   main Pantheon Realms theme/logo resolution
```

The musical identity should remain coherent throughout.

Describe desired instrumentation and emotional progression, but avoid copying an existing game's soundtrack.

If no finished game theme exists yet, prepare a placeholder music specification rather than blocking production.

---

# 14. Sound-effects guide

Create a cue list for each shot.

Examples:

### Shared
- wind;
- fire;
- armor;
- footsteps;
- horse movement;
- banner/cloth;
- distant army;
- weapon impacts;
- magic;
- creature movement;
- creature roars;
- transition impacts.

### Greek
- Griffin wings;
- thunder;
- bronze/armor.

### Norse
- ravens;
- cold wind;
- heavy drums;
- shields.

### Egyptian
- sand;
- stone;
- ritual resonance;
- supernatural awakening.

### Japanese
- forest;
- bell;
- blade draw;
- spirit sound.

### Celtic
- forest;
- leaves;
- stone resonance;
- beast movement.

### Mesoamerican
- jungle;
- ceremonial percussion;
- volcanic rumble;
- fire.

Do not fill every second with sound.

Use silence and dynamics deliberately.

---

# 15. Audio cue sheet

Create:

```text
audio/cue_sheet.csv
```

Columns:

```text
start_time
end_time
shot
layer
cue
source_status
filename
notes
```

`layer` examples:

```text
music
voice
ambience
sfx
transition
```

`source_status`:

```text
existing
to_record
to_generate
placeholder
```

This should make final editing straightforward.

---

# 16. Editing guide

Create:

```text
edit/EDIT_GUIDE.md
```

Include:

- timeline;
- shot order;
- expected clip lengths;
- transition style;
- audio cues;
- voice-over cues;
- logo timing;
- main-menu transition;
- recommended final format.

Recommended master:

```text
1920×1080
16:9
30 fps
high-quality master
```

Then export formats appropriate for the final Electron/browser implementation.

Do not bake final compression settings until actual playback support in the project is checked.

---

# 17. Main-menu transition

The end should feel connected to the game.

Preferred behavior:

```text
cinematic logo reveal
        ↓
hold logo briefly
        ↓
background subtly transitions/fades
        ↓
main-menu artwork appears
        ↓
menu controls fade in
```

Where practical, align the cinematic logo with `full_logo.png` position in the actual main menu.

Codex should document how the game should:

- play the opening on launch;
- allow Escape/click to skip;
- avoid replaying after a skip unless configured;
- provide a Settings option such as:
  - `Play opening cinematic on startup`;
- provide a menu/credits/cinematics entry to replay it later;
- fall back cleanly if video playback fails.

Do not implement this unless the repository task explicitly includes integration; at minimum document the integration plan.

---

# 18. Do not allow AI video generation to rewrite canon

If Veo changes:

- creature anatomy;
- armor;
- hero identity;
- pantheon colors;
- architecture;
- weapons;
- logo;
- major environment design;

reject that generation and regenerate.

The reference assets are authoritative.

The cinematic must advertise the actual game we are making.

---

# 19. Quality strategy

Do not attempt one 60-second generation.

Generate **short controlled shots**.

For every important shot recommend producing several alternatives:

```text
take A
take B
take C
```

Then choose during editing.

Prefer:

- strong composition;
- controlled movement;
- continuity;
- recognizable Pantheon Realms designs;

over maximal motion.

A mostly static shot with excellent parallax, atmosphere and sound is better than a highly animated shot whose character design mutates.

---

# 20. Required final deliverable from Codex

When this task is complete, the repository should contain a folder that I can open and immediately understand how to produce the cinematic.

At minimum:

```text
opening-cinematic/
  README.md
  ASSET_AUDIT.md
  SHOT_LIST.md
  TIMELINE.md

  veo-3.1-package/
    MASTER_VEO_GUIDE.md
    README_UPLOAD_ORDER.md
    shot_01_world/
    shot_02_greek/
    shot_03_norse/
    shot_04_egyptian/
    shot_05_japanese/
    shot_06_celtic/
    shot_07_mesoamerican/
    shot_08_conflict/
    shot_09_logo/

  gpt6-missing-art/
    GPT6_GENERATION_QUEUE.md
    prompts/

  audio/
    AUDIO_PLAN.md
    MUSIC_GUIDE.md
    SOUND_EFFECTS_GUIDE.md
    VOICEOVER_GUIDE.md
    cue_sheet.csv

  edit/
    EDIT_GUIDE.md
    shot_manifest.json
```

Each Veo shot folder must contain:

```text
prompt.txt
references/
notes.md
```

The `references/` directory must contain only the exact project images I should bring/upload for that Veo generation.

If an image is not yet available, do not silently substitute unrelated art. Put the missing asset into the GPT-6 queue and clearly mark the Veo shot as waiting for that asset.

---

# 21. Final report

At the end, report:

1. which existing Pantheon Realms assets were reused;
2. which assets still need GPT-6 generation;
3. which files I should upload to Veo for each shot;
4. the exact Veo prompt for each shot;
5. voice-over files I need to record/generate;
6. music still needed;
7. sound effects still needed;
8. any placeholders;
9. any continuity or art-consistency risks;
10. the recommended order in which I should generate the Veo shots.

Do not stop at a high-level plan. Build the folder, copy/organize the relevant existing visuals, write the actual prompts and guides, and leave the project ready for production.
