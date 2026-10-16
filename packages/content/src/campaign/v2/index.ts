/**
 * Campaign content version 2 (campaign expansion handoff, 2026-10-15): the 37
 * chapters of the seven campaigns as region maps and chapter graphs. New runs
 * play these; runs started earlier keep their content-v1 missions (same campaign
 * IDs, missions `<campaign>_m0N`), which stay in the catalog unchanged.
 */
import type { CampaignChapterDefinition, CampaignDefinition, MissionDefinition } from '@pr/rules';
import type { V2Campaign } from './kit';
import { buildThreeBeaconsV2 } from './threeBeaconsV2';
import { buildSilentOracleV2 } from './silentOracleV2';
import { buildWinterOathV2 } from './winterOathV2';
import { buildTwelfthHourV2 } from './twelfthHourV2';
import { buildLanternRoadV2 } from './lanternRoadV2';
import { buildSilverBranchV2 } from './silverBranchV2';
import { buildNewFireV2 } from './newFireV2';

export interface V2Content {
  readonly missions: readonly MissionDefinition[];
  readonly chapters: Readonly<Record<string, { readonly chapters: readonly CampaignChapterDefinition[]; readonly finalChapterId: string; readonly epilogue?: CampaignDefinition['epilogueV2']; readonly summary?: string }>>;
}

/** What a campaign's v2 builder returns: its chapters' missions, the graph and the closing scene. */
export interface V2Built {
  missions: MissionDefinition[];
  chapters: CampaignChapterDefinition[];
  epilogue?: NonNullable<CampaignDefinition['epilogueV2']>;
}
type Builder = (camp: V2Campaign) => V2Built;

/**
 * Each campaign's summary for a content-v2 run (the campaign screen): the v1
 * summary counts the legacy missions; these name the chapters and their order.
 */
const SUMMARIES: Readonly<Record<string, string>> = {
  three_beacons:
    'A storm has extinguished the three signal beacons protecting the coast of Asterion. Lead Alexios through two chapters along the storm coast to relight them before its settlements abandon one another.',
  silent_oracle:
    'A year after the beacons were relit, the Oracle of Kalliste has fallen silent, and a hierophant who calls himself her Voice is turning the cities of the coast against one another. Lead Alexios through six chapters — from the pilgrims’ road to the sealed spring under the mountain, two pairs of them in the order you choose — to give the Oracle back her voice. Play The Three Beacons first: it teaches the game.',
  winter_oath:
    'The winter did not end. Kaldvik’s barrow has opened, white wolves cut the roads and the Grey Jarl wants back the sword the seeress Hervor took from his mound. Lead Hervor through six chapters — two of them in the order you choose — to bind the long winter, and decide what becomes of the oath.',
  twelfth_hour:
    'The sun has stopped below the horizon. Lead the lector priestess Seshet through six chapters — from the red dawns of Abedju down through the hours of the night, two of them in the order you choose — to free the barque of the sun from the Hollow Lector and the coiled dark.',
  lantern_road:
    'The lanterns that guide the dead home have gone dark. Lead the shrine diviner Akane through six chapters — from the unlit festival of Kagaribi to the last torii, two of them in the order you choose — to relight the spirits’ road and face the Lantern-Eater.',
  silver_branch:
    'The silver branch that opens the mounds has been broken, and the year has stuck in its dark half. Lead the druid Orla through six chapters — from the cold Beltane of Dún Caill to the door of the great mound, two of them in the order you choose — to turn the year and face the Withered King.',
  new_fire:
    'The fire that binds the years was put out before it could be renewed, and the sun is fading. Lead the day-keeper Itzel through five chapters — from the cold altar of Xochitla to the smoking gate, two of them in the order you choose — to bind the years again and face the Night-Knife.',
};

const BUILDERS: readonly (readonly [string, string, Builder])[] = [
  ['three_beacons', 'greek', buildThreeBeaconsV2],
  ['silent_oracle', 'greek', buildSilentOracleV2],
  ['winter_oath', 'norse', buildWinterOathV2],
  ['twelfth_hour', 'egyptian', buildTwelfthHourV2],
  ['lantern_road', 'japanese', buildLanternRoadV2],
  ['silver_branch', 'celtic', buildSilverBranchV2],
  ['new_fire', 'mesoamerican', buildNewFireV2],
];

export function buildCampaignsV2(v1: Readonly<Record<string, MissionDefinition>>, names: V2Campaign['names']): V2Content {
  const missions: MissionDefinition[] = [];
  const chapters: Record<string, { chapters: readonly CampaignChapterDefinition[]; finalChapterId: string; epilogue?: CampaignDefinition['epilogueV2']; summary?: string }> = {};
  for (const [id, pantheonId, build] of BUILDERS) {
    const camp: V2Campaign = {
      id,
      pantheonId,
      names,
      v1: (missionId) => {
        const m = v1[missionId];
        if (!m) throw new Error(`campaign v2 ${id}: unknown legacy mission ${missionId}`);
        return m;
      },
    };
    const built = build(camp);
    missions.push(...built.missions);
    // The final chapter: the one no other chapter requires.
    const required = new Set(built.chapters.flatMap((c) => c.requiresAll));
    const finals = built.chapters.filter((c) => !required.has(c.missionId));
    if (finals.length !== 1) throw new Error(`campaign v2 ${id}: expected one final chapter, found ${finals.length}`);
    chapters[id] = { chapters: built.chapters, finalChapterId: finals[0]!.missionId, ...(built.epilogue ? { epilogue: built.epilogue } : {}), ...(SUMMARIES[id] ? { summary: SUMMARIES[id] } : {}) };
  }
  return { missions, chapters };
}

/** A campaign with its v2 chapter graph attached (v1 `missionIds` unchanged for legacy runs). */
export function withChapters(camp: CampaignDefinition, v2: V2Content): CampaignDefinition {
  const c = v2.chapters[camp.id];
  return c ? { ...camp, chapters: c.chapters, finalChapterId: c.finalChapterId, ...(c.epilogue ? { epilogueV2: c.epilogue } : {}), ...(c.summary ? { summaryV2: c.summary } : {}) } : camp;
}
