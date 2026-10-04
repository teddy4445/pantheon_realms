# Pantheon Realms - P2P Multiplayer v1 Development Specification

**Status:** Development handoff for Claude / Opus  
**Goal:** Add a first multiplayer architecture that supports both:

1. a **locally installed desktop game** that can host or join matches; and
2. the **same authoritative match host running independently on a server**.

The multiplayer implementation must reuse the existing Pantheon Realms TypeScript rules, commands, AI, saves, and content. Do not create a second implementation of the game rules.

---

# 1. Core decision

Pantheon Realms multiplayer v1 is **host-authoritative**.

A match has exactly one authoritative `MatchHost`.

Clients send validated game commands to the host. The host:

- owns the authoritative `MatchState`;
- validates commands;
- runs the shared TypeScript rules;
- advances turns;
- resolves battles;
- runs AI-controlled players when needed;
- persists snapshots;
- sends resulting events / visible state to connected players.

The host can run in two places:

```text
LOCAL HOST MODE
Desktop game
|-- embedded MatchHost
    |-- authoritative match

DEDICATED SERVER MODE
Server machine
|-- standalone MatchHost process
    |-- authoritative match
```

These must use the **same MatchHost code**.

Do not fork the rules or multiplayer implementation into separate local and server versions.

---

# 2. Important terminology

For this document:

- **LocalGameSession** = normal single-player/offline game running rules locally.
- **NetworkGameSession** = client-side connection to an authoritative MatchHost.
- **MatchHost** = authoritative multiplayer match process.
- **Embedded Host** = MatchHost running inside the desktop application.
- **Dedicated Host** = MatchHost running as a separate headless server process.
- **Client** = Electron or browser game connected to a MatchHost.

The code should not assume that server means a different rules implementation.

---

# 3. Architecture

Target structure:

```text
packages/
  rules/
  content/
  ai/
  protocol/
  multiplayer-core/

apps/
  desktop/
  web/
  match-server/
```

Recommended responsibilities:

```text
packages/rules
  authoritative game rules

packages/content
  validated game definitions

packages/ai
  AI players / planners

packages/protocol
  messages exchanged between client and host

packages/multiplayer-core
  MatchHost
  player connection abstraction
  visibility filtering
  command dispatch
  match snapshots
  reconnect support

apps/desktop
  Electron game
  may run an Embedded MatchHost
  may connect to remote MatchHost

apps/web
  browser client
  connects to remote MatchHost

apps/match-server
  thin headless executable around multiplayer-core
```

The `match-server` app should be small.

It should mainly configure:

- port;
- persistence location/database;
- logging;
- allowed origins;
- TLS / reverse-proxy assumptions;
- MatchHost lifecycle.

Do not move game logic into `apps/match-server`.

---

# 4. GameSession abstraction

The UI must not know whether a match is offline, locally hosted, or remotely hosted.

Create or formalize a common abstraction similar to:

```ts
interface GameSession {
  getView(): GameView;
  submit(command: GameCommand): Promise<CommandResult>;
  subscribe(listener: GameEventListener): Unsubscribe;
  getConnectionState(): ConnectionState;
}
```

Implementations:

```text
LocalGameSession
NetworkGameSession
```

Offline flow:

```text
React / Pixi
    |
    v
LocalGameSession
    |
    v
shared rules
```

Multiplayer flow:

```text
React / Pixi
    |
    v
NetworkGameSession
    |
    v
network protocol
    |
    v
MatchHost
    |
    v
shared rules
```

For a desktop player hosting locally:

```text
Desktop UI
    |
    v
NetworkGameSession
    |
    v
localhost
    |
    v
Embedded MatchHost
    |
    v
shared rules
```

This is intentional.

The host player's UI should use the same network-facing path as remote players where practical, so hosting does not create a special gameplay implementation.

---

# 5. P2P Multiplayer v1 modes

Support the following first.

## 5.1 Offline single-player

Existing behavior.

```text
LocalGameSession
```

No networking required.

## 5.2 Host Game - local desktop host

One player's installed desktop game starts an Embedded MatchHost.

Other players connect to that host.

For the first version, support:

- LAN connection;
- direct IP / hostname connection;
- configurable port;
- 2-4 players;
- optional AI seats.

Do not require a central matchmaking service for this mode.

## 5.3 Join Game

Desktop client connects to:

```text
host
port
```

Example UI:

```text
Host: 192.168.1.20
Port: 42718
```

or Internet hostname/IP where networking permits.

## 5.4 Dedicated Server

Run the same MatchHost code without the desktop UI.

Example:

```bash
pantheon-match-server --port 42718
```

or equivalent project command.

The dedicated-server build must:

- have no React dependency;
- have no PixiJS dependency;
- have no Electron dependency;
- run headlessly;
- load shared rules/content;
- accept client connections;
- persist games;
- log useful errors.

---

# 6. Network protocol

Create a versioned protocol package.

Example:

```ts
type ClientMessage =
  | HelloMessage
  | JoinMatchMessage
  | ResumeMatchMessage
  | GameCommandMessage
  | RequestSnapshotMessage
  | LeaveMatchMessage
  | PingMessage;

type ServerMessage =
  | WelcomeMessage
  | LobbyStateMessage
  | MatchStartedMessage
  | VisibleSnapshotMessage
  | GameEventsMessage
  | CommandRejectedMessage
  | PlayerConnectedMessage
  | PlayerDisconnectedMessage
  | MatchEndedMessage
  | PongMessage
  | ErrorMessage;
```

Every protocol message should include a protocol version.

Do not send arbitrary class instances over the wire.

Use validated plain data.

---

# 7. Command authority

Clients never directly modify authoritative state.

A client sends a `GameCommand`.

Examples:

```text
MoveHero
BuildStructure
RecruitUnits
UpgradeStack
TransferStack
SelectGod
EndTurn

BattleMove
BattleMelee
BattleShoot
BattleDefend
BattleWait
BattleCastSpell
BattleUseAbility
Retreat
Surrender
```

The MatchHost:

1. authenticates the connection/player;
2. verifies the match;
3. verifies the player's right to issue the command;
4. checks `expectedRevision`;
5. runs the normal command validator;
6. commits the command;
7. increments revision;
8. persists/checkpoints when appropriate;
9. produces player-visible updates;
10. broadcasts those updates.

A rejected command changes nothing.

---

# 8. Revision and desync protection

Every authoritative match has:

```text
revision: number
```

Each client command includes:

```text
expectedRevision
```

Example:

```text
client has revision 148
-> sends command expectedRevision=148
-> host validates and commits
-> host moves to revision 149
```

If the client is stale:

```text
expectedRevision != host revision
```

the host should reject the command and send the current visible state/snapshot needed for recovery.

Also maintain a deterministic state hash where practical:

```text
revision
stateHash
```

This is primarily for debugging/desync detection.

Do not treat client hashes as authority.

---

# 9. Visibility and hidden information

Never send the full `MatchState` to every player.

Create a server-side projection layer:

```text
MatchState
   |
   v
PlayerViewBuilder
   |
   v
PlayerVisibleState
```

The visible state must respect:

- fog of war;
- hidden enemy armies;
- hidden resources;
- hidden town/building information;
- hidden quests;
- private player information;
- any future stealth/information rules.

The same conceptual observation rules should be reusable for AI where sensible.

Do not rely on the client to hide information that the server already sent.

---

# 10. Lobby

Multiplayer v1 needs a simple lobby.

Host can configure:

- map/scenario;
- player count;
- human / AI seats;
- pantheon per player where allowed;
- difficulty for AI;
- turn timer or unlimited;
- battle timer or unlimited;
- victory conditions already supported by the rules;
- private match name/password if desired.

Lobby state example:

```text
Slot 1  Teddy     Greek       Ready
Slot 2  Player 2  Norse       Ready
Slot 3  AI        Egyptian    --
Slot 4  Empty
```

Required actions:

```text
Create
Join
Leave
Ready / Unready
Change allowed faction
Add/remove AI
Start match
```

Only the host/admin may start the match.

---

# 11. First networking scope

Keep v1 intentionally small.

Support:

- 2-4 total seats;
- human and AI players;
- turn-based adventure map;
- town management;
- recruitment;
- gods;
- battles;
- saves;
- reconnect;
- surrender;
- match completion.

Do not require in v1:

- public matchmaking;
- ranking;
- friends system;
- chat moderation;
- spectator infrastructure;
- host migration;
- cross-server sharding;
- Kubernetes;
- Redis;
- microservices.

---

# 12. Tactical battle behavior

For v1:

> **The strategic world pauses while a human multiplayer tactical battle is active.**

This avoids concurrent world mutations.

Flow:

```text
Player A attacks Player B
        |
        v
MatchHost creates BattleState
        |
        v
all relevant clients enter battle presentation
        |
        v
active player submits battle command
        |
        v
MatchHost resolves command
        |
        v
events sent to clients
        |
        v
battle completes
        |
        v
persistent results applied exactly once
        |
        v
world resumes
```

Other players may:

- watch the battle if implemented;
- otherwise see a "battle in progress" waiting state.

Do not implement simultaneous world turns during battles in v1.

---

# 13. Animation remains client-side

The MatchHost sends gameplay results, not animation timing.

Example:

```text
BattleAttackCommand
        |
        v
host resolves
        |
        v
DamageAppliedEvent
CreaturesKilledEvent
```

Each client then plays its local sprite animation.

Fast animation, reduced motion, or skipped animation must not alter the result.

---

# 14. Reconnection

Disconnects must not immediately destroy a match.

Each human player should have a stable player identity/token for the match.

When a client reconnects:

```text
connect
|
v
authenticate/resume
|
v
MatchHost identifies seat
|
v
send current visible snapshot
|
v
continue
```

For v1, the host remains authoritative and the match survives ordinary client disconnects.

If the Embedded Host itself closes, that hosted match stops until the same host loads the saved match and hosts again.

**Host migration is out of scope for v1.**

---

# 15. Multiplayer saves

The authoritative host owns multiplayer persistence.

Persist enough to restore:

- match ID;
- rules/content versions;
- revision;
- `MatchState`;
- gameplay RNG state;
- lobby/player-seat mapping;
- human player identities;
- AI configuration;
- pending battle;
- pending mandatory decision;
- timestamps;
- optional command log.

For an Embedded Host:

```text
desktop filesystem
```

For a Dedicated Host:

```text
server persistence adapter
```

Both should use the same logical save schema.

---

# 16. Persistence abstraction

Do not hard-code filesystem calls into MatchHost.

Use an interface such as:

```ts
interface MatchRepository {
  create(...): Promise<void>;
  saveSnapshot(...): Promise<void>;
  load(...): Promise<StoredMatch | null>;
  list(...): Promise<StoredMatchSummary[]>;
  delete(...): Promise<void>;
}
```

Implement at least:

```text
FileMatchRepository
```

for local/embedded hosting.

Prepare the design so a later:

```text
PostgresMatchRepository
```

can be added for central-server deployment without changing MatchHost.

This separation is important.

---

# 17. Dedicated-server packaging

Create a clearly separate server artifact.

Target outcome:

```text
dist/
  desktop/
    PantheonRealms.exe / app bundle

  server/
    pantheon-match-server
```

or equivalent platform packaging.

The desktop artifact includes:

```text
React
PixiJS
Electron
rules
content
AI
network client
optional Embedded MatchHost
```

The server artifact includes:

```text
Node/runtime
rules
content
AI
protocol
MatchHost
persistence
```

The server artifact must NOT include:

```text
React
PixiJS
desktop UI assets
Electron
player-facing audio
large presentation-only sprite assets unless required by content validation
```

The goal is a small headless deployable server.

---

# 18. Local installation versus server installation

Make these two workflows explicit.

## Desktop/local installation

Typical command/build:

```text
build:desktop
```

Produces the normal player game.

The desktop game can:

```text
Play Offline
Host Multiplayer Game
Join Multiplayer Game
```

## Dedicated server installation

Typical command/build:

```text
build:server
```

Produces only the headless match server.

The server should start using configuration/environment variables such as:

```text
PORT
DATA_DIR
LOG_LEVEL
MAX_MATCHES
ALLOWED_ORIGINS
```

Do not require graphics/display access.

Do not require Blender, PixiJS, Chromium, or Electron.

---

# 19. Server configuration

Provide documented server configuration.

Example:

```text
PORT=42718
DATA_DIR=./data
LOG_LEVEL=info
MAX_MATCHES=100
```

For v1, simple configuration is preferable.

Provide:

```text
.env.example
```

but never commit real secrets.

---

# 20. Transport

Use a network transport suitable for persistent match communication.

WebSocket is the preferred initial transport because:

- Electron supports it;
- browser supports it;
- dedicated server supports it;
- commands are low-frequency;
- Pantheon Realms is turn-based.

Keep the protocol abstraction clean enough that transport details are not mixed into rules code.

---

# 21. Security baseline

Even v1 should validate all untrusted client input.

The MatchHost must never trust:

- resource totals from clients;
- damage values from clients;
- creature counts from clients;
- movement results from clients;
- ownership claims from clients;
- player turn claims from clients.

Clients submit intent/commands only.

Also include:

- message size limits;
- schema validation;
- invalid-command rate limiting;
- connection timeout;
- malformed-message handling;
- server-side ownership checks;
- safe logging that does not expose secrets.

Do not build a complex anti-cheat system for v1.

---

# 22. Player identity

For private v1 matches, do not require a full account platform.

A practical first design:

```text
local player ID
display name
match-specific reconnect token
```

The dedicated-server mode may later be extended with real accounts/authentication.

Do not couple MatchHost to a particular identity provider.

---

# 23. AI players

AI seats run on the authoritative MatchHost.

Do not let an AI player's client make authoritative decisions.

Flow:

```text
MatchHost
   |
   v
AIPlayerController
   |
   v
proposed GameCommand
   |
   v
normal CommandProcessor
```

AI therefore behaves the same whether the host is:

- embedded in a player's desktop;
- installed on a dedicated server.

---

# 24. Server operation without graphics

Add a headless integration test proving that a multiplayer match can run with:

```text
no React
no PixiJS
no Electron window
```

The test should create a match, connect simulated clients, execute commands, and complete at least one battle/turn flow.

This is essential to ensure rules did not accidentally depend on presentation code.

---

# 25. Development mode

Create an easy local multiplayer development setup.

For example:

```text
npm run dev:server
npm run dev:web
```

Then two browser tabs or Electron instances can connect to the same local MatchHost.

Also support an in-process/in-memory transport for fast automated tests if useful.

---

# 26. Testing requirements

At minimum test:

### Connection
- two clients can connect;
- invalid protocol version rejected;
- duplicate seat use rejected;
- disconnect/reconnect works.

### Lobby
- host creates lobby;
- players join/leave;
- AI seats work;
- Ready state works;
- non-host cannot start game.

### Commands
- only active/legal player can act;
- stale revision rejected;
- invalid command does not mutate state;
- legal command produces same result as local game rules.

### Hidden information
- player does not receive hidden opponent state;
- fog works;
- private resource totals remain private.

### Battle
- battle commands are server-authoritative;
- both clients receive consistent outcome;
- animation speed has no rules effect;
- result applies exactly once.

### Persistence
- hosted game saves;
- process restarts;
- match loads;
- players reconnect;
- deterministic state continues correctly.

### AI
- server-hosted AI can take a turn;
- AI uses legal observation;
- AI commands go through normal validation.

### Packaging
- desktop build works;
- dedicated server build works without GUI dependencies.

---

# 27. Suggested implementation order

## Phase 1 - Session abstraction

Create/refactor:

```text
GameSession
LocalGameSession
NetworkGameSession
```

Move player-facing code away from direct MatchState mutation.

## Phase 2 - Protocol

Create:

```text
packages/protocol
```

with schemas/versioning.

## Phase 3 - MatchHost

Create a headless authoritative MatchHost using the existing rules.

## Phase 4 - Local network test

Run:

```text
one MatchHost
two clients
```

on the same machine.

Complete:

```text
join
start
move
build
recruit
end turn
battle
```

## Phase 5 - Embedded hosting

Allow desktop Electron app to start MatchHost and connect to it.

## Phase 6 - Dedicated-server app

Create the separate headless server entry point/package.

## Phase 7 - Persistence/reconnect

Add server-side saves and reconnect support.

## Phase 8 - LAN/direct-IP UX

Add:

```text
Host Game
Join Game
host/port
```

and optional LAN discovery if straightforward.

## Phase 9 - Hardening

Run multiplayer acceptance tests, malformed-client tests, disconnect tests, and headless deployment tests.

---

# 28. Deliverables

Claude should create/update:

```text
MULTIPLAYER_ARCHITECTURE.md
MULTIPLAYER_PROTOCOL.md
SERVER_DEPLOYMENT.md
DEVELOPMENT_STATUS.md
```

Also provide:

```text
apps/match-server/
packages/protocol/
packages/multiplayer-core/
```

or equivalent structures matching the existing repo.

Add scripts comparable to:

```text
dev:server
build:server
start:server
test:multiplayer
```

Use the repository's actual package manager/build system.

Do not introduce a second build ecosystem without reason.

---

# 29. Definition of done for Multiplayer v1

Multiplayer v1 is complete when:

1. offline single-player still works;
2. desktop player can host a match locally;
3. another client can join;
4. 2-4 seats are supported;
5. AI seats are supported;
6. all authoritative gameplay runs on MatchHost;
7. the host player's own UI goes through the multiplayer session path;
8. commands are validated server-side;
9. hidden information is filtered;
10. adventure-map turns work;
11. town/build/recruit actions work;
12. tactical battles work;
13. disconnect/reconnect works while host remains available;
14. multiplayer match can be saved and restored;
15. a standalone headless dedicated-server build runs the same MatchHost;
16. dedicated server contains no React/Pixi/Electron requirement;
17. local desktop and dedicated-server variants use the same rules/content/protocol;
18. multiplayer automated tests pass.

---

# 30. Explicit non-goals for v1

Do not block v1 on:

- public matchmaking;
- central accounts;
- rankings;
- achievements;
- voice/chat;
- friends lists;
- spectators;
- host migration;
- simultaneous strategic turns;
- multiple concurrent battles;
- cloud scaling;
- Redis;
- Kubernetes;
- microservices.

These can be added later without changing the core MatchHost/rules architecture.

---

# 31. Important future compatibility

Although this document is named **P2P Multiplayer v1**, design `MatchHost` so it is equally usable as:

```text
embedded desktop host
```

or:

```text
central/dedicated server host
```

This is a deliberate requirement.

Do not make P2P-specific networking assumptions inside the rules or MatchHost.

The long-term architecture should permit us to move from:

```text
Player-hosted match
```

to:

```text
Pantheon Realms central server
```

by changing deployment and connection/discovery infrastructure, not by rewriting multiplayer gameplay.

---

# 32. Final architectural rule

> **One game, one rules engine, one multiplayer host implementation, multiple deployment modes.**

The desktop build may run the host locally.

The dedicated-server build runs the same host headlessly.

Clients use the same `NetworkGameSession`.

The distinction between local multiplayer host and server-hosted multiplayer must be a deployment/configuration concern, not a second game implementation.
