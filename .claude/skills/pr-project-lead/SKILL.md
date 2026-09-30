---
name: pr-project-lead
description: "Plan, review, or coordinate development of Pantheon Realms from its current design documentation. Use when starting a feature, converting campaign or screen requirements into implementation tasks, reviewing a proposed stack change, or deciding which specialist workflow to use. Preserve the offline desktop product, shared TypeScript core, candidate-rule status, and one-upgrade-per-creature requirement; do not substitute a generic website or a different engine."
---

# Pantheon Project Lead

Read [project-contract.md](references/project-contract.md) and the current root instructions first.

## Work from the source of truth

1. Identify the requested outcome, the relevant current documents, and whether implementation is authorized. Do not interpret a request for a plan as permission to rewrite the demo.
2. Inspect the actual repository and scripts before proposing commands or folders. The v0.3 package is documentation, not evidence of working game code.
3. Separate adopted constraints from candidate numbers. Record a proposed rule change rather than silently adopting an easier mechanic.
4. Plan one connected vertical slice with observable entry, legal action, persistent consequence and return path. Avoid building six factions before the first campaign mission works.
5. Give each task an acceptance check and the specialist skill below. Coordinate through shared data contracts rather than parallel copies of formulas.

## Route specialist work

| Task | Skill |
| --- | --- |
| Economy, combat, upgrades, saves | `pr-rules-engine` |
| Mission content, roads, gates and seed validation | `pr-campaign-mapgen` |
| Local strategic/tactical planning | `pr-local-ai` |
| Babylon scenes, loaders, performance | `pr-babylon-scene` |
| Menus, settings, bestiary and accessible UI | `pr-react-game-ui` |
| Creature base/upgrade modeling and animation | `pr-creature-pipeline` |
| Sound, music transitions and presentation effects | `pr-audio-vfx` |
| Electron, native saves and offline distribution | `pr-electron-offline` |
| Reproducible tests and release evidence | `pr-qa-release` |

## Tool policy

Use the bundled `pr-audit` MCP for narrow read-only checks. Use Context7 only for non-confidential API questions; verify package versions. Use Playwright for browser interaction, not proof of native behavior. Enable Babylon authoring or Blender only for a task that needs it. Do not request all MCPs in every session.

## Deliverable

Produce: scope and source references; a small ordered task plan; proposed decisions needing review; affected contracts; concrete acceptance evidence. During implementation, add files changed, test commands/results and honest gaps. Leave a handoff that another developer can resume without inferring hidden decisions.
