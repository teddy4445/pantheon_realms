# Changelog

All notable changes to Pantheon Realms. The version shown in the game comes
from `package.json` (main menu and Settings → Saves); it is never typed into a
screen.

## 1.6.0 — 2026-10-18 · Ships and sea battles, caravans, scouting, an aimed catapult; naval random maps, sea creatures and coastal sites

Four deliveries of 2026-10-17: the EXPEDITION, NAVAL & SIEGE handoff
(docs/expedition-v1), the TWO NAVAL RANDOM-MAP TEMPLATES
(assets-source/art/naval-random-v1), the SEA-CREATURE ANIMATION & BATTLE
handoff (assets-source/art/sea-creatures-v1) and the COASTAL SITES AND SEA
SALVAGE handoff (assets-source/art/sea-sites-v1). All values are proposed and
unplaytested. Saves: format, schema and content stamp unchanged. Each new system
has its own scenario flag, so a save from before this version keeps the old
behaviour and nothing switches on after loading one.

- **Inspect any creature in battle**: right-click it, press I, or use its info
  button. The card shows its live Attack, Defense, damage, speed, shots and
  retaliations left, the front creature's health apart from the stack's, and
  every effect on it with the rounds left and who cast it. Pin it to keep it
  open. Inspecting never gives an order.
- **Scouting reveals armies gradually**: an enemy far away shows only its
  banner and a rough size; within 3 hexes you see which creatures it has; a hero
  with Scouting sees how many, as a range, from 2, 3 or 4 hexes. Out of sight
  an army stays where it was last seen, marked with the day, until you look
  again. Guards and garrisons show in full as before.
- **The catapult stands on the battlefield**: in a siege the attacker's
  catapult sits in the top-left corner (120 health, Defense 6). After all the
  creatures have acted, you aim it at a wall, gate, tower or keep and fire, or
  skip. The defenders can attack and destroy it; a destroyed catapult no longer
  fires. The computer aims at the gate or tower that matters most.
- **Recruitment caravans**: "Send by caravan" in a town or on the recruitment
  screen buys up to seven stacks there and sends them to another of your towns
  for 150 Gold more. The wagon moves 600 a day from your next turn and joins the
  garrison on arrival. It stops when something blocks the road or the town is
  lost; send it somewhere else for free. Enemy heroes can attack it; the
  creatures defend themselves, without a hero.
- **Hero ships**: buy a ship at a coastal town (1,500 Gold and 10 Wood), walk
  to it and embark; sail at 100 movement per sea hex; land on an empty beach.
  Embarking and landing need 100 movement and use all you have left that day. A
  route across the sea stops at the shore and asks before you embark or land,
  and a journey of several days continues with Continue journey. Each ship
  flies its owner's colour and rocks, sails, sinks and wrecks on screen.
- **Boarding battles**: attack an enemy ship next to yours to fight on two
  decks joined by one narrow bridge. Flyers may cross the water but land only on
  wood. The winner's ship takes the contested hex; the loser's sinks. Retreating
  at sea sails your ship to the next free water hex.
- **Two naval random maps**: The Shattered Crown (two, three or six empires;
  hold the central relic for 7 days, or conquer) and The Serpent Straits (a
  duel; conquer). Huge only. Every empire starts on its own island with a free
  ship beside its harbour; islands are reached only by sea, and portals are off
  ("Ships connect these islands."). Each has its own painted card and loading
  picture.
- **Sea creatures**: five neutral families met at sea, each with its upgraded
  form — Hippocampus (flying), Triton, Isonade, Cetus and the rare Hafgufa —
  fought on a ship-against-the-sea battlefield: your army stays on deck, they
  swim or fly. Swimmers have two shots each round, renewed every round. A
  creature on deck can throw a weak Deck Harpoon at anything in the water, so a
  melee army is never helpless. They appear in the Bestiary and the map editor.
- **Coastal sites**: coastal watchtowers you take on foot show everything
  within 6 hexes, sea included, and warn you when an enemy ship comes in sight;
  floating Wood, Stone and Gold are picked up by sailing onto them; shipwrecks
  can be explored for 100 movement — some hold cargo, some raiders to fight on
  the boarding decks, some an artifact. Both naval maps place them, equally for
  every empire.
- **Map editor**: place ships, sea creatures, watchtowers, salvage and wrecks;
  a refused tile says why. The editor does not generate the naval map types.
- **Computer players** use ships, boarding, caravans, the catapult, sea
  creatures and coastal sites by the same rules and prices.
- **Where they are on**: inspection everywhere. Scouting and the aimed catapult
  in new skirmishes, random and editor maps and new campaign runs (not in The
  Three Beacons, nor in the old missions of a campaign begun before 1.2.0).
  Caravans, ships, sea creatures and coastal sites in new skirmishes, random
  and editor maps; not in the campaigns.
- Fixed: Enter or Space on a focused button on the adventure map no longer
  also ends the day.

## 1.5.0 — 2026-10-17 · City dedications: each town honors one of your gods

The CITY DEDICATIONS handoff of 2026-10-17 (60 god profiles, 11 town services,
docs/divine-city-benefits-v1). Proposed, unplaytested values, with one tuning
(below). Saves: format, schema and content stamp unchanged; saves from before
this version keep the old god economics and have no dedications, and nothing
switches on after loading one.

- **Dedicate a town** with Temple II to your patron or a minor god you have
  committed to, from the medallion beside its temple. Each god gives that town
  three things: a resource gift every week, extra weekly stock of one favored
  creature family (+2 for tiers 1–2, +1 for tiers 3–5, one every two weeks for
  tier 6 and every four for tier 7, once that dwelling is built), and one town
  service — cheaper hero training, market purchases, fortifications, library,
  civic hall, favored dwelling, spellbook, favored recruits or troop upgrades,
  artifacts, or +2 town vision with a watchtower. Several towns may honor
  different gods, or the same one.
- The first dedication is free and its service works at once; the gift and the
  growth start at the next new week. Switching to another god costs 500 Gold and
  happens at the next new week (no cancel; not refunded if the town is taken).
  Losing the Temple makes a dedication dormant; a captured town loses it.
- **Economic gods change**: in new games the gods' empire-wide daily income and
  weekly growth bonuses (12 gods, e.g. Hermes, Njord, Hathor, Inari, Demeter)
  come through their city dedications instead; their other blessings are
  unchanged. Inari's weekly gift is 1,200 Gold and Njord's 3 Crystal (tuned up
  from the delivered 600 Gold and 4 Wood so they break even at about three
  dedicated towns).
- The town, the god cards, recruitment, every service price, the end-of-day
  summary ("City blessings") and the Encyclopedia show what each god gives and
  what it saves. The computer dedicates and switches its towns by the same rules.
- On in new skirmishes, random and editor maps and new campaign runs; off in
  The Three Beacons.

## 1.4.0 — 2026-10-16 · Blows that land, neutral camps the computer uses, smarter patrols

Three of the owner's ten improvement ideas (1, 3 and 5), with the owner's
choices for the camp allowance and for who retreats. Proposed, unplaytested
values. Saves: format, schema and content stamp unchanged; older saves load (a
camp starts the week with its whole training allowance, a patrol continues its
round from its first waypoint).

- **Blows land on screen**: a stack's count changes when the missile, blow,
  spell or miracle reaches it — never while it is still in the air — and a
  destroyed stack's count disappears with the blow. Each missile has its own
  sounds from the game's sound set (a javelin's whoosh and thud, a boulder's
  heave and crash, the frost breath's hiss, the banshee's wail…) instead of a
  bow and an arrow for every shooter; the towers and the catapult keep theirs. A
  blow that kills creatures holds the battle for a beat, longer when the whole
  stack falls, with a soft flash where it lands (no flash on Low graphics or with
  reduced motion). Looks and sound only: no rule, damage or random draw changes.
- **Upgrades at neutral camps are limited each week**: a neutral hiring site
  upgrades at most as many creatures a week as it hires (its weekly stock),
  shared by everyone and renewed with the stock. The Train strip shows how many
  are left this week out of the weekly number and says why when none are left.
- **The computer uses the neutral camps**: it hires the form that strengthens its
  army most for its gold (usually the upgrade), upgrades its own base stacks
  there within the week's allowance, and plans its routes by what a camp can give
  it. It no longer heads for a camp whose pact it has not made.
- **Smarter patrols**: a patrol chases the visible hero it can best beat (the
  nearest, then the weakest), guards its route and camp when a hero comes near,
  and never stops where a much stronger hero can reach it. A patrol with a
  commander falls back from a much stronger hero to its camp or the safest point
  of its route; wandering monsters stand their ground. Patrols now walk their
  whole route in order (before, some never moved because their next waypoint
  lay in their own fog, and others turned back halfway on long legs).
- The computer no longer calls a hero home every day because a wandering monster
  stands near an empty town (monsters hunt heroes, never towns).

## 1.3.0 — 2026-10-16 · Every shooter's own missile, and an upgrade for each of the six new neutrals

Battle FX & neutral-upgrade delivery of 2026-10-15 (25 pictures: twelve
missile/impact sheets, six portraits, six battle atlases and the Dawncrest
flight). Proposed, unplaytested values. Saves: format, schema and content stamp
unchanged; older saves load with their armies as they were (nothing is upgraded
by itself), and saves with the new forms load in this version.

- **Every shooter throws, casts or breathes its own missile** — javelins for
  Peltasts and Jackal Guardians, arcane bolts for the Temple Adepts, boulders for
  the Cyclopes, frost breath for the Lindworms, granite blocks for the Colossi,
  holy fire for the Kirin, a spectral wail for the Banshees, atlatl darts for the
  Eagle Warriors, serpent fire for the Xiuhcoatl, sling stones and lead bullets
  for the slingers, an arrow from the siege towers and a stone from the catapult —
  each form its own (upgrades look different), and its own small impact on the
  target. Heavy stones arc high, javelins and darts arc low, magic flies straight;
  the missile leaves the hand, staff or mouth on the release frame and the impact,
  the hit and the damage show at the moment it lands. A shooter fighting in melee
  throws nothing. Looks only: damage, range, ammunition and every rule are
  unchanged.
- **Six upgraded neutral creatures**: Dawncrest Pegasus, Crownroot Runner,
  Crested Serpopard, Dreamtusk Baku, Ridgeback Afanc and Crownfin Ahuitzotl, each
  with its own portrait and battle animations, the same ability as its base form.
- **Neutral hiring sites offer both forms** from the one weekly stock shared by
  everyone (the stock never doubles), with a base / upgraded choice, the chosen
  form's portrait, stats and price, Recruit and Recruit all affordable — and
  **Train**: a visiting hero's base stack of that creature can be upgraded there
  for the price difference (no stock used, nothing lost; a partial training needs
  a free slot). Other camps still hire only their own creature, and a town never
  trains these neutrals.
- The Bestiary and the unit page show both forms of the six families.

## 1.2.0 — 2026-10-15 · The campaign expansion: 37 chapters as regions, six neutral creatures, battles by hand

Campaign expansion and neutral creatures handoff of 2026-10-15 (kit: 31
pictures — six creature portraits, seven animation atlases, ten map-site
pictures, six icons, two backgrounds — plus the design of all 37 chapters).
Values are proposed and unplaytested. **Saves:** the save format, schema and
content stamp are unchanged, so every older save loads; a campaign run started
before this version stays on its original missions to the end (nothing is
reinterpreted, merged or deleted), and new runs play the new chapters.

- **Every campaign rewritten as chapters on real regions** — The Three Beacons
  (2), The Silent Oracle (6), The Winter Oath (6), The Twelfth Hour (6), The
  Lantern Road (6), The Silver Branch (6) and The New Fire (5): 37 chapters that
  carry every original mission once, with the same heroes and cast. Each map is
  drawn from its chapter's design (lakes, rivers, ridges, settlements where the
  story puts them), with a circuit through it, at least two ways to the main
  objective, a shortcut opened through play, and pressure that is announced and
  finite: patrols with a home camp (take it and they withdraw for good),
  counterattacks that wait for a named event, deadlines that can cost an
  optional reward but never the chapter.
- **Chapters in either order.** Where the story forks, two chapters can be
  played one at a time in either order before the story goes on; what each
  leaves behind (evidence found, choices made) is remembered and changes what
  later chapters say and offer, never which chapter counts as complete.
- **Campaign chronicle**: the campaign screen shows the chapter graph (complete,
  current, available, locked with the reason), the selected chapter's painting,
  first line and the chapters it carries; the result screen offers the next
  chapter or the choice of two, lists what the chapter leaves behind, and lets a
  finished chapter be **replayed as practice**, which never advances the run
  (the run is restored exactly afterwards). The final chapter's ending depends
  on the last choice. The Journal's Campaign tab shows the chronicle too.
- **Battles in campaigns are fought by hand.** No Auto, no quick battle and no
  casualty preview in a campaign; the rules refuse an automated campaign battle
  outright (state and dice untouched), not only the buttons. Skirmishes keep
  every option.
- **The Journal's Ledger** (new tab): running and announced deadlines with
  their days, known threats (waiting, active, withdrawn, defeated) with a Show
  on map button, evidence and decisions with their icons, and what earlier
  chapters carried in. Missed optional tasks read "Missed", never as a defeat.
  The adventure HUD shows each running deadline under the objectives.
- **The introduction** of a chapter lists the open tasks, deadlines, carried
  bonuses and loss conditions with the manual-battle note; briefing lines
  follow what earlier chapters revealed.
- **New map places**: sluices that switch a channel between water and marsh
  (they show exactly what will change before you operate one), ferry landings
  (some locked until liberated), supply depots, one-time **story choices and
  negotiations** (each option's exact cost, what it gives, which guards stand
  down without a battle, what it records; affordable, unaffordable, needs
  evidence, decided, or left for later), and objective markers on the map.
- **Six neutral creatures** — Pegasus, Root-Runner, Serpopard, Baku, Afanc and
  Ahuitzotl — one form each, hired at their own sites in the campaigns (and in
  the map editor) from a small stock shared by everyone and refreshed weekly,
  some only after a pact. Each has one ability: the Serpopard's Long Reach
  (strikes two hexes away) always works; Sheltering Wings, Distract, Devour
  Dread, Reed Guard and Tail Snare are used once per battle, with the exact rule
  on the button, legal targets marked, the effect shown on the battlefield and
  in the log; the computer uses them when they help. Their
  battle figures are drawn from the delivered atlases at one constant scale,
  mirrored for the defender; the Pegasus takes off, flies and lands.
- **Neutral recruitment** at a hiring site: the creature's large portrait on
  its own background, single form, exact stats and ability, habitat, stock and
  price, the hero's seven slots showing where the recruits go, **Recruit** and
  **Recruit all affordable**, and the reason when it is locked, empty, full or
  unaffordable. The Bestiary lists the six under Neutral with habitat and where
  they are hired.
- **Map editor**: the six hiring sites (with a habitat check), sluices with
  their channels (the editor checks every empire's town stays reachable with
  every sluice open and closed), ferry pairs and supply depots. Random maps
  gain an optional **New neutral creatures** pool (off by default; a map made
  with it off is identical to before).
- Continue resumes the main run rather than a newer practice replay; save rows
  show the campaign version (Chronicle or Legacy campaign), the chapter, and
  practice replays apart.
- Fixes: a gate opened by an objective or a deadline now opens at once, not on
  the next action; the Bestiary opened from a creature card no longer lies
  under the dialog; in battle, a destroyed stack plays its hit and death before
  it is laid down.

## 1.1.6 — 2026-10-14 · A new recruitment screen, painted routes, and journeys kept from day to day

Recruitment & persistent journey handoff of 2026-10-14 (art: the recruitment &
route kit — nine new pictures — and the game's own creatures, portraits and
courts). Saves gain one optional field (planned journeys); older saves load
with none. Rules values are unchanged; one new command (Recruit all).

- **Journeys are kept.** A hero's chosen destination stays planned after the
  day ends, while other heroes are selected, through towns, menus and other
  screens, and in saves (autosave included). The next day **Continue journey**
  (boot-and-arrow button under the map, or the continue-move key — Space unless
  remapped) walks today's part of the way; a new day never moves anyone by
  itself, and nothing is fought or chosen without the player. Only arriving
  clears it; **Cancel journey** (×) clears only that hero's. Right-click now
  only inspects a tile. The route is quoted again from where the hero stands
  each time: a blocked destination is kept and shown locked ("Route
  unavailable"), a battle or a portal pauses it, a route that changed (a
  blocker came into view, a hero was carried off) is shown with **Accept new
  route** before it is followed, a lost or captured hero's journey goes with
  it, and each player's journeys are their own.
- **Painted route on the map** in place of the yellow line and dots, during
  the walk too: a small gold arrowhead on each step reachable today, bronze ones
  for later days with an upright hourglass where a new day begins, the
  destination's compass seal laid on the ground with an upright parchment
  carrying the arrival day (today = 1), the crossed swords kept when a battle
  waits there, and a hollow gold ring at the selected hero's feet. At a
  distance the route thins out and its markers keep their size on screen.
  Markers stay under the fog and the figures and never take a click.
- **Recruitment, redesigned for all six pantheons**: the seven dwellings in one
  row (the upgraded portrait where its dwelling stands, a lock and the building
  to raise where none does, "0 available" for an empty pool); the creature large
  on its pantheon's court — its own animated figure, sized by what it shows over
  its whole idle, feet on the ground — with its two forms as medallions; the
  upgraded form chosen first where it can be recruited, an explicit choice of
  the base form kept; the details, destination (heroes and garrison as
  portraits), quantity and **Recruit N** beside it; and a dock with the
  destination's seven slots, **training** for the selected family (the stack to
  train, a quantity, Max) and **Recruit all**. No panel scrolls at 1280 × 720 or
  larger; narrower windows and large interface scales get Creature / Recruit /
  Train views over a dock that stays in view.
- **Recruit all** buys every creature the town has this week — each family in
  its chosen form, one form per shared pool — into the chosen army in one
  click and ONE all-or-nothing command (no confirmation, one toast). Its total
  troops and every resource are shown before the click, with a breakdown on
  hover or focus; when the whole batch does not fit or cannot be paid it is
  off with the reason ("Needs 1 more army slot", "Short 300 gold") and nothing
  is bought — single recruiting stays available.
- The planning tip on the map sits above the journey bar, and the recruitment
  tips over the court instead of over the dock.

## 1.1.5 — 2026-10-14 · The Silent Oracle, a shorter second tutorial mission, and the player on the left

Owner round of 2026-10-14. Saves (format and schema) and preferences are
unchanged; a save made during The Three Beacons' second mission loads and
carries on under its new single objective.

- **The Silent Oracle** — a new seven-mission Greek campaign, listed second,
  right after The Three Beacons (which teaches the game). A year after the
  beacons, the Oracle of Kalliste has fallen silent and Theron the Hierophant
  speaks in her name. Alexios leads again with Thaleia and Ione; Melas returns
  as the rival lord of mission 5 and his Scout Captain patrols the islands of
  mission 4. Built on the campaign arc of the other five (pilgrims' road,
  bronze bull, griffin covenant, hall of echoes, Melas's city, minotaur
  labyrinth, the Oracle's spring), expanded content on, two endings. Values
  are proposed and unplaytested (the computer wins it at every level; see
  `DEVELOPMENT_STATUS.md`). Its story art (GPT-6 Brief 18, delivered and
  imported the same day): the busts and square portraits of Theron the
  Hierophant, the Oracle Myrrine, Doros and Phaidon, the cover and campaign
  card, seven mission pictures with their cards, and the two endings —
  the flowing spring for "Unseal the spring", the assembly and the sealed
  spring for "Leave the spring sealed".
- **The Three Beacons, mission 2 (Wings over the Pass)** asks for one thing:
  **train 2 Griffins** in Passhaven (build the Griffin Aerie and the Windcrest
  Aerie, recruit Griffins, train two). Passhaven starts with the Griffin
  covenant. Nothing outside the town is needed: the pass, the nest, the god
  choice, the Windcrest-in-the-army step and the beacon are no longer
  objectives (the ridge and its guards stay on the map as optional ground;
  Athena or Ares can still be chosen). Training the second Griffin wins the
  mission and gives its 2,000 experience.
- **No gold line over the map** between the tile panel and the Objectives
  panel: the left column no longer draws a scroll rail (it was a Windows
  scroll bar shown for a few pixels of panel frame); it still scrolls with
  the wheel when it is really too tall.
- **Attacked by a computer hero, the player still stands on the left, in
  blue.** The battle is drawn mirrored — the defender's side on the left —
  with the player's markers, count badges and turn-order marks blue and the
  enemy's red; the header lists the player first, and the result screen too.
  Text stays readable, clicks land on the right cells, the sword cursor
  points the right way and whole-field effects come from the caster's side.
  Sieges of the player's towns are mirrored the same way (walls on the left).
  Rules, cells and facings are unchanged. Hot-seat battles between two
  people keep the attacker on the left.
- **Days to arrive**: pointing at a destination the hero cannot reach today
  shows a small number beside the cursor — the day the hero gets there,
  today being day 1 — and the route line under the map says "… steps today ·
  N days" after the first click.
- The mode card says "7 story campaigns across 6 pantheons".
- **A named guard commander shows his face in the battle header** (Doros at
  the labyrinth gate, Theron in the inner hall, and the other campaigns'
  commanders of guarded sites), as heroes always did; guards without a
  commander still show none.

## 1.1.4 — 2026-10-11 · GUI audit fixes and the six-pantheon siege gates

A GUI release over 1.1.3 that answers the 1.1.2 GUI audit
(`docs/gui-audit-1.1.2/CLAUDE_HANDOFF.txt`) and integrates its gate art. Game
rules, content values, AI, saves (format and schema), preferences, the fixed
world camera, combat cells and siege HP are unchanged.

- **Siege gates**: each pantheon's new gate (`assets-runtime/siege-gates-v3`,
  the six selected v5 atlases, 18 states) replaces the siege-v2 gatehouse
  still. It is an opening in the wall facing the attackers, centred on the
  gate cell in every state (intact, damaged, breached — the rules' HP decides,
  never the picture), so the bridge, the road through the doorway and the
  breach line up. While the wall section beside the gate stands, the gate's
  own connector draws that cell (no doubled wall); when it falls, the
  connector is cut back to the gate's jamb and the rubble shows. Creatures in
  the gateway are drawn in front of its far (north) part and behind its near
  (south) part. The v2 ground, walls, towers, keeps, moat and bridge stay.
- **Start battle** reads on its painted face: icon beside the label,
  centred, instead of an icon-over-label tile whose label fell on the
  bottom rim. The same for Auto: on. Hit target, focus ring, keyboard and
  disabled states as before.
- **Labels on parchment** (Difficulty on the campaign page and elsewhere):
  dark ink instead of pale gold (about 1.1:1 before, 7.9:1 now against the
  parchment colour); gold stays on the dark panels.
- **Journal and other books, briefing scroll**: until the painted book or
  scroll is drawn — or if it cannot load — the text sits on plain paper, never
  on the dark screen; the painting fades in once decoded. The book and the
  parchment are decoded in the background once a match is on the map.
- **Battles open readable**: the field shows "Preparing the battlefield…"
  and takes no orders (the computer waits too) until its painting, the siege
  pieces and every stack's standing frame are drawn; a picture that fails is
  replaced by a plain silhouette so the battle always becomes playable (at
  most 15 s). The menu stays reachable. Stacks also appear sooner: each shows
  its idle frame as soon as that strip arrives.
- **Town**: the internal "Placeholder town art · owner concept reference"
  caption no longer covers the delivered town paintings (it is kept only for
  a real stand-in).
- **Smaller polish**: the creature page never enlarges a sprite past 2.25
  screen pixels per painted pixel (crisp instead of soft); the troop exchange
  with a town shows the town as built (its stage and constructed buildings)
  instead of an empty plot; recruitment tips sit at the bottom left, clear of
  the Recruit and Train controls, and every tip moves to the top on narrow
  windows.

### Compatibility

- Saves and preferences: unchanged; saves made by earlier versions show their
  sieges in the new gate art at the HP they hold.
- New read-only test hooks under `?e2e`: `__prSiege()` (how the siege is
  drawn) and `boardLoading` in `__prInspect()`; `busy` is also true while a
  battle board loads. New test IDs: `battle-loading`, `town-thumb`.

## 1.1.3 — 2026-10-11 · The owner's five pre-game fixes

A GUI release over 1.1.2 (the owner's list of 2026-10-11): game rules,
content values, AI, saves (format and schema), preferences, the fixed world
camera and the siege visual revision 2 are unchanged.

- **Title**: always the frontend kit's title painting (the hall of the six
  pantheons). 1.1.0–1.1.2 picked it at random among thirteen pictures, so most
  starts showed one of the twelve older paintings; those are now only a
  fallback when the kit's file is missing. Over the hall the menu is the kit's
  slim panel between the pillars, under the logo (the older ornate frame stays
  with the older paintings). Hall of Records, Continue and Quit as before.
- **Encyclopedia**: the eight sections are a rail at the left, under the
  search (arrow keys move between them; a row of tabs on phones). Every card
  wears a painted frame instead of a pale paper box — the pantheon's own frame
  in its section (bestiary, gods, heroes, towns), the painted socket rim
  elsewhere — over a faint warm tint; creature portraits sit in the socket rim
  and gods in the round medallion. In the bestiary each family shows its two
  forms side by side with an arrow between them. Returning from a creature's
  page restores the scroll position even when the page is still settling.
- **New Game**: no Back strip at the bottom; the header keeps its Back.
- **Pantheon screens**: the painted leather and parchment at their own grain
  instead of flat navy — on the pantheon choice (patron, creatures and setup
  panels, the parchment summary, more of the painting behind) and on the
  gods screen in a match (every panel and god card).
- **Creature page**: two framed pages in the creature's pantheon frame. Left:
  name, then pantheon · tier · size, the summary, both forms as socketed tiles
  (the current one checked), the statistics as a grid of tiles (growth among
  them), the cost, each ability as a row with its badge, the lore. Right: the
  creature on its pantheon's recruitment court (neutral creatures: an open
  landscape), with the controls grouped and labelled under it (Animation,
  Playback, Speed, View). The painting is decoration only.

### Compatibility

- Saves and preferences: unchanged from 1.1.0.
- Test selectors: all kept; new `unit-stats`. The encyclopedia's sections are
  still `role="tab"` (now `aria-orientation="vertical"`).

## 1.1.2 — 2026-10-11 · The two sessions' work merged; painted buttons fixed

The installer for everything built on 2026-10-10 by the two sessions that
worked on this checkout, merged. A GUI fix release over 1.1.1: game rules,
content values, AI, saves (format and schema), preferences, the fixed world
camera and the siege visual revision 2 are unchanged.

- Contents as 1.1.1: the 1.1.0 interface redesign, the pre-game screens and
  their frontend kit, the encounter scenes and reward receipts, the six
  adventure screens and the 54 hero busts. The owner chose to keep 1.1.1's
  pre-game screens; the second session's own implementation of the same
  screens is not included (its encounter work already was).
- Fixed: the painted primary button collapsed to a thin strip whenever its
  footer gave it less height than the painted face plus its 44 px hit bands:
  "Confirm trade" in the Marketplace and the other adventure-screen footers
  (Heroes' Lodge, recruitment, creature camp), and Done in the hero meeting,
  at common window sizes (1280 × 720 to 1600 × 900). Those footers now size
  the painted face instead of the button box.

### Compatibility

- Saves and preferences: unchanged from 1.1.0.
- Test selectors: unchanged from 1.1.1.

## 1.1.1 — 2026-10-10 · Encounter scenes, adventure screens and hero portraits

Builds on 1.1.0 (not released separately; this installer carries both). A GUI
and content release: game rules, content values, AI, saves (format and
schema), the fixed world camera and the siege visual revision 2 are
unchanged.

### Encounter scenes (handoff `docs/encounters-v1.1.0`)

- Eight paintings under `encounterkit.*` (`assets-runtime/encounters-v1.1.0`,
  relative URLs): six camps for the hero meeting, the blank introduction
  scroll and the empty reward tray.
- **Hero meeting** (army exchange): the camp of the initiating hero's
  pantheon behind each real hero — their painted bust, else that hero's own
  portrait in a socket (never another hero's) — above their own troop strip,
  every slot shown. With a town the right side is the town's garrison under
  its own painting and name (no invented castellan). Still the existing
  transfer: select a stack, optionally a quantity, click the destination; one
  gesture, one TransferStack; Cancel clears the selection only; Done closes.
- **Scenario introduction**: the mission painting dimmed behind the unrolled
  scroll; header (campaign and mission order, or Skirmish / Random map; name,
  subtitle, the player's emblem, playtime, map size, difficulty); the mission
  illustration and the protagonist; the summary and every visible objective
  with an icon from its condition, its optional label and status (the list
  scrolls); "New in this mission" behind a disclosure; the briefing lines with
  their real speakers, Back / Next and Begin, which only closes the briefing.
  A plain parchment page in narrow windows. (Replaces the 1.1.0 briefing's
  three-objective summary.)
- **Rewards**: what a treasure chest, quest hut or map event granted is read
  from that command's own committed events and the state before and after it
  (never from toast text or the saved history, so a reload reopens nothing):
  small pickups pass as a tray notice, artifacts, creatures, quests and mixed
  rewards open a receipt on the velvet tray whose Continue only closes it.
  Artifacts say where they went (equipped, backpack, or set aside when the
  backpack is full); a capped experience gain says so; nothing gained shows no
  celebratory tray. The battle result shows its committed rewards on the same
  tray (casualties and outcomes as before).

### Adventure screens (handoff `docs/adventure-gui-v1.1.0`)

- 21 paintings under `adventurekit.*` (`assets-runtime/adventure-gui-v1.1.0`):
  a tavern room and a recruitment court per pantheon, six encounter
  landscapes, the skill plaque, the hero medallion and the balance. One shared
  stage (scene, readability shade, real figures, the faction's frame, live
  interface) for six screens; the scenes are decorative and grant nothing.
- **Heroes' Lodge**: the town's own room (the town's pantheon, not the
  owner's); each candidate standing as themselves; picking one shows that
  hero's details (class, specialty, attributes, story, starting escort or
  returning troops, price) with **Hire**, which still asks to confirm and sends
  one HireHero. Any number of candidates; the weekly limit and the scenario's
  hiring rule as before.
- **Recruitment**: the town's court behind the seven dwellings in a row (locked
  ones say so, each with its shared weekly pool), Base / Upgraded for the
  chosen family (choosing a form never upgrades), the creature's own idle
  animation, its details, abilities, destination, quantity and price; the
  army it joins and **Train existing troops** below. Recruiting stays
  immediate (no extra confirmation). Creature camps stand in the landscape of
  their own ground and keep their own command.
- **Marketplace**: the town's merchant painting above the counter; Sell for
  Gold / Buy with Gold and the three tradable resources; You give and You
  receive beside the balance, with the rate, the quantity and the holdings
  after the trade; trades still go through Gold only, Favor is not tradable,
  and only **Confirm trade** sends the command.
- **Level-up**: the hero's pantheon camp dimmed behind the hero's medallion,
  the level-up banner with its live plaque, the primary gain, the gods' gift
  first when one is offered, then the skill plaques — a click still takes the
  skill at once (no Confirm), once.
- **Spellbook**: the open book over the hero's camp: filters (use and tier)
  and every known spell on the left page (scrolling), the chosen spell's
  icon, tier, use, crest, effect, lore and cost on the right. Reading a book
  never casts; in casting mode a spell is cast with one click (or the Cast
  button on the right page), once; disabled spells keep their reasons.
- **Encounter**: the landscape of the destination's climate and ground (never
  a pantheon's; a siege shows the town itself), your hero and the opponent
  (the enemy hero, or the leading stacks), both armies with their exact
  counts, the neutral offer, climate, siege notes, quick-battle preview and
  reward as before, and every action (Withdraw, Accept them, Let them go,
  Quick battle, Attack / Fight anyway).

### Hero character portraits (delivery `docs/hero-portraits-complete`)

- The 54 missing hero busts (`assets-runtime/hero-portraits-complete`, native
  PNGs with transparency, each made from that hero's own square portrait) are
  registered as an additive pack beside the story art (which keeps
  precedence): every one of the 74 catalog heroes now resolves its own bust
  through its portrait ID (`hero.<…>.portrait` → `hero.<…>.bust`), with the
  same hero's portrait as the fallback. The 15 art-only identities of the
  delivery stay out of the catalog.
- Where they appear: the Heroes' Lodge candidates, dialogue speakers, the hero
  meeting, the encounter preview, the hero screen (beside the name and class),
  the encyclopedia's hero cards and, on wide windows, beside the level-up
  choice. Square portraits stay in lists, the map HUD, armies and medallions.
  Pictures load when a screen shows them.

### Compatibility

- Saves and preferences: unchanged from 1.1.0.
- Test selectors: new `reward`, `reward-continue`, `reward-toast`,
  `result-rewards`, `transfer-done`, `transfer-cancel`, `briefing-facts` (kept),
  `hire-candidate-*`, `tavern-leave`, `recruit-tier-*`, `recruit-back`,
  `hero-medallion`, `book-detail`, `book-close`, `cast-detail`, `tome-list`,
  `hero-bust`;
  removed `briefing-goals` and `briefing-full` (the briefing is the scroll).
- Build: the delivered art packs' JSON files (manifests, copy inventories)
  are copied into the game without the delivery machine's local disk paths,
  which they carry as provenance; no screen read those fields, and the files
  in `assets-runtime/` stay as delivered.

## 1.1.0 — 2026-10-10 · Interface redesign

A GUI and content release. Game rules, content values, AI, saves (format and
schema), the fixed world camera and the siege visual revision 2 are unchanged.

### New interface materials

- The owner-approved 1.1.0 art pack (`assets-runtime/ui-v1.1.0`, 36 layers and
  their manifest) is registered as its own typed `gui.*` namespace
  (`packages/ui/src/assets/guiArt.ts`, relative URLs such as
  `./ui-v1.1.0/frame-greek.png`). Nothing in it replaces content art, story
  art, sprites or the siege-v2 registrations; the pixels are used as delivered.
- One window anatomy: each pantheon's frame drawn as a transparent nine-slice
  over a separate quiet surface at the frame's measured inset — stone for
  commands, parchment for narrative, leather for equipment. The frame follows
  the player's pantheon in a match (the town's or battle side's where that
  differs), the pantheon being chosen during setup; outside a match the frame
  is a neutral dark blue and bronze one (see Pre-game screens).
- Painted primary buttons with code-drawn hover, focus, pressed, selected and
  unavailable states (a lock and a written reason, not colour alone; hit
  targets at least 44 px); the painted socket rim on army, item and choice
  slots; one themed tooltip (hover after a short delay, keyboard focus at
  once; the Tooltips setting turns it off).

### Screens

- **Map decisions** (treasure, map events, quests, creature camps): header
  illustrations (the chest full or empty, the Frozen Longship, the hermit, the
  mission's own painting for authored events, the crossroads for generated
  ones); a reward tile only selects — **Confirm** runs the command once and
  **Decide later** closes without claiming; quests read as one exchange
  (asked ↔ given, with what is still missing).
- **Adventure map**: one command sidebar (minimap, heroes, the selected hero
  with movement, mana and army, towns, commands, End Day); the map's view ends
  at the sidebar instead of running under it.
- **Hero**: the equipment figure on leather under the real sockets; all 30
  backpack places kept.
- **Recruitment**: one creature on its pantheon's stage (the battle idle
  strip, feet on the stage's ground point; still with reduced motion), the
  destination as explicit choices, and the reason when a purchase is
  impossible (no dwelling, no population, no funds, no army space).
- **Town**: buildings are the controls (hover and keyboard-focus outlines with
  a short tooltip); a **Build** control and a complete construction list
  (every location: level now and next, price, missing prerequisites, why it
  cannot be started), also opened from the town hall; the building pop-up is
  a framed parchment card with the next level's own picture; only the
  building just raised or upgraded lights up briefly.
- **Marketplace**: the town's merchant header; what is given and what is
  received apart with their icons, the rate, the quantity and the holdings
  after the trade; still resources ↔ Gold only. The Artifact Merchant and
  the Workshop use the same header; a double click never buys twice;
  affordability and capacity reasons are written out in every shop.
- **Battle**: a framed command bar, the turn order in a gold strip, each
  side's banner; stack labels show the count, with health on the acting and
  the hovered stack (Settings → Interface → Stack labels keeps "Count and
  health, always"); a hover card with the stack's health and effects; the
  decorative top bar no longer takes the battlefield's clicks.
- **Pantheon setup**: six banners (one radio group, arrow keys) with the live
  emblem and name, the selected pantheon's patron (from the game data), its
  parchment summary and signature and its seven creature families; every
  match option in one setup drawer.
- **Journal**: an open book — the mission and its objectives on the left page,
  the chosen objective (status, progress, hint, Show on map, Claim) on the
  right; one parchment page in a narrow window. Story, help and campaign pages
  likewise.
- **Encyclopedia**: parchment pages, six pantheon tabs (and Neutral in the
  bestiary) that open each pantheon's section; a creature page offers both of
  its forms as explicit controls.
- **Briefing and story**: the dialogue on parchment with the speaker's plate;
  the briefing shows three objective summaries (the mission's own first
  primary objectives) with the full objectives one click away.
- Every other window (pause, tips, toasts, results) takes the shared skin.

### Pre-game screens (handoff `docs/frontend-v1.1.0`)

- The 17 pre-game paintings (`assets-runtime/frontend-v1.1.0`) are registered
  under their own `frontend.*` IDs with relative URLs
  (`./frontend-v1.1.0/...`); the screens outside a match wear a neutral dark
  blue and bronze frame — a pantheon's frame appears only on that pantheon's
  panels (a campaign, a seat, a banner).
- The complete frontend kit (`assets-runtime/frontend-kit-v1.1.0`, 33 pieces
  under `frontendkit.*`, added after the first pre-game pack) supplies the
  title background and the title logo as separate layers, the six finished
  pantheon pennants (emblem painted on the cloth; used wherever a pantheon
  banner appears, the name in live text below), the settings, encyclopedia
  and editor icons, the red warning seal of destructive confirmations, the
  laurel medallion of the records and a blank title plate (drawn as a
  nine-slice behind each pre-game screen's title).
- **Title**: the kit's title background joins the twelve opening paintings in
  the random rotation (none removed) and the kit's logo replaces the earlier
  lettering; a small **Hall of Records** link under the menu
  opens the existing local records (an optional addition of the handoff,
  implemented); the footer shows only the live version and build kind (rules
  and content versions stay in Settings → Saves).
- **New Game**: four illustrated modes (Campaign, Skirmish, Random Map, Map
  Editor), each one button with copy from the catalog.
- **Campaign Chronicles**: the six campaigns in a compact list (arrow keys);
  the chosen one's cover, story, hero, a read-only outline of its missions
  and the Story / Normal / Hard difficulty on its pantheon's parchment page.
  Begin still starts the first mission's briefing.
- **Skirmish Atlas**: the authored maps' paintings in a gallery; the chosen
  map's large painting and facts. Authored maps still go to their seats, the
  Twin Harbors scenario to the pantheon choice.
- **Random Map**: three chapters — Land, Empires, Rules — over one draft
  (every choice survives switching); the nine map types as paintings with
  their names (labelled as illustrative landscapes); Create World in a footer
  that stays in view. No seed field. Restrictions and fallbacks unchanged.
- **Seats**: each seat flies its pantheon's banner; a person's seat shows the
  patron's portrait.
- **Encyclopedia**: the library backdrop; the pantheon row is now a filter
  (All, six pantheons, Neutral in the bestiary, Shared for spells and skills
  without a pantheon); a search field narrows every section at once (each
  section shows its count; no results says so, offers the sections that do
  match and Clear); the section, filter, search and scroll position return
  after a creature's page.
- **Settings**: the seven sections as a rail of tabs (arrow keys, Home/End);
  the page on parchment; one footer with Restore defaults, Revert, an
  unsaved-changes notice, Apply and Back. Leaving with unapplied changes —
  Back, the title bar's back or **Escape** (which used to leave without
  asking) — asks first, with **Keep editing** focused.
- **Saved Journeys** (save and load): manual saves, autosaves and the
  checkpoint in their own groups; the mission picture is captioned as an
  illustration (never a picture of the save); a never-used archive shows an
  empty state (reading and unavailable storage still say so); overwriting a
  save and loading over a game in progress are marked as destructive.
- **Map Library**: the maps kept on this computer (or in this browser) apart
  from the built-in skirmish maps (opened only as copies); an empty library
  offers Import. The map editor keeps every tool, Undo/Redo and the four
  panels in a thinner frame.
- **Hall of Records**: the same local tables (with a pantheon column) on the
  library backdrop; an empty table shows the empty-archive state.
- **Confirmations**: one small parchment dialog; the safe choice (Cancel, or
  the screen's own wording) always takes the first focus, so Enter never
  confirms a destructive action by accident.

### Accessibility

- Dialogs keep keyboard focus inside while open and return it to the control
  that opened them; Escape closes a closable dialog without leaving the screen
  behind it.
- Text contrast at least 4.5:1, interface and focus outlines at least 3:1 on
  both surfaces; the high-contrast, reduced-motion and audio preferences are
  kept and honoured by the new materials. No new sounds on hover or quantity
  changes.

### Compatibility

- Saves: no change to the save format; 1.0.0 saves load.
- Preferences: schema 4. The old default stack labels ("Count and health")
  change once to the new default "Count"; any other choice is kept.
- Test selectors: the existing `data-testid`s are kept. New ones:
  `chest-confirm`, `chest-later`, `event-confirm`, `event-later`,
  `quest-later`, `quest-reason`, `town-construction`, `construction*`,
  `popup-construction`, `market-*`, `recruit-dest-*`, `recruit-reason`,
  `pantheon-stage`, `pantheon-patron`, `codex-filter-*`, `codex-search`,
  `codex-search-clear`, `codex-no-results`, `codex-body`, `unit-form-*`,
  `journal-entry`, `briefing-goals`, `battle-inspect`, `menu-records`,
  `random-chapter-*`, `random-type-detail`, `settings-tab-*`,
  `settings-defaults`, `settings-revert`, `settings-status`,
  `settings-back`, `confirm-cancel`, `save-empty`, `save-incompatible`,
  `library-empty`, `library-empty-import`, `records-empty`. The random map
  controls other than the map type, size and count now sit in the Empires
  and Rules chapters (`random-chapter-empires`, `random-chapter-rules`).
