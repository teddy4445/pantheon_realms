# Candidate Combat Rules - One Authoritative Resolution

**Status:** P. These rules borrow the classic structure documented in [the combat reference](../reference/03_heroes3_combat_and_army_rules.md), but explicitly define our own geometry, randomness, rounding, and edge cases. They are not a claim of exact Heroes III compatibility.

## 1. Battlefield and entry

Use an odd-row-offset hex board with **15 playable columns by 11 rows** in the proposed open-field profile. This is our playable geometry, not a statement about the original game's internal border columns. Obstacles come from the scenario seed. Each side deploys at most seven creature stacks. Heroes stay off-grid.

A one-hex creature occupies its anchor. A two-hex creature occupies the anchor plus the horizontal neighbor behind its facing. Facing can be reversed only as part of a validated placement/movement action; do not permit free footprint pivots through obstacles. All occupied cells must be legal. For melee adjacency or range, use the minimum hex distance between occupied cells. A flying unit may pass over obstacles and units but must land in a legal unoccupied footprint.

Deployment uses the side's first two columns, expanded by Tactics if applicable. Confirm deployment before round 1. Unknown enemy modifiers stay hidden; deployment does not disclose enemy inventory. The map's world day and economy remain frozen while battle resolves.

## 2. Round order and actions

At round start: expire effects scheduled for this boundary, recompute effective Speed, snapshot normal order from fastest to slowest, reset each stack's retaliation allowance and each commander's spell allowance. Ties: alternate side priority by round (attacker first on odd rounds, defender first on even rounds), then stable stack ID. This tie rule is ours and must be used by the preview too.

A normal activation can:

| Action | Exact effect |
| --- | --- |
| Move | Traverse a legal route costing no more than current Speed; finish without attack |
| Melee | Move along the shortest legal route to a chosen adjacent landing cell and strike once, or strike without moving |
| Shoot | Attack a legal target without preceding movement; consume one ammunition charge |
| Ability | Apply that creature's declared active ability; normally consumes the activation |
| Defend | No movement/attack; gain the defined Defense bonus until the start of the next scheduled activation |
| Wait | Defer the activation once into the waiting phase; no movement, attack, or charge reset |

After the normal phase, waiting stacks act from slowest to fastest using the same round Speed snapshot and stable tie rule. They cannot wait again. Destroyed stacks are removed without receiving turns. A Speed buff during a round changes current movement allowance but not the already snapshotted ordering until the next round. This is an explicit simplification, not an undocumented inheritance.

Do not display a generic **End Turn** when it could mean end world day. Use **Defend**, **Wait**, and contextual **Finish action**. A commander may cast at the start of a friendly stack's activation before that stack commits its action, at most once per round. Casting does not consume the stack's action. It does consume mana or the declared divine cost.

## 3. Effective stats and damage

Effective Attack = creature base Attack + commander Attack + applicable creature/target bonuses. Effective Defense = creature base Defense + commander Defense + applicable buffs. Off-grid heroes do not receive or occupy damage targets.

If defending, use `ceil(1.20 * DefenseBeforeDefend)`. Round once at that stage. This means Defense 9 becomes 11; it does not mean all incoming damage is multiplied by 0.5. Base-stat records never change when a buff applies.

For the proposed random model, roll one integer B uniformly between `aliveCount * damageMin` and `aliveCount * damageMax`, inclusive. This is an intentionally declared stack-range distribution, not a claim to match the original Heroes III RNG algorithm. Use an isolated, saved gameplay RNG stream.

```text
delta = effectiveAttack - effectiveDefense
attackBonus = min(0.05 * max(delta, 0), 3.00)
defenseReduction = min(0.025 * max(-delta, 0), 0.70)

raw = B
    * (1 + attackBonus + attackSkillBonus + luckBonus + chargeBonus)
    * (1 - defenseReduction)
    * armorerFactor
    * rangedDistanceFactor
    * wallFactor
    * meleePenaltyFactor
    * otherExplicitMitigation

damage = max(1, floor(raw))
```

`attackSkillBonus` is Offense for melee or Archery for shots, never both. `luckBonus` is 1.0 on a successful positive-luck roll, otherwise 0. `chargeBonus` is only the eligible Cavalry charge bonus. No intermediate truncation except explicitly specified stat calculations; round final damage down once. An immune target receives zero rather than the minimum-one floor. Non-damage actions do not invoke the formula.

Armorer contributes 0.95 / 0.90 / 0.85 at ranks 1/2/3. Mitigation factors multiply. Multiple instances of the same named Ward do not stack; retain the stronger effect and longer remaining duration. Do not invent extra multipliers from descriptive lore.

Predictions evaluate this same pipeline at the known base-damage endpoints. Uncertain luck is listed separately rather than hiding it inside a misleading guaranteed range. Do not consume RNG when predicting or hovering. A hidden opponent modifier makes the preview approximate and labeled accordingly.

## 4. Shots, adjacency, and range

Ranged units have an ammunition count per stack per battle. A shot consumes one; retaliation and melee do not. A shooter adjacent to a living hostile stack cannot shoot unless its definition explicitly overrides engagement. It may melee instead. Shooters without a `noMeleePenalty` ability deal half damage in melee, including retaliation.

If minimum occupied-cell distance exceeds 10 hexes, apply a 0.5 ranged-distance factor. A shot crossing an intact siege wall applies a separate 0.5 wall factor. Both can apply, yielding 0.25. Our open-field prototype treats ordinary low obstacles as movement blockers, not additional projectile-cover rules. A future line-of-sight/cover system needs its own specification.

A shot is stationary. A special mobile-shot ability must explicitly replace that action rule; no unit in the initial Greek catalog has it. Each of our shots has one primary target and cannot hit allies unless a later area-effect definition explicitly says so.

## 5. HP, casualties, retaliation, healing

Store aggregate stack HP. If each creature has HP H, alive count is `ceil(totalHP / H)`; the leading creature's remaining HP is `totalHP - (aliveCount - 1) * H`. A zero-HP stack is removed. The attacker's live count at execution time determines damage, not its starting battle count.

After eligible melee damage, a surviving defender immediately retaliates if it has an unused retaliation. Normal allowance is one per round; Griffin has two; Windcrest Griffin has no count limit. It still cannot retaliate when destroyed or explicitly disabled. Retaliation uses the remaining live count and the same damage pipeline. Retaliation cannot trigger a retaliation chain and does not use a scheduled activation.

Healing repairs only the current living front creature unless explicitly marked resurrection. It cannot increase live count. At battle end, surviving creatures heal their partial front HP to full; dead creatures remain dead. A resurrection implementation must cap permanent restoration by original eligible casualties, separate temporary/summoned troops, and cannot create kill/reward loops. Resurrection is deferred from this initial profile.

## 6. Morale and Luck

Effective morale and luck are clamped to -3..3 for display. All initial Greek units are morale-eligible. Same-faction armies receive +1 morale before Leadership and other effects. Future mixed-faction penalties are deferred; do not infer hostility from mythological identities.

At a stack's first actual action opportunity of the round, negative morale may skip it with probability `abs(morale)/12`. Waiting is not a roll or a loophole to obtain another roll. Positive morale is checked after that stack finishes its ordinary action, with probability `morale/24`; on success grant one immediate additional activation. That extra activation cannot generate another morale activation and cannot wait. It does not reset retaliation, ammunition, spell allowance, or family ability charges. This is our explicit scheduling contract.

For each eligible damaging strike, positive Luck triggers with probability `luck/24` and adds +1.0 in the bonus bracket above. Negative Luck has no damage effect in this classic-inspired candidate; display it without suggesting a functioning penalty. Zero values do not consume unnecessary random draws. Separate combat and cosmetic randomness.

## 7. Spells and active abilities

Mana belongs to the hero; Favor belongs to the player. A hero needs a spellbook, a learned spell, sufficient mana, a legal target, and the round's unused cast allowance. Costs and effects are in [the hero and magic rules](05_heroes_logistics_and_magic.md). A failed/canceled cast spends nothing.

Creature abilities use their own action and ability budget. Temple Seer's Ward charge is shared by the whole army's `temple_adept` family, once per battle, so splitting six Seers into six stacks does not produce six free casts. A stack in a preview does not consume the actual army's charge.

## 8. Sieges - specified later milestone

The larger profile requires a dedicated siege, not a flat defense bonus disguised as one. Proposed minimum:

- Fort: perimeter sections and gate, each 2 structure HP. Citadel adds a central keep and moat. Castle raises wall-section HP to 3 and adds two side towers; gate/keep/towers each have 2 structure HP.
- Ordinary creature-HP damage is never applied directly to structure HP. A basic attacker Catapult has one automatic shot at the beginning of each round, chooses an intact legal structure by stable ID, and removes 1 structure HP. No creature slot is consumed. Manual Ballistics is deferred.
- A Cyclops may spend its activation and one shot to remove 1 structure HP from a targetable structure; no simultaneous troop attack. This uses the same alternative action for both forms.
- An intact keep deals 20 direct damage and each intact side tower 10 to one legal attacker at the beginning of each round, after the Catapult shot. Choose the closest target to the structure, then stable stack ID. This is a temporary deterministic siege model, not H3 tower damage.
- Entering a moat cell ends ground movement and deals 10 direct stack damage once per entry. Flying over it does not trigger it; landing does. A unit cannot move further to attack after being stopped by the moat.
- The gate opens for a defending ground stack using a validated move. A closed gate blocks attacking ground movement; a destroyed section is a permanent breach.

The town garrison and visitor are not automatically a fourteen-stack force. Before siege, the defender selects at most seven stacks, merging identical forms where desired. Unselected stacks are reserve and do not fight; they survive a defensive victory and are lost with the captured town on defeat. This consequential rule must be shown before deployment. Retreat/surrender is unavailable to the town defender in this candidate.

Because these siege simplifications materially affect balance, the first revised slice may keep sieges disabled. A visible disabled control must say so. Do not claim full conquest is tested while the required sieges are absent.

## 9. Retreat, surrender, defeat, and resolution

In open-field combat, retreat is available on a friendly activation before committing its action. It abandons the army, preserves the hero's identity/XP/equipment, and moves the hero to a return roster. Rehire for 2,500 Gold at an eligible free Tavern visitor position; receive one Hoplite so the hero can travel, not another initial starting army. Return does not refill that day's movement; the hero starts with zero remaining points.

Surrender is available only against an enemy hero, not neutral creatures, and costs `ceil(0.5 * sum(aliveCount * formGoldPrice))`, without discounts in this slice. Crystal cost is not included. Pay the opponent; preserve surviving troops and hero/equipment in the return roster; rehiring costs 2,500 Gold and does not grant extra troops. Insufficient Gold disables surrender. These are explicit proposed recovery rules, not an exact original Tavern-pool reproduction.

On outright open-field defeat, remove the defeated army and hero from the match; transfer non-quest artifacts to the winning hero subject to inventory capacity, with overflow in a one-time battle-site cache. Campaign-specific hero protection must be scenario-defined. No Egyptian afterlife exception exists until it is separately designed.

The winner receives XP equal to the sum of base HP of opposing creatures actually killed by hostile damage during the encounter; no XP for friendly losses, summons, repeated healing, reserves lost after capture, abandoned living troops after retreat, or troops preserved by surrender. Do not grant universal Gold/Favor automatically. Scenario rewards, loot, ownership changes, XP, and casualties are applied exactly once in a resolution transaction, before the result screen opens.

Mandatory level choices follow results. Preserve pending choices in the save model; the initial UI only permits explicit saving once they are resolved. Auto-combat uses the same legal actions and resolver, not a probability-based victory shortcut. Reward-screen reopening and animation replay are read-only.
