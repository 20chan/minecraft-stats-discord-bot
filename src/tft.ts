import * as R from 'remeda';
import type { RiotAPITypes } from '@fightmegg/riot-api';
import { Account, addTftAccount, getAccounts } from './lol';
import { existsSync } from 'fs';
import { getLatestVersion, getLolCharacterIconUrl, getTftAccount, getTftCharacterIcons, getTftEntries, getTftItemIcons, getTftTacticianIconUrl, getTftTraitIcons, tftApi } from './riot';
import { createCanvas, loadImage } from 'canvas';
import { mkdir, writeFile } from 'fs/promises';

const LOL_DISCORD_WEBHOOK_URL = process.env.LOL_DISCORD_WEBHOOK_URL!;

export async function getUnprocessedTftMatchId(account: Account) {
  const matchIds = await tftApi(`/tft/match/v1/matches/by-puuid/${account.tftPuuid}/ids?count=1`) as string[];
  const lastMatchId = matchIds[0];

  if (existsSync(`./data/exports/tft-${account.name}/${lastMatchId}.png`)) {
    return null;
  }

  return lastMatchId;
}

export async function processTftMatch(account: Account, matchId: string) {
  const match = await tftApi(`/tft/match/v1/matches/${matchId}`) as RiotAPITypes.TftMatch.MatchDTO;

  // ranked match only
  // fyi 1090 is normal
  const queues = [
    [1090, '일겜'],
    [1100, '랭겜'],
    [1130, '초고속'],
    [1160, '깐부'],
    [1210, '배불뚝'],
  ] as const;

  const queue = queues.find(x => x[0] === match.info.queue_id)?.[1];

  if (!queue) {
    return;
  }

  if (match.info.game_datetime < Date.now() - 1000 * 60 * 60 * 24 * 3) {
    return;
  }

  const version = await getLatestVersion();
  const charactersInfo = await getTftCharacterIcons(version);
  const itemIcons = await getTftItemIcons(version);
  const traitIcons = await getTftTraitIcons(version);

  var participant = match.info.participants.find(x => x.puuid === account.tftPuuid)!;
  const win = participant.placement <= 4;

  const summonerName = (participant as any).riotIdGameName as string;

  const canvas = createCanvas(550, 200);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = ctx.strokeStyle = win ? '#28344E' : '#59343B';
  ctx.fillRect(0, 0, 550, 200);

  const companionIconUrl = await getTftTacticianIconUrl(version, (participant.companion as any).item_ID);
  if (companionIconUrl) {
    const companionImage = await loadImage(companionIconUrl);
    ctx.drawImage(companionImage, 5, 5, 128, 86);
  }

  ctx.fillStyle = ctx.strokeStyle = 'white';
  ctx.font = 'bold 40px NanumBarunGothic';
  ctx.fillText(summonerName, 145, 50, 420);

  let tierSummary = '';
  if (queue === '랭겜') {
    const entries = await getTftEntries(account.tftPuuid!);
    const entry = entries.find(x => x.queueType === 'RANKED_TFT');
    tierSummary = entry ? `${entry.tier} ${entry.rank}, ${entry.leaguePoints}p` : '';
  }

  ctx.fillStyle = ctx.strokeStyle = win ? '#5383E8' : '#E84057';
  ctx.font = 'bold 25px NanumBarunGothic';
  ctx.fillText(`${queue} - ${participant.placement}위 ${tierSummary}`, 145, 85, 420);

  const x = 5;
  const y = 105;
  const w = 45;
  const h = 45;
  const gap = 2;
  const tierColors = ['#848999', '#11b288', '#207ac7', '#c440da', '#ffb93b', '#fffbc2'];

  const units = participant.units.map(x => ({
    ...x,
    info: charactersInfo.find(c => c.id === x.character_id),
  }))

  for (const [i, unit] of units.entries()) {
    const icon = await getLolCharacterIconUrl(unit.character_id.split('_')[1]);
    try {
      const unitImage = await loadImage(icon);
      ctx.drawImage(unitImage, x + i * (w + gap), y, w, h);
    } catch (e) {
      // console.error(`Failed to load image for character ${unit.character_id}`, e);
      const fallbackIcon = unit.info?.imageUrl;
      if (fallbackIcon) {
        const unitImage = await loadImage(fallbackIcon);
        ctx.drawImage(unitImage, 140, 5, 80, 60, x + i * (w + gap), y, w, h);
      }
    }

    ctx.fillStyle = ctx.strokeStyle = unit.info !== undefined ? tierColors[unit.info.cost] : '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + i * (w + gap) + 1.5, y + 1.5, w - 3, h - 3);

    ctx.font = '14px NanumBarunGothic';
    ctx.textAlign = 'center';

    const star = '★'.repeat(unit.tier);
    ctx.fillText(star, x + i * (w + gap) + w / 2, y + 5);

    for (const [j, itemName] of unit.itemNames.entries()) {
      const itemIcon = itemIcons.find(x => x.id === itemName)!.imageUrl;
      const itemImage = await loadImage(itemIcon);
      ctx.drawImage(itemImage, x + i * (w + gap) + j * (w / 3), y + h - (h / 6), w / 3, h / 3);
    }
  }
  ctx.textAlign = 'start';

  const traits = R.pipe(
    participant.traits,
    R.filter(x => x.tier_current > 0),
    R.sortBy(x => -(x.style ?? 0), x => -x.tier_current, x => -x.num_units),
  ).splice(0, 10);

  for (const [i, trait] of traits.entries()) {
    const traitInfo = traitIcons.find(x => x.id === trait.name)!;
    const traitIcon = traitInfo.imageUrl;
    const traitImage = await loadImage(traitIcon);
    ctx.drawImage(traitImage, x + i * (w + gap), y + h + gap + h / 3 - 5, 20, 20);

    ctx.fillStyle = ['#765940', '#FD8458', '#B7D1D5', '#FCE27D', '#D5FDFB'][trait.style ?? 0] || 'white';

    ctx.font = 'bold 12px NanumBarunGothic';
    ctx.fillText(`${trait.num_units}`, x + i * (w + gap) + 22, y + h + gap + h / 3 + 10);
    ctx.font = '10px NanumBarunGothic';
    ctx.fillText(`${traitInfo.name}`, 10 + i * (w + gap), y + h + gap + h / 3 + 25);
  }

  if (!existsSync(`./data/exports/tft-${account.name}`)) {
    await mkdir(`./data/exports/tft-${account.name}`);
  }

  const path = `./data/exports/tft-${account.name}/${matchId}.png`;
  const buffer = canvas.toBuffer('image/png');
  await writeFile(path, buffer, 'base64');

  const tiers3 = units.filter(x => x.tier === 3);
  const tiers4 = units.filter(x => x.tier === 4);

  return {
    imageUrl: `https://cdn.0ch.me/lol/${encodeURIComponent(`tft-${account.name}`)}/${matchId}.png`,
    metadata: {
      color: win ? 0x5383E8 : 0xE84057,
      placement: participant.placement,
      summonerName,
      queue,
      tiers3,
      tiers4,
    },
  };
}

export async function batchTft() {
  const accounts = await getAccounts();

  for (const account of accounts) {
    try {
      if (account.tftPuuid === null) {
        try {
          var tftAccount = await getTftAccount(account.name);
          await addTftAccount(account.puuid, tftAccount.puuid);
          account.tftPuuid = tftAccount.puuid;
        } catch (e) {
          console.error(`Failed to get TFT account for ${account.name}`, e);
          continue;
        }
      }

      const matchId = await getUnprocessedTftMatchId(account);
      if (!matchId) {
        continue;
      }
      const result = await processTftMatch(account, matchId);
      if (!result) {
        continue;
      }

      const tags = [
        ...result.metadata.tiers3.filter(x => x.info?.cost === 1).map(_ => '1코 3성'),
        ...result.metadata.tiers3.filter(x => x.info?.cost === 2).map(_ => '2코 3성'),
        ...result.metadata.tiers3.filter(x => x.info?.cost === 3).map(_ => '3코 3성'),
        ...result.metadata.tiers3.filter(x => x.info?.cost === 4).map(_ => '4코 3성'),
        ...result.metadata.tiers3.filter(x => x.info?.cost === 5).map(_ => '5코 3성'),

        ...result.metadata.tiers4.filter(x => x.info?.cost === 1).map(_ => '1코 4성'),
        ...result.metadata.tiers4.filter(x => x.info?.cost === 2).map(_ => '2코 4성'),
        ...result.metadata.tiers4.filter(x => x.info?.cost === 3).map(_ => '3코 4성'),
        ...result.metadata.tiers4.filter(x => x.info?.cost === 4).map(_ => '4코 4성'),
        ...result.metadata.tiers4.filter(x => x.info?.cost === 5).map(_ => '5코 4성'),
      ].filter(x => x !== null);

      await fetch(process.env.TFT_DISCORD_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [
            {
              title: `${account.alias === '' ? result.metadata.summonerName : account.alias}님이 방금 막..`,
              description: `${result.metadata.queue} ${result.metadata.placement}위 ${tags.map(x => `\`${x}\``).join('  ')}`,
              image: {
                url: result.imageUrl,
              },
              color: result.metadata.color,
            },
          ],
        }),
      });
    } catch (e) {
      console.error(`tft batch error for ${account.name}`, e);
    }
  }
}
