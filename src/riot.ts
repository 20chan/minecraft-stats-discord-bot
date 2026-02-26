import { RiotAPITypes } from '@fightmegg/riot-api';
import fetch from 'node-fetch';

const RIOT_API = process.env.RIOT_API_KEY!;
const RIOT_TFT_API_KEY = process.env.RIOT_TFT_API_KEY!;

export async function riotApi<T>(endpoint: `/${string}`): Promise<T> {
  const response = await fetch(`https://asia.api.riotgames.com${endpoint}`, {
    headers: {
      'X-Riot-Token': RIOT_API,
    }
  });

  return await response.json();
}

export async function tftApi<T>(endpoint: `/${string}`, region: string = 'asia'): Promise<T> {
  const response = await fetch(`https://${region}.api.riotgames.com${endpoint}`, {
    headers: {
      'X-Riot-Token': RIOT_TFT_API_KEY,
    }
  });

  return await response.json();
}

async function lolApi<T>(endpoint: `/${string}`): Promise<T> {
  const response = await fetch(`https://kr.api.riotgames.com${endpoint}`, {
    headers: {
      'X-Riot-Token': RIOT_API,
    }
  });

  return await response.json();
}

interface AccountDto {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export function parseRiotId(summonerName: string): { gameName: string; tagLine: string } {
  const [gameName, tagLine] = summonerName.split('#');
  return {
    gameName,
    tagLine: tagLine ?? 'KR1',
  };
}

export async function getRiotAccount(summonerName: string): Promise<AccountDto> {
  const { gameName, tagLine } = parseRiotId(summonerName);

  return await riotApi(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
}

export async function getTftAccount(summonerName: string): Promise<AccountDto> {
  const { gameName, tagLine } = parseRiotId(summonerName);

  return await tftApi(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}`);
}

interface SummonerDTo {
  accountId: string;
  profileIconId: number;
  id: string;
  puuid: string;
  summonerLevel: number;
}

export async function getLolSummoner(puuid: string): Promise<SummonerDTo> {
  return await lolApi(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
}

export async function getLolMatches(puuid: string, options?: {
  start?: number;
  count?: number;
}): Promise<string[]> {
  const { start = 0, count = 10 } = options || {};
  return await riotApi(`/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`);
}

interface ObjectiveDto {
  first: boolean;
  kills: number;
}

interface MatchDto {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    endOfGameResult: string;
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp: number;
    gameId: number;
    gameMode: string;
    gameName: string;
    gameStartTimestamp: number;
    gameType: string;
    gameVersion: string;
    mapId: number;
    participants: Array<{
      allInPings: number;
      assistMePings: number;
      assists: number;
      baronKills: number;
      bountyLevel: number;
      champExperience: number;
      champLevel: number;
      championId: number;
      championName: string;
      commandPings: number;
      championTransform: number;
      consumablesPurchased: number;
      challenges: any;
      damageDealtToBuildings: number;
      damageDealtToObjectives: number;
      damageDealtToTurrets: number;
      damageSelfMitigated: number;
      deaths: number;
      detectorWardsPlaced: number;
      doubleKills: number;
      dragonKills: number;
      eligibleForProgression: boolean;
      enemyMissingPings: number;
      enemyVisionPings: number;
      firstBloodAssist: boolean;
      firstBloodKill: boolean;
      firstTowerAssist: boolean;
      firstTowerKill: boolean;
      gameEndedInEarlySurrender: boolean;
      gameEndedInSurrender: boolean;
      holdPings: number;
      getBackPings: number
      goldEarned: number;
      goldSpent: number;
      individualPosition: string;
      inhibitorKills: number;
      inhibitorsTakedowns: number;
      inhibitorsLost: number;
      item0: number;
      item1: number;
      item2: number;
      item3: number;
      item4: number;
      item5: number;
      item6: number;
      itemsPurchased: number;
      killingSprees: number;
      kills: number;
      lane: string;
      largestCriticalStrike: number;
      largestKillingSpree: number;
      largestMultiKill: number;
      longestTimeSpentLiving: number;
      magicDamageDealt: number;
      magicDamageDealtToChampions: number;
      magicDamageTaken: number;
      missions: any;
      neutralMinionsKilled: number;
      needVisionKills: number;
      nexusKills: number;
      nexusTakedowns: number;
      nexusLost: number;
      objectivesStolen: number;
      objectivesStolenAssists: number;
      onMyWayPings: number;
      participantId: number;
      playerScore0: number;
      playerScore1: number;
      playerScore2: number;
      playerScore3: number;
      playerScore4: number;
      playerScore5: number;
      playerScore6: number;
      playerScore7: number;
      playerScore8: number;
      playerScore9: number;
      playerScore10: number;
      playerScore11: number;
      pentaKills: number;
      perks: any;
      physicalDamageDealt: number;
      physicalDamageDealtToChampions: number;
      physicalDamageTaken: number;
      placement: number;
      pushPings: number;
      profileIcon: number;
      puuid: string;
      quadraKills: number;
      riotIdGameName: string;
      riotIdName: string;
      riotIdTagline: string;
      role: string;
      spell1Casts: number;
      spell2Casts: number;
      spell3Casts: number;
      spell4Casts: number;
      summonerLevel: number;
      summonerName: string;
      teamId: number;
      teamPosition: string;
      timePlayed: number;
      totalDamageDealt: number;
      totalDamageDealtToChampions: number;
      totalDamageShieldedOnTeammates: number;
      totalDamageTaken: number;
      totalHeal: number;
      totalHealsOnTeammates: number;
      totalMinionsKilled: number;
      tripleKills: number;
      visionScore: number;
      win: boolean;
    }>;
    platformId: string;
    queueId: number;
    teams: Array<{
      bans: Array<{
        championId: number;
        pickTurn: number;
      }>;
      objectives: {
        baron: ObjectiveDto;
        champion: ObjectiveDto;
        dragon: ObjectiveDto;
        inhibitor: ObjectiveDto;
        riftHerald: ObjectiveDto;
        tower: ObjectiveDto;
      };
      teamId: number;
      win: boolean;
    }>;
    tournamentCode: string;
  };
}

export async function getLolMatchInfo(matchId: string): Promise<MatchDto> {
  return await riotApi(`/lol/match/v5/matches/${matchId}`);
}

interface LeagueEntryDTO {
  leagueId: string;
  summonerId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export async function getLolEntries(puuid: string): Promise<LeagueEntryDTO[]> {
  return await lolApi(`/lol/league/v4/entries/by-puuid/${puuid}`);
}

export async function getTftEntries(puuid: string): Promise<LeagueEntryDTO[]> {
  return await tftApi(`/tft/league/v1/by-puuid/${puuid}`, 'kr');
}

export async function getLatestVersion() {
  const resp = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
  const versions = await resp.json() as string[];

  const version = versions[0];
  return version;
}

export async function getLolCharacterIconUrl(championName: string): Promise<string> {
  const version = await getLatestVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
}

export async function getTftCharacterIcons(version: string) {
  const resp = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/tft-champion.json`);
  const champions = await resp.json() as {
    data: Record<string, {
      id: string;
      name: string;
      tier: number;
      cost: number;
      image: RiotAPITypes.DDragon.DDragonImageDTO;
    }>
  };

  return Object.values(champions.data).map(x => ({
    ...x,
    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/tft-champion/${x.image.full}`,
  }));
}

export async function getTftItemIcons(version: string) {
  const resp = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/tft-item.json`);
  const items = await resp.json() as {
    data: Record<string, {
      id: string;
      name: string;
      image: RiotAPITypes.DDragon.DDragonImageDTO;
    }>
  };

  return Object.values(items.data).map(x => ({
    ...x,
    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/tft-item/${x.image.full}`,
  }));
}

export async function getTftTraitIcons(version: string) {
  const resp = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/tft-trait.json`);
  const traits = await resp.json() as {
    data: Record<string, {
      id: string;
      name: string;
      image: RiotAPITypes.DDragon.DDragonImageDTO;
    }>
  };

  return Object.values(traits.data).map(x => ({
    ...x,
    imageUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/tft-trait/${x.image.full}`,
  }));
}

export async function getTftTacticianIconUrl(version: string, id: number) {
  const resp = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/tft-tactician.json`);
  const tacticians = await resp.json() as {
    data: Record<string, {
      id: string;
      name: string;
      image: RiotAPITypes.DDragon.DDragonImageDTO;
    }>
  };

  const tactician = Object.values(tacticians.data).find(x => x.id === id.toString());
  if (!tactician) {
    return null;
  }

  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/tft-tactician/${tactician?.image.full}`;
}
