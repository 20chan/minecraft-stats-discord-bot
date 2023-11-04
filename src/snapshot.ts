import { readFile, readdir, writeFile } from 'fs/promises';
import { getUserList } from './mc';
import { UserResult, postProcess } from './score';

type Snapshot = {
  timestamp: number;
  results: UserResult[];
}

export async function saveSnapshot(results: UserResult[]) {
  const data: Snapshot = {
    timestamp: Date.now(),
    results,
  };
  writeFile(`./data/${data.timestamp}.json`, JSON.stringify(data));
}

export async function getLatestSnapshot() {
  const files = await readdir('./data');
  const latest = files.sort().pop();
  const data = await readFile(`./data/${latest}`, 'utf-8');
  return JSON.parse(data) as Snapshot;
}

export function diffSnapshots(a: UserResult[], b: UserResult[]) {
  const names = new Set([...a.map(x => x.name), ...b.map(x => x.name)]);

  const results = [];
  for (const name of Array.from(names.values())) {
    const aUser = a.find(x => x.name === name);
    const bUser = b.find(x => x.name === name);

    if (!aUser || !bUser) {
      continue;
    }

    const diff = {
      name,
      totalScore: bUser.totalScore - aUser.totalScore,
      play_time: bUser.play_time - aUser.play_time,
      minedAll: bUser.minedAll - (aUser.minedAll ?? 0),
      scores: {
        ore: bUser.scores.ore - aUser.scores.ore,
        mob: bUser.scores.mob - aUser.scores.mob,
        explore: bUser.scores.explore - aUser.scores.explore,
        farm: bUser.scores.farm - aUser.scores.farm,
      },
      stats: {
        ores: {
          ancientdebris: bUser.stats.ores.ancientdebris - (aUser.stats.ores.ancientdebris ?? 0),
          netherite: bUser.stats.ores.netherite - aUser.stats.ores.netherite,
          diamond: bUser.stats.ores.diamond - aUser.stats.ores.diamond,
          emerald: bUser.stats.ores.emerald - aUser.stats.ores.emerald,
          gold: bUser.stats.ores.gold - aUser.stats.ores.gold,
          iron: bUser.stats.ores.iron - aUser.stats.ores.iron,
          copper: bUser.stats.ores.copper - aUser.stats.ores.copper,
          coal: bUser.stats.ores.coal - aUser.stats.ores.coal,
        },
        mobs: {
          warden: bUser.stats.mobs.warden - aUser.stats.mobs.warden,
          ender_dragon: bUser.stats.mobs.ender_dragon - aUser.stats.mobs.ender_dragon,
          wither: bUser.stats.mobs.wither - aUser.stats.mobs.wither,
          shulker: bUser.stats.mobs.shulker - aUser.stats.mobs.shulker,
          enderman: bUser.stats.mobs.enderman - aUser.stats.mobs.enderman,
          wither_skeleton: bUser.stats.mobs.wither_skeleton - aUser.stats.mobs.wither_skeleton,
          creeper: bUser.stats.mobs.creeper - aUser.stats.mobs.creeper,
          skeleton: bUser.stats.mobs.skeleton - aUser.stats.mobs.skeleton,
          zombie: bUser.stats.mobs.zombie - aUser.stats.mobs.zombie,
          spider: bUser.stats.mobs.spider - aUser.stats.mobs.spider,
          cow: bUser.stats.mobs.cow - aUser.stats.mobs.cow,
          sheep: bUser.stats.mobs.sheep - aUser.stats.mobs.sheep,
          chicken: bUser.stats.mobs.chicken - aUser.stats.mobs.chicken,
        },
        explores: {
          trades: bUser.stats.explores.trades - aUser.stats.explores.trades,
          breeds: bUser.stats.explores.breeds - aUser.stats.explores.breeds,
          raid_win: bUser.stats.explores.raid_win - aUser.stats.explores.raid_win,
          deaths: bUser.stats.explores.deaths - aUser.stats.explores.deaths,
          fishing: bUser.stats.explores.fishing - aUser.stats.explores.fishing,
        },
        farms: {
          melon: bUser.stats.farms.melon - aUser.stats.farms.melon,
          pumpkin: bUser.stats.farms.pumpkin - aUser.stats.farms.pumpkin,
          wheat: bUser.stats.farms.wheat - aUser.stats.farms.wheat,
          carrot: bUser.stats.farms.carrot - aUser.stats.farms.carrot,
          potato: bUser.stats.farms.potato - aUser.stats.farms.potato,
          sugar_cane: bUser.stats.farms.sugar_cane - aUser.stats.farms.sugar_cane,
        }
      },
    };
    results.push(diff);
  }

  return results;
}