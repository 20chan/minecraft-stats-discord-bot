import { existsSync } from 'node:fs';
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { db } from './db';
import { getLolCharacterIconUrl, getLolEntries, getLolMatches, getLolMatchInfo, getLolSummoner, getRiotAccount } from './riot';
import { mkdir, writeFile } from 'node:fs/promises';
import { logger } from './logger';

const LOL_DISCORD_WEBHOOK_URL = process.env.LOL_DISCORD_WEBHOOK_URL!;

interface Account {
  puuid: string;
  summonerId: string;
  accountId: string;
  name: string;
  alias: string;
}

export async function getAccounts() {
  return await db.lolSummoner.findMany();
}

export async function addAccount(summonerName: string, alias: string): Promise<Account> {
  const { puuid } = await getRiotAccount(summonerName);
  const { id: summonerId, accountId } = await getLolSummoner(puuid);

  return await db.lolSummoner.create({
    data: {
      name: summonerName,
      puuid,
      accountId,
      summonerId,
      alias,
    },
  });
}

export async function editAccount(summonerName: string, alias: string): Promise<Account> {
  const entry = await db.lolSummoner.findFirstOrThrow({
    where: {
      name: summonerName,
    },
  });

  return await db.lolSummoner.update({
    where: {
      puuid: entry.puuid,
    },
    data: {
      alias,
    },
  });
}

export async function deleteAccount(summonerName: string): Promise<Account> {
  const entry = await db.lolSummoner.findFirstOrThrow({
    where: {
      name: summonerName,
    },
  });

  return await db.lolSummoner.delete({
    where: {
      puuid: entry.puuid,
    },
  });
}

export async function getUnprocessedLastMatchId(account: Account): Promise<string | null> {
  const matchIds = await getLolMatches(account.puuid, { count: 1 });
  const lastMatchId = matchIds[0];

  if (existsSync(`./data/exports/${account.name}/${lastMatchId}.png`)) {
    return null;
  }

  return lastMatchId;
}

export async function processMatch(account: Account, matchId: string) {
  const match = await getLolMatchInfo(matchId);

  const participant = match.info.participants.find(x => x.puuid === account.puuid);

  if (!participant) {
    return null;
  }

  const { queueId, gameDuration } = match.info;
  const kind = (
    [400, 430, 490].includes(queueId) ? '일겜'
      : queueId === 420 ? '솔랭'
        : queueId === 440 ? '자랭'
          : queueId === 450 ? '칼바람'
            : queueId === 700 ? '격전'
              : [830, 840, 850].includes(queueId) ? 'AI전'
                : queueId === 900 ? '우르프'
                  : [1700, 1710].includes(queueId) ? '아레나'
                    : '기타'
  );
  const duration = `${Math.floor(gameDuration / 60)}분 ${gameDuration % 60}초`;

  const matches = [
    ['RANKED_SOLO_5x5', '솔랭'],
    ['RANKED_FLEX_SR', '자랭'],
  ];

  const queueTypeToFind = matches.find(xs => xs[1] === kind)?.[0] ?? '';
  const entries = await getLolEntries(account.puuid);
  const entry = entries.find(x => x.queueType === queueTypeToFind);

  const leaguePoints = entry?.leaguePoints?.toString() ?? '';
  const tierSummary = entry ? `${entry.tier} ${entry.rank}, ${leaguePoints}p` : '';

  const canvas = createCanvas(550, 120);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = ctx.strokeStyle = participant.win ? '#28344E' : '#59343B';
  ctx.fillRect(0, 0, 550, 120);

  const characterIconUrl = await getLolCharacterIconUrl(participant.championName);
  const characterIcon = await loadImage(characterIconUrl);
  ctx.drawImage(characterIcon, 0, 0, 120, 120);

  ctx.fillStyle = ctx.strokeStyle = 'white';
  ctx.font = 'bold 40px NanumBarunGothic';
  ctx.fillText(participant.riotIdGameName, 130, 50, 420);

  ctx.fillStyle = ctx.strokeStyle = participant.win ? '#5383E8' : '#E84057';
  ctx.font = 'bold 30px NanumBarunGothic';
  ctx.fillText(`${kind} - ${participant.win ? '승리' : '패배'} ${tierSummary}`, 130, 83, 420);

  ctx.fillStyle = ctx.strokeStyle = '#9E9EB1';
  ctx.font = 'bold 15px NanumBarunGothic';
  ctx.fillText(`${participant.lane}    ||    KDA  ${participant.kills} / ${participant.deaths} / ${participant.assists}     ||     ${duration}`, 130, 108, 420);

  if (!existsSync(`./data/exports/${account.name}`)) {
    await mkdir(`./data/exports/${account.name}`);
  }

  const path = `./data/exports/${account.name}/${matchId}.png`;
  const buffer = canvas.toBuffer('image/png');
  await writeFile(path, buffer, 'base64');

  return {
    imageUrl: `https://cdn.0ch.me/lol/${encodeURIComponent(account.name)}/${matchId}.png`,
    metadata: {
      color: participant.win ? 0x5383E8 : 0xE84057,
      summonerName: participant.riotIdGameName,
      level: participant.summonerLevel,
      doubleKills: participant.doubleKills,
      tripleKills: participant.tripleKills,
      quadraKills: participant.quadraKills,
      pentaKills: participant.pentaKills,
    },
  };
}

export async function batch() {
  const accounts = await getAccounts();

  for (const account of accounts) {
    try {
      const matchId = await getUnprocessedLastMatchId(account);
      if (!matchId) {
        continue;
      }

      const result = await processMatch(account, matchId);
      if (!result) {
        continue;
      }

      const tags = [
        `${result.metadata.level}렙`,
        ...[...new Array(result.metadata.doubleKills)].map(() => '더블킬'),
        ...[...new Array(result.metadata.tripleKills)].map(() => '트리플킬'),
        ...[...new Array(result.metadata.quadraKills)].map(() => '쿼드라킬'),
        ...[...new Array(result.metadata.pentaKills)].map(() => '펜타킬'),
      ].filter(x => x !== null);
      await fetch(LOL_DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [
            {
              title: `${account.alias === '' ? result.metadata.summonerName : account.alias}님이 방금 막..`,
              description: tags.map(x => `\`${x}\``).join('  '),
              image: {
                url: result.imageUrl,
              },
              color: result.metadata.color,
            }
          ],
        }),
      })
    } catch (e) {
      logger.error('batch error', e);
    }
  }
}
