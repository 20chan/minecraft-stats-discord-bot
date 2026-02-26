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
  if (match.info.queue_id !== 1100) {
    return;
  }

  const version = await getLatestVersion();
  const characterIcons = await getTftCharacterIcons(version);
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

  const entries = await getTftEntries(account.tftPuuid!);
  const entry = entries.find(x => x.queueType === 'RANKED_TFT');
  const tierSummary = entry ? `${entry.tier} ${entry.rank}, ${entry.leaguePoints}p` : '';

  ctx.fillStyle = ctx.strokeStyle = win ? '#5383E8' : '#E84057';
  ctx.font = 'bold 25px NanumBarunGothic';
  ctx.fillText(`랭겜 - ${participant.placement}위 ${tierSummary}`, 145, 85, 420);

  const x = 5;
  const y = 100;
  const w = 45;
  const h = 45;
  const gap = 2;
  const rarityColors = ['#848999', '#11b288', '#207ac7', '207ac7', '#c440da', '#ffb93b', '#ffb93b', '#fffbc2'];

  for (const [i, unit] of participant.units.entries()) {
    const icon = await getLolCharacterIconUrl(unit.character_id.split('_')[1]);
    try {
      const unitImage = await loadImage(icon);
      ctx.drawImage(unitImage, x + i * (w + gap), y, w, h);
    } catch (e) {
      // console.error(`Failed to load image for character ${unit.character_id}`, e);
      const fallbackIcon = characterIcons.find(x => x.id === unit.character_id)!.imageUrl;
      const unitImage = await loadImage(fallbackIcon);
      ctx.drawImage(unitImage, 140, 5, 80, 60, x + i * (w + gap), y, w, h);
    }

    ctx.fillStyle = ctx.strokeStyle = rarityColors[unit.rarity] || '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + i * (w + gap) + 1.5, y + 1.5, w - 3, h - 3);

    ctx.font = '16px NanumBarunGothic';
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
    ctx.fillStyle = rarityColors[trait.tier_current] || '#fff';
    const traitInfo = traitIcons.find(x => x.id === trait.name)!;
    const traitIcon = traitInfo.imageUrl;
    const traitImage = await loadImage(traitIcon);
    ctx.drawImage(traitImage, x + i * (w + gap), y + h + gap + h / 3, 20, 20);

    ctx.fillStyle = ['#765940', '#FD8458', '#B7D1D5', '#FCE27D', '#D5FDFB'][trait.style ?? 0] || 'white';

    ctx.font = 'bold 12px NanumBarunGothic';
    ctx.fillText(`${trait.num_units}`, x + i * (w + gap) + 22, y + h + gap + h / 3 + 15);
    ctx.font = '10px NanumBarunGothic';
    ctx.fillText(`${traitInfo.name}`, 10 + i * (w + gap), y + h + gap + h / 3 + 30);
  }

  if (!existsSync(`./data/exports/tft-${account.name}`)) {
    await mkdir(`./data/exports/tft-${account.name}`);
  }

  const path = `./data/exports/tft-${account.name}/${matchId}.png`;
  const buffer = canvas.toBuffer('image/png');
  await writeFile(path, buffer, 'base64');


  return {
    imageUrl: `https://cdn.0ch.me/lol/${encodeURIComponent(`tft-${account.name}`)}/${matchId}.png`,
    metadata: {
      color: win ? 0x5383E8 : 0xE84057,
      placement: participant.placement,
      summonerName,
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

      await fetch(process.env.TFT_DISCORD_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [
            {
              title: `${account.alias === '' ? result.metadata.summonerName : account.alias}님이 방금 막..`,
              description: `랭겜 ${result.metadata.placement}위`,
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
