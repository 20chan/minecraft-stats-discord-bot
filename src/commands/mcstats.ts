import * as discord from 'discord.js';
import { getUserList } from '../mc';
import { postProcess } from '../score';
import { renderImage } from '../render';
import { diffSnapshots, getLatestSnapshot } from '../snapshot';

const emojis = {
  ancientdebris: '<:ancientdebris:1169654264331784322>',
  diamond: '<:diamond:1167079668629905418>',
  emerald: '<:emerald:1167079856912224287>',
  gold: '<:gold:1167080678895136778>',
  iron: '<:iron:1167080676571492392>',
  carrot: '<:carrot:1167080673073438831>',
  potato: '<:potato:1167085237935812658>',
  melon: '<:melon:1167080467498016768>',
  wheat: '<:wheat:1167080683634704495>',
  pumpkin: '<:pumpkin:1167080465677697114>',
  zombie: '<:mc_zombie:847762917365645322>',
  skeleton: '<:mc_skeleton:847762547313868810>',
  creeper: '<:mc_creeper:847762176600965130>',
  trade: '<:villager:1167085248568377405>',
  raid: '<:raid:1167085246504767548>',
  fishing: '<:fishing:1167085242847342622>',
  mined: '<:cobblestone:1167198771961139323>',
}

export async function handle(client: discord.Client, interaction: discord.CommandInteraction) {
  await interaction.deferReply({});

  const id = interaction.options.getString('id', false);

  const users = await getUserList();
  const total = users.map(postProcess);
  const length = total.length;

  if (id === null) {
    const resp = await reportSnapshot();
    if (resp) {
      interaction.editReply(resp);
    } else {
      interaction.editReply({ content: '응~답없음' });
    }

  } else {
    const user = total.find(x => x.name === id);
    if (!user) {
      interaction.editReply({ content: 'id가 없는듯?' });
      return;
    }

    await renderImage(total, user);

    const oreScoreRank = [...total].sort((a, b) => b.scores.ore - a.scores.ore).findIndex(x => x.name === user.name) + 1;
    const mobScoreRank = [...total].sort((a, b) => b.scores.mob - a.scores.mob).findIndex(x => x.name === user.name) + 1;
    const exploreScoreRank = [...total].sort((a, b) => b.scores.explore - a.scores.explore).findIndex(x => x.name === user.name) + 1;
    const farmScoreRank = [...total].sort((a, b) => b.scores.farm - a.scores.farm).findIndex(x => x.name === user.name) + 1;
    const totalScoreRank = [...total].sort((a, b) => b.totalScore - a.totalScore).findIndex(x => x.name === user.name) + 1;
    const playTimeRank = [...total].sort((a, b) => b.play_time - a.play_time).findIndex(x => x.name === user.name) + 1;
    interaction.editReply({
      files: [
        `./imgs/${user.name}.png`,
      ],
      embeds: [
        {
          author: {
            icon_url: `https://mc-heads.net/avatar/${user.name}`,
            name: user.name,
          },
          title: `${user.name}님이 마크에 낭비한 인생`,
          description: `총 플레이 시간: ${user.play_time}시간 (${playTimeRank}/${length}위)
광물 점수: ${user.scores.ore} (${oreScoreRank}/${length}위)
몹 점수: ${user.scores.mob} (${mobScoreRank}/${length}위)
탐험 점수: ${user.scores.explore} (${exploreScoreRank}/${length}위)
농사 점수: ${user.scores.farm} (${farmScoreRank}/${length}위)
총 점수: ${user.totalScore} (${totalScoreRank}/${length}위)`,
          fields: [
            {
              name: `${emojis.ancientdebris}`,
              value: `${user.stats.ores.netherite}`,
              inline: true,
            },
            {
              name: `${emojis.diamond}`,
              value: `${user.stats.ores.diamond}`,
              inline: true,
            },
            {
              name: `${emojis.emerald}`,
              value: `${user.stats.ores.emerald}`,
              inline: true,
            },
            {
              name: `${emojis.gold}`,
              value: `${user.stats.ores.gold}`,
              inline: true,
            },
            {
              name: `${emojis.iron}`,
              value: `${user.stats.ores.iron}`,
              inline: true,
            },
            {
              name: `${emojis.wheat}`,
              value: `${user.stats.farms.wheat}`,
              inline: true,
            },
            {
              name: `${emojis.carrot}`,
              value: `${user.stats.farms.carrot}`,
              inline: true,
            },
            {
              name: `${emojis.melon}`,
              value: `${user.stats.farms.melon}`,
              inline: true,
            },
            {
              name: `${emojis.pumpkin}`,
              value: `${user.stats.farms.pumpkin}`,
              inline: true,
            },
            {
              name: `${emojis.zombie}`,
              value: `${user.stats.mobs.zombie}`,
              inline: true,
            },
            {
              name: `${emojis.skeleton}`,
              value: `${user.stats.mobs.skeleton}`,
              inline: true,
            },
            {
              name: `${emojis.creeper}`,
              value: `${user.stats.mobs.creeper}`,
              inline: true,
            },
            {
              name: 'You died!',
              value: `${user.stats.explores.deaths}`,
              inline: true,
            },
            {
              name: `${emojis.fishing}`,
              value: `${user.stats.explores.fishing}`,
              inline: true,
            },
            {
              name: `${emojis.trade}`,
              value: `${user.stats.explores.trades}`,
              inline: true,
            },
            {
              name: `${emojis.raid}`,
              value: `${user.stats.explores.raid_win}`,
              inline: true,
            },
            {
              name: `${emojis.mined}`,
              value: `${user.minedAll}`,
              inline: true,
            },
          ].filter(x => x.value !== '0'),
        },
      ],
    });
  }
}


export async function reportSnapshot() {
  const latest = await getLatestSnapshot();

  const users = await getUserList();
  const current = users.map(postProcess);

  const diffs = diffSnapshots(latest.results, current).filter(x => x.totalScore > 0);
  const length = diffs.length;

  if (diffs.length === 0) {
    return;
  }

  const embeds = diffs.map(user => {
    const oreScoreRank = [...diffs].sort((a, b) => b.scores.ore - a.scores.ore).findIndex(x => x.name === user.name) + 1;
    const mobScoreRank = [...diffs].sort((a, b) => b.scores.mob - a.scores.mob).findIndex(x => x.name === user.name) + 1;
    const exploreScoreRank = [...diffs].sort((a, b) => b.scores.explore - a.scores.explore).findIndex(x => x.name === user.name) + 1;
    const farmScoreRank = [...diffs].sort((a, b) => b.scores.farm - a.scores.farm).findIndex(x => x.name === user.name) + 1;
    const totalScoreRank = [...diffs].sort((a, b) => b.totalScore - a.totalScore).findIndex(x => x.name === user.name) + 1;
    const playTimeRank = [...diffs].sort((a, b) => b.play_time - a.play_time).findIndex(x => x.name === user.name) + 1;
    const minedRank = [...diffs].sort((a, b) => b.minedAll - a.minedAll).findIndex(x => x.name === user.name) + 1;

    return {
      author: {
        icon_url: `https://mc-heads.net/avatar/${user.name}`,
        name: user.name,
      },
      title: `${user.name}님의 오늘 마크 리포트`,
      description: `총 플레이 시간: ${user.play_time}시간 (${playTimeRank}/${length}위)
${user.minedAll === 0 ? '' : `캔 블럭 수: ${user.minedAll} (${minedRank}/${length}위)`}
${user.scores.ore === 0 ? '' : `광물 점수: ${user.scores.ore} (${oreScoreRank}/${length}위)`}
${user.scores.mob === 0 ? '' : `몹 점수: ${user.scores.mob} (${mobScoreRank}/${length}위)`}
${user.scores.explore === 0 ? '' : `탐험 점수: ${user.scores.explore} (${exploreScoreRank}/${length}위)`}
${user.scores.farm === 0 ? '' : `농사 점수: ${user.scores.farm} (${farmScoreRank}/${length}위)`}
${user.totalScore === 0 ? '' : `총 점수: ${user.totalScore} (${totalScoreRank}/${length}위)`}`,
      fields: [
        {
          name: `${emojis.ancientdebris}`,
          value: `${user.stats.ores.ancientdebris}`,
          inline: true,
        },
        {
          name: `${emojis.diamond}`,
          value: `${user.stats.ores.diamond}`,
          inline: true,
        },
        {
          name: `${emojis.emerald}`,
          value: `${user.stats.ores.emerald}`,
          inline: true,
        },
        {
          name: `${emojis.gold}`,
          value: `${user.stats.ores.gold}`,
          inline: true,
        },
        {
          name: `${emojis.iron}`,
          value: `${user.stats.ores.iron}`,
          inline: true,
        },
        {
          name: `${emojis.wheat}`,
          value: `${user.stats.farms.wheat}`,
          inline: true,
        },
        {
          name: `${emojis.carrot}`,
          value: `${user.stats.farms.carrot}`,
          inline: true,
        },
        {
          name: `${emojis.melon}`,
          value: `${user.stats.farms.melon}`,
          inline: true,
        },
        {
          name: `${emojis.pumpkin}`,
          value: `${user.stats.farms.pumpkin}`,
          inline: true,
        },
        {
          name: `${emojis.zombie}`,
          value: `${user.stats.mobs.zombie}`,
          inline: true,
        },
        {
          name: `${emojis.skeleton}`,
          value: `${user.stats.mobs.skeleton}`,
          inline: true,
        },
        {
          name: `${emojis.creeper}`,
          value: `${user.stats.mobs.creeper}`,
          inline: true,
        },
        {
          name: 'You died!',
          value: `${user.stats.explores.deaths}`,
          inline: true,
        },
        {
          name: `${emojis.fishing}`,
          value: `${user.stats.explores.fishing}`,
          inline: true,
        },
        {
          name: `${emojis.trade}`,
          value: `${user.stats.explores.trades}`,
          inline: true,
        },
        {
          name: `${emojis.raid}`,
          value: `${user.stats.explores.raid_win}`,
          inline: true,
        },
        {
          name: `${emojis.mined}`,
          value: `${user.minedAll}`,
          inline: true,
        },
      ].filter(x => x.value !== '0'),
    };
  });

  return {
    content: '오늘 마크 리포트',
    embeds,
  };
}