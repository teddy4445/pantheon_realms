import type { NatureAsset, NatureRole } from './nature';
const mild=['temperate','autumn','moor'];
const warm=['temperate','autumn','jungle','coast','moor'];
const cold=['high_pass','fjord','tundra'];
const shore=['temperate','autumn','coast','jungle','moor','desert','fjord','high_pass','storm_plateau'];
type Spec=readonly [string,NatureRole,readonly string[],Partial<NatureAsset>?];
const fresh:Partial<NatureAsset>={shoreOnly:true,waterKinds:['lake','river'],requiresWetGroundOrFreshwaterBank:true};
const sea:Partial<NatureAsset>={shoreOnly:true,waterKinds:['sea'],saltwaterBankAllowed:true};
const specs:readonly Spec[]=[
 ['forest.birch','canopy',[...mild,'fjord']], ['forest.willow','canopy',mild],
 ['forest.ginkgo','canopy',['temperate','autumn','coast']], ['forest.cypress','canopy',['temperate','coast','moor']],
 ['forest.olive','canopy',['temperate','coast','desert']], ['forest.redwood','canopy',['temperate','fjord','moor']],
 ['forest.snow-spruce','canopy',cold], ['forest.bamboo','canopy',['temperate','jungle','coast']],
 ['mountains.slate-ridge','mountain',[...mild,'high_pass','fjord','storm_plateau']],
 ['mountains.granite-dome','mountain',[...mild,...cold]], ['mountains.twin-spires','mountain',cold],
 ['mountains.karst-needles','mountain',['temperate','jungle','coast','high_pass']],
 ['mountains.red-mesa','mountain',['desert','coast']], ['mountains.crater-cone','mountain',['storm_plateau','desert','jungle']],
 ['mountains.limestone-arch','mountain',['temperate','moor','coast']], ['mountains.sea-cliff','mountain',['coast','fjord']],
 ['drylands.acacia','canopy',['desert','coast']], ['drylands.date-palms','canopy',['desert','coast','jungle']],
 ['drylands.cactus','shrub',['desert']], ['drylands.ochre-boulders','rock',['desert','coast','high_pass']],
 ['drylands.salt-stones','rock',['desert','coast']], ['drylands.dead-tree','deadwood',['desert','coast','storm_plateau']],
 ['drylands.thorn-bushes','shrub',['desert','storm_plateau']], ['drylands.desert-arch','rock',['desert','coast']],
 ['freshwater.cattails','wet_edge',warm,fresh], ['freshwater.willow-roots','wet_edge',mild,fresh],
 ['freshwater.river-stones','wet_edge',shore,fresh], ['freshwater.reed-log','wet_edge',warm,fresh],
 ['freshwater.lily-pads','water_life',['freshwater'],{waterKinds:['lake'],minWaterArea:8,minWaterClearance:1,excludedClimates:['tundra','fjord','high_pass']}],
 ['freshwater.alder-roots','wet_edge',[...mild,'fjord'],fresh], ['freshwater.blue-iris','wet_edge',mild,fresh],
 ['freshwater.reed-islet','islet',['freshwater'],{waterKinds:['lake','river'],minWaterArea:12,minWaterClearance:1,excludedClimates:['tundra']}],
 ['coast.driftwood','rocky_edge',shore,sea], ['coast.sea-boulders','rocky_edge',shore,sea],
 ['coast.sea-thrift','wet_edge',['coast','jungle'],sea], ['coast.shell-bank','rocky_edge',shore,sea],
 ['coast.old-jetty','rocky_edge',shore,sea], ['coast.mangrove','wet_edge',['coast','jungle'],sea],
 ['coast.dune-grass','wet_edge',['coast','jungle'],sea], ['coast.coral-rock','wet_edge',['coast','jungle'],sea],
 ['details.fern-stump','deadwood',warm], ['details.mushrooms','groundcover',[...mild,'jungle','fjord']],
 ['details.heather','shrub',[...mild,'coast','high_pass']], ['details.moss-cairn','rock',[...mild,'jungle','fjord']],
 ['details.golden-bracken','groundcover',['autumn','temperate','moor']], ['details.juniper','shrub',[...mild,...cold,'storm_plateau']],
 ['details.root-slab','rock',warm], ['details.stone-spring','wet_edge',warm,fresh],
];
export const SCENERY_EXPANSION:readonly NatureAsset[]=specs.flatMap(([id,role,climates,extra])=>climates.map(climate=>({
 id:`scenery2.${id}`,role,climate,variant:5,description:id.replaceAll('.',' ').replaceAll('-',' '),blocking:false,battleUse:'none',waterKinds:[],minWaterArea:0,minWaterClearance:0,...extra,
})));
