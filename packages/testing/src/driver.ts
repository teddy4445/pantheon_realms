/**
 * Headless GameDriver for deterministic tests and scripted playthroughs.
 * Wraps the real CommandProcessor; never bypasses validation.
 */
import { loadCatalog } from '@pr/content';
import { createMissionMatch, type HeroCarryover } from '@pr/campaign';
import { runAITurn, stepBattleAI, battleActor } from '@pr/ai';
import {
  axialDistance,
  hexEquals,
  parseHexKey,
  quoteMovement,
  reachableTiles,
  processCommand,
  type HexCoord,
  type CommandPayload,
  type ContentCatalog,
  type GameCommand,
  type GameEvent,
  type MatchState,
  type PlayerId,
  type Rejection,
} from '@pr/rules';

export class GameDriver {
  readonly catalog: ContentCatalog;
  state: MatchState;
  readonly events: GameEvent[] = [];
  private seq = 0;

  constructor(state: MatchState, catalog: ContentCatalog = loadCatalog()) {
    this.catalog = catalog;
    this.state = state;
  }

  static mission(missionId: string, opts: { carryover?: HeroCarryover | null; startingGodId?: string; matchId?: string } = {}): GameDriver {
    const catalog = loadCatalog();
    const { match } = createMissionMatch(catalog, missionId, {
      matchId: opts.matchId ?? `test:${missionId}`,
      carryover: opts.carryover ?? null,
      startingGodId: opts.startingGodId ?? 'zeus',
    });
    return new GameDriver(match, catalog);
  }

  command(payload: CommandPayload, actor: PlayerId = this.state.activePlayerId): GameCommand {
    this.seq += 1;
    return { ...payload, commandId: `t${this.seq}`, expectedRevision: this.state.revision, actorPlayerId: actor } as GameCommand;
  }

  /** Submit and require success. */
  do(payload: CommandPayload, actor?: PlayerId): readonly GameEvent[] {
    const cmd = this.command(payload, actor);
    const res = processCommand({ catalog: this.catalog }, this.state, cmd);
    if (!res.ok) throw new Error(`${payload.kind} rejected: [${res.rejection.code}] ${res.rejection.message}`);
    this.state = res.state;
    this.events.push(...res.events);
    return res.events;
  }

  /** Submit and require rejection; state must be unchanged. */
  reject(payload: CommandPayload, actor?: PlayerId): Rejection {
    const before = this.state;
    const cmd = this.command(payload, actor);
    const res = processCommand({ catalog: this.catalog }, this.state, cmd);
    if (res.ok) throw new Error(`${payload.kind} unexpectedly accepted`);
    if (this.state !== before) throw new Error('state reference changed on rejection');
    return res.rejection;
  }

  /** Resolve the current battle with the tactical AI on BOTH sides (auto-combat). */
  autoBattle(maxSteps = 2000): void {
    for (let i = 0; i < maxSteps && this.state.battle; i++) {
      if (!battleActor(this.state)) break;
      const r = stepBattleAI(this.catalog, this.state);
      this.state = r.state;
      this.events.push(...r.events);
    }
    if (this.state.battle) throw new Error('battle did not finish');
  }

  /** One tactical AI action for whichever side is active. */
  autoBattleStep(): void {
    const r = stepBattleAI(this.catalog, this.state);
    this.state = r.state;
    this.events.push(...r.events);
  }

  /** End the human turn and run AI players until it is the human's turn again. */
  endDay(): void {
    const human = this.state.playerOrder.find((p) => this.state.players[p]?.controller === 'human')!;
    this.do({ kind: 'EndTurn' });
    for (let guard = 0; guard < 20 && this.state.activePlayerId !== human && this.state.outcome.status === 'running'; guard++) {
      this.state = runAITurn(this.catalog, this.state, { onEvents: (e) => this.events.push(...e) });
      if (this.state.battle) this.autoBattle();
    }
  }

  /**
   * Scripted travel: march toward `dest` across days, exploring as needed, fighting
   * (auto-combat) any confirmed encounter at the destination.
   */
  marchTo(dest: HexCoord, heroId = 'alexios', maxDays = 12): void {
    for (let day = 0; day < maxDays; day++) {
      for (let step = 0; step < 30; step++) {
        const hero = this.state.heroes[heroId];
        if (!hero || hero.status !== 'active' || this.state.outcome.status !== 'running') return;
        if (hexEquals(hero.position, dest)) return;
        const q = quoteMovement(this.catalog, this.state, heroId, dest);
        if (q.reachable) {
          if (q.stopIndex < 0) break;
          this.do({ kind: 'MoveHero', heroId, destination: dest, confirmEncounter: true });
          if (this.state.battle) {
            this.autoBattle();
            this.resolveLevelUps();
          }
          continue;
        }
        // Explore toward the destination: the reachable tile nearest to it that does not
        // end in an encounter (a wandering hero on the way is walked around, not fought).
        const here = axialDistance(hero.position, dest);
        const options = [...reachableTiles(this.catalog, this.state, heroId)]
          .map(([k, cost]) => ({ c: parseHexKey(k), sc: axialDistance(parseHexKey(k), dest) + cost / 100000 }))
          .filter((o) => o.sc < here)
          .sort((a, b) => a.sc - b.sc);
        let best: HexCoord | null = null;
        for (const o of options.slice(0, 12)) {
          const mq = quoteMovement(this.catalog, this.state, heroId, o.c);
          if (mq.reachable && !mq.endsInEncounter && mq.stopIndex === mq.path.length - 1) {
            best = o.c;
            break;
          }
        }
        if (!best) break;
        this.do({ kind: 'MoveHero', heroId, destination: best });
      }
      this.endDay();
      this.resolveLevelUps();
    }
    throw new Error(`marchTo(${dest.q},${dest.r}) did not arrive`);
  }

  resolveLevelUps(): void {
    for (let i = 0; i < 20 && this.state.pendingDecisions.length > 0; i++) {
      const d = this.state.pendingDecisions[0]!;
      this.do({ kind: 'ChooseLevelUp', decisionId: d.decisionId, offerIndex: d.offers.length > 0 ? 0 : null });
    }
  }

  get player() {
    return this.state.players[this.state.playerOrder[0]!]!;
  }

  hero(id = 'alexios') {
    return this.state.heroes[id]!;
  }

  town(id: string) {
    return this.state.towns[id]!;
  }
}
