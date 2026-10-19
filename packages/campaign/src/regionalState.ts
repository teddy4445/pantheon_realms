/** Frozen regional records are saved data. They never run dawn, AI or economy code. */
import { deepClone, hashValue, type ContentCatalog, type MatchState, type HexCoord } from '@pr/rules';

export interface RegionalJourney { readonly playerId: string; readonly heroId: string; readonly target: HexCoord; readonly targetSiteId?: string }
export interface RegionalSnapshot {
  readonly journeys?: readonly RegionalJourney[];
  readonly worldId: string;
  readonly regionId: string;
  readonly protagonistId: string;
  readonly sourceMissionId: string;
  readonly capturedDay: number;
  readonly stateHash: string;
  /** Complete region, including defeated guards, consumed events, reserves and embark state. */
  readonly state: MatchState;
}

export function captureRegion(worldId: string, regionId: string, protagonistId: string, match: MatchState, journeys?: readonly RegionalJourney[]): RegionalSnapshot {
  if (match.battle || match.pendingDecisions.length) throw new Error('Finish the battle and pending decisions before freezing a region');
  if (!Object.values(match.heroes).some((h) => h.definitionId === protagonistId && h.status === 'active')) throw new Error(`Missing active regional protagonist ${protagonistId}`);
  const state = deepClone(match);
  return { ...(journeys?.length ? { journeys: deepClone(journeys) } : {}), worldId, regionId, protagonistId, sourceMissionId: match.mission.missionId, capturedDay: match.day, stateHash: hashValue(state), state };
}

/** Select the latest snapshot for each requested region, rejecting mixed worlds and missing regions. */
export function regionalSnapshots(worldId: string, records: readonly { readonly region?: RegionalSnapshot }[], regionIds?: readonly string[]): RegionalSnapshot[] {
  const byRegion = new Map<string, RegionalSnapshot>();
  for (const record of records) {
    const region = record.region;
    if (!region) continue;
    if (region.worldId !== worldId) throw new Error('Regional chronicle belongs to another world');
    byRegion.set(region.regionId, region);
  }
  const ids = regionIds ?? [...byRegion.keys()];
  return ids.map((id) => {
    const region = byRegion.get(id);
    if (!region) throw new Error(`Regional chronicle is missing ${id}`);
    if (hashValue(region.state) !== region.stateHash) throw new Error(`Regional snapshot ${id} was altered`);
    return deepClone(region);
  });
}

/** Rebase remaining cooldown durations, never simulate dawn in an inactive region. */
function rebaseDates(value: unknown, delta: number, weekDelta: number): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'number' && (key === 'day' || /Day$/.test(key) || key === 'lastMovedTurn' || key === 'lastActionTurn')) (value as Record<string, unknown>)[key] = raw + delta;
    else if (typeof raw === 'number' && (key === 'week' || /Week$/.test(key))) (value as Record<string, unknown>)[key] = raw + weekDelta;
    else if ((key === 'usedDays' || key === 'townVisitWeeks') && raw && typeof raw === 'object') { for (const [id, v] of Object.entries(raw)) if (typeof v === 'number') (raw as Record<string, number>)[id] = v + (key === 'usedDays' ? delta : weekDelta); }
    else rebaseDates(raw, delta, weekDelta);
  }
}
/** Merge complete records only into the matching native seats of a declared coalition finale. */
export function restoreRegionalState(catalog: ContentCatalog, state: MatchState, snapshots: readonly RegionalSnapshot[]): void {
 const mission = catalog.missions[state.mission.missionId];
 if (!mission?.restoreRegions || !mission.coalitionPlayerIds) throw new Error('This mission does not accept regional records');
 const regions = regionalSnapshots(catalog.campaigns[mission.campaignId!]!.regionalWorldId!, snapshots.map((region)=>({region})), mission.restoreRegions);
 const terrain = [...state.world.map.terrain], roads = new Set(state.world.map.roads);
 for(const region of regions) {
  const source=deepClone(region.state), originalPlayer=catalog.missions[region.sourceMissionId]!.player.playerId;
  if(!mission.coalitionPlayerIds.includes(originalPlayer)) throw new Error('Unknown regional owner');
  const delta=state.day-source.day, weekDelta=Math.floor((state.day-1)/catalog.rulesProfile.daysPerWeek)-Math.floor((source.day-1)/catalog.rulesProfile.daysPerWeek);
  rebaseDates(source.heroes,delta,weekDelta); rebaseDates(source.towns,delta,weekDelta); rebaseDates(source.players,delta,weekDelta); rebaseDates(source.world.sites,delta,weekDelta); rebaseDates(source.world.ships,delta,weekDelta); rebaseDates(source.caravans,delta,weekDelta); rebaseDates(source.fog,delta,weekDelta); rebaseDates(source.world.signals,delta,weekDelta); rebaseDates(source.seaWatch,delta,weekDelta); rebaseDates(source.intel,delta,weekDelta);
  const prefix=`region:${region.regionId}:`;
  const heroIds=new Map(Object.values(source.heroes).filter((h)=>h.ownerId===originalPlayer).map((h)=>[h.id, state.heroes[h.id]?.definitionId===h.definitionId?h.id:`${prefix}${h.id}`]));
  for(const [id,h] of Object.entries(state.heroes)) if(h.ownerId===originalPlayer) delete state.heroes[id];
  const namespaceArmy=(army: {slots: ({stackId:string}|null)[]})=>{for(const slot of army.slots)if(slot)slot.stackId=prefix+slot.stackId;};
  for(const [old,id] of heroIds) {const h=source.heroes[old]!;h.id=id;namespaceArmy(h.army);for(const item of [...Object.values(h.equipment),...h.backpack])if(item)item.instanceId=prefix+item.instanceId;state.heroes[id]=h;}
  for(const [id,town] of Object.entries(source.towns)) if(state.towns[id] && mission.sites.some((s)=>s.kind.type==='town'&&s.kind.townId===id)){namespaceArmy(town.garrison);state.towns[id]=town;}
  const p=source.players[originalPlayer]!;p.controller='human';p.role=originalPlayer===mission.player.playerId?'player':'rival';p.eliminated=false;state.players[originalPlayer]=p;
  if(p.libraryEconomy?.parcel){const parcel=p.libraryEconomy.parcel;parcel.artifact.instanceId=prefix+parcel.artifact.instanceId;parcel.senderId=heroIds.get(parcel.senderId)??parcel.senderId;parcel.recipientId=heroIds.get(parcel.recipientId)??parcel.recipientId;}
  for(const [id,site] of Object.entries(source.world.sites)) if(state.world.sites[id]) state.world.sites[id]=site;
  for(const [id,ship] of Object.entries(state.world.ships??{})) if(ship.ownerId===originalPlayer) delete state.world.ships![id];
  for(const ship of Object.values(source.world.ships??{})) { const id=`${prefix}${ship.shipId}`;ship.shipId=id;if(ship.heroId)ship.heroId=heroIds.get(ship.heroId)??ship.heroId;(state.world.ships??={})[id]=ship; }
  for(const caravan of Object.values(source.caravans??{})) if(caravan.ownerId===originalPlayer) { caravan.id=prefix+caravan.id; for(const stack of caravan.cargo)stack.stackId=prefix+stack.stackId; (state.caravans??={})[caravan.id]=caravan; }
  if(source.seaWatch?.[originalPlayer]) (state.seaWatch??={})[originalPlayer]=source.seaWatch[originalPlayer]!;
  if(source.intel?.[originalPlayer]) (state.intel??={})[originalPlayer]=source.intel[originalPlayer]!;
  for(const signal of source.world.signals??[]) if(signal.ownerId===originalPlayer) (state.world.signals??=[]).push({...signal,id:prefix+signal.id});
  // Already consumed site rewards retain their original idempotency keys; dawn keys are date-specific and start afresh.
  for(const key of source.appliedKeys) if(key.startsWith('reward:')&&!state.appliedKeys.includes(key))state.appliedKeys.push(key);
  for(const [id,value] of Object.entries(source.mission.flags)) if(id.startsWith('cf_'))state.mission.flags[id]=value;
  for(const road of source.world.map.roads)roads.add(road);
  [...source.world.map.terrain].forEach((code,index)=>{if(code!=='v')terrain[index]=code;});
  state.fog[originalPlayer]=source.fog[originalPlayer]!;
  // No initial troops or fresh stock on top of the restored snapshot. Each declared choice pays once here.
  const hero=Object.values(state.heroes).find((h)=>h.ownerId===originalPlayer&&h.definitionId===region.protagonistId)!;
  const reserve=hero.army.slots.find((s)=>s);if(reserve&&source.mission.flags[`cf_${region.regionId}_choice_0`])reserve.count+=8;
  if(source.mission.flags[`cf_${region.regionId}_choice_1`])p.wallet={...p.wallet,wood:p.wallet.wood+6,stone:p.wallet.stone+6};
 }
 state.world.map={...state.world.map,terrain:terrain.join(''),roads:[...roads].sort(),logicalHash:hashValue({terrain:terrain.join(''),roads:[...roads].sort(),desertCells:state.world.map.desertCells??[]})};
}
