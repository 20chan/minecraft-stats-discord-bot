import { User } from './mc';

const extract = (...keys: string[]) => (user: User): number[] => {
  return keys.map(key => {
    const [left, right] = key.split('.');
    const value = (user.stats as any)[`minecraft:${left}`][`minecraft:${right}`];
    return value ?? 0;
  });
}
export type UserResult = ReturnType<typeof postProcess>;
export const postProcess = (user: User) => {
  const [
    ancientdebris,
    netherite,
    diamond,
    emerald0,
    emerald1,
    emerald_block,
    gold0,
    gold_block,
    iron0,
    iron_block,
    copper,
    coal,
  ] = extract(
    'picked_up.ancient_debris',
    'crafted.netherite_ingot',
    'picked_up.diamond',
    'picked_up.emerald',
    'crafted.emerald_block',
    'crafted.emerald',
    'crafted.gold_ingot',
    'crafted.gold_block',
    'crafted.iron_ingot',
    'crafted.iron_block',
    'mined.copper_ore',
    'picked_up.coal',
  )(user);

  const emerald = emerald_block * 9 + emerald0 + emerald1;
  const gold = gold_block * 9 + gold0;
  const iron = iron_block * 9 + iron0;

  const [
    play_time,
    trades,
    breeds,
    raid_win,
    deaths,
    fishing,
  ] = extract(
    'custom.play_time',
    'custom.traded_with_villager',
    'custom.animals_bred',
    'custom.raid_win',
    'custom.deaths',
    'custom.fish_caught',
  )(user);

  const [
    warden,
    ender_dragon,
    wither,
    shulker,
    enderman,
    wither_skeleton,
    creeper,
    skeleton,
    zombie,
    spider,
    cow,
    sheep,
    chicken,
  ] = extract(
    'killed.warden',
    'killed.ender_dragon',
    'killed.wither',
    'killed.shulker',
    'killed.enderman',
    'killed.wither_skeleton',
    'killed.creeper',
    'killed.skeleton',
    'killed.zombie',
    'killed.spider',
    'killed.cow',
    'killed.sheep',
    'killed.chicken',
  )(user);

  const [
    melon0,
    melon1,
    pumpkin0,
    pumpkin1,
    wheat,
    carrot,
    potato,
    sugar_cane0,
    sugar_cane1,
  ] = extract(
    'mined.melon',
    'picked_up.melon',
    'mined.pumpkin',
    'picked_up.pumpkin',
    'mined.wheat',
    'mined.carrot',
    'mined.potato',
    'mined.sugar_cane',
    'picked_up.sugar_cane',
  )(user);

  const melon = melon0 + melon1;
  const pumpkin = pumpkin0 + pumpkin1;
  const sugar_cane = sugar_cane0 + sugar_cane1;

  const minedAll = Object.entries(user.stats['minecraft:mined'] ?? {}).reduce((acc, [key, value]) => acc + value, 0);

  const oreScore = Math.floor(
    ancientdebris * 1000
    + netherite * 500
    + diamond * 100
    + emerald * 50
    + gold * 10
    + iron * 5
    + copper * 5
    + coal
  );

  const mobScore = Math.floor(
    warden * 2000
    + ender_dragon * 500
    + wither * 500
    + shulker * 100
    + wither_skeleton * 50
    + enderman * 30
    + creeper * 10
    + skeleton * 10
    + spider * 10
    + zombie * 5
    + cow * 1.5
    + sheep * 1.5
    + chicken * 1
  );

  const exploreScore = Math.floor(
    deaths * 1000
    + raid_win * 500
    + trades * 100
    + breeds * 50
    + fishing * 10
  );

  const farmScore = Math.floor(
    melon * 10
    + pumpkin * 10
    + wheat * 5
    + carrot * 5
    + potato * 5
    + sugar_cane * 5
  );

  return {
    name: user.name,
    play_time: Math.floor(play_time / 3600 / 20),
    stats: {
      ores: {
        ancientdebris,
        netherite,
        diamond,
        emerald,
        gold,
        iron,
        copper,
        coal,
      },
      mobs: {
        warden,
        ender_dragon,
        wither,
        shulker,
        enderman,
        wither_skeleton,
        creeper,
        skeleton,
        zombie,
        spider,
        cow,
        sheep,
        chicken,
      },
      explores: {
        trades,
        breeds,
        raid_win,
        deaths,
        fishing,
      },
      farms: {
        melon,
        pumpkin,
        wheat,
        carrot,
        potato,
        sugar_cane,
      },
    },
    minedAll,
    scores: {
      ore: oreScore,
      mob: mobScore,
      explore: exploreScore,
      farm: farmScore,
    },
    totalScore: oreScore + mobScore + exploreScore + farmScore,
  };
}

export const postProcessShort = (user: User) => {
  const result = postProcess(user);
  return {
    name: result.name,
    play_time: result.play_time,
    scores: result.scores,
    totalScore: result.totalScore,
  }
}