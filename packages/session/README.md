# @pr/session — game session and saves

`GameSession` hosts the single authoritative `MatchState` for the running game:
human dispatch, AI steps, auto-combat, checkpoints (`pre_encounter`, `dawn`,
`mission_start`) and campaign transitions.

`save.ts` defines the versioned `SaveEnvelope` (schema `pantheon-realms-save` v1),
metadata, checksum and strict validation of untrusted save text.
