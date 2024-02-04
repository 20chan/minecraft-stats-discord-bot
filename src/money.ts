import { db } from './db';

export const initMoney = 10000;

export async function charge(id: string, amount: number) {
  const currentMoney = (await db.money.findUnique({
    where: { id: id },
  }))?.amount ?? initMoney;

  await db.money.upsert({
    where: { id: id },
    update: {
      amount: {
        increment: amount,
      },
    },
    create: {
      id: id,
      amount: initMoney + amount,
    },
  });

  await db.transaction.create({
    data: {
      userId: id,
      diff: amount,
      amount: currentMoney + amount,
    },
  });

  return currentMoney + amount;
}
