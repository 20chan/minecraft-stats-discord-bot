import { db } from './src/db';
import { renderTransactions } from './src/render';

const id = '1028883090732503110';

async function main() {
  const transactions = await db.transaction.findMany({
    where: {
      userId: id,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  await renderTransactions(id, transactions);
}

main();
