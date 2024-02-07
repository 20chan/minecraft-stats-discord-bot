import { db } from './src/db';
import { renderTransactions } from './src/render';

const id = '1028883090732503110';

async function main() {
  const now = new Date();
  const duration = 1;

  const transactions = await db.transaction.findMany({
    where: {
      createdAt: {
        gte: new Date(now.getTime() - 1000 * 60 * 60 * 24 * duration),
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  await renderTransactions('recent_3', [], transactions);
}

main();
