import { readFile } from 'fs/promises';

const PATH = '/home/chan/services/minecraft';

const USER_CACHE = `${PATH}/usercache.json`;
const USER_STATS = `${PATH}/world/stats/`;

export interface User {
  name: string;
  uuid: string;
  stats: UserStats;
}

export type UserStats = Partial<{
  "minecraft:killed": Record<string, number>;
  "minecraft:custom": Record<string, number>;
  "minecraft:crafted": Record<string, number>;
  "minecraft:dropped": Record<string, number>;
  "minecraft:broken": Record<string, number>;
  "minecraft:mined": Record<string, number>;
  "minecraft:used": Record<string, number>;
  "minecraft:picked_up": Record<string, number>;
  "minecraft:killed_by": Record<string, number>;
}>;


export async function getUserList(): Promise<User[]> {
  const data = await readFile(USER_CACHE, 'utf-8');
  const users = JSON.parse(data);
  const result = await Promise.all(users.map(async (user: Omit<User, 'stats'>) => {
    const data = await readFile(`${USER_STATS}${user.uuid}.json`, 'utf-8');
    const { stats } = JSON.parse(data);
    return {
      ...user,
      stats,
    };
  }));

  return result;
}