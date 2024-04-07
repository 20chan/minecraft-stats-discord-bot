import * as R from 'remeda';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import fs from 'fs/promises';
import { UserResult } from './score';
import { Transaction } from '@prisma/client';
import { User } from 'discord.js';

export async function renderMcStats(users: UserResult[], user: UserResult) {
  const width = 800;
  const height = 400;

  const canvas = new ChartJSNodeCanvas({ width, height });

  const totalScoreSorted = users.sort((a, b) => b.totalScore - a.totalScore);

  const configuration: ChartConfiguration = {
    type: 'bar' as const,
    data: {
      labels: totalScoreSorted.map(x => x.name),
      datasets: [
        {
          label: 'total',
          data: totalScoreSorted.map(x => x.totalScore),
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          borderColor: 'rgb(255, 255, 255)',
          borderWidth: 1,
        },
        {
          label: 'ore',
          data: totalScoreSorted.map(x => x.scores.ore),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1,
        },
        {
          label: 'mob',
          data: totalScoreSorted.map(x => x.scores.mob),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1,
        },
        {
          label: 'explore',
          data: totalScoreSorted.map(x => x.scores.explore),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgb(153, 102, 255)',
          borderWidth: 1,
        },
        {
          label: 'farm',
          data: totalScoreSorted.map(x => x.scores.farm),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1,
        }
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: 'white',
            font: {
              family: 'Minecraft',
              size: 20,
            }
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: (ctx) => ctx.index === users.findIndex(x => x.name === user.name) ? 'yellow' : 'white',
            font: {
              size: 20,
              family: 'Minecraft',
              weight: 'bold',
              lineHeight: 1,
            },
            padding: 0,
          },
        },
        y: {
          type: 'logarithmic',
          ticks: {
            color: 'white',
            font: {
              family: 'Minecraft',
            },
          },
        },
      },
    }
  }

  const buffer = await canvas.renderToBuffer(configuration);
  await fs.writeFile(`./imgs/${user.name}.png`, buffer, 'base64');
}

export async function renderTransactions(name: string, userEntities: User[], transactions: Transaction[], ty: 'logarithmic' | 'linear') {
  const width = 800;
  const height = 400;

  const canvas = new ChartJSNodeCanvas({ width, height });

  const formatDate = (x: Date) => {
    const month = x.getMonth() + 1;
    const date = x.getDate();
    return `${month}/${date}`;
  }

  const colors = [
    '#e06c75',
    '#98c379',
    '#e5c07b',
    '#61afef',
    '#c678dd',
    '#56b6c2',
    '#dcdfe4',
    '#f09862',
    '#e06cdb',
  ];

  const users = R.groupBy(transactions, x => x.userId);

  const labels = (
    Object.keys(users).length === 1
      ? transactions.map(x => formatDate(x.createdAt))
      : R.maxBy(Object.values(users), x => x.length)?.map(x => '') || []
  );
  const datasets = Object.entries(users).map(([userId, transactions], i) => {
    return {
      label: userEntities.find(x => x.id === userId)?.displayName || 'unknown',
      data: transactions.map(x => x.amount),
      backgroundColor: `${colors[i % colors.length]}80`,
      borderColor: colors[i % colors.length],
      borderWidth: 1,
    }
  });

  const configuration: ChartConfiguration = {
    type: 'line' as const,
    data: {
      labels,
      datasets,
    },
    options: {
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        x: {
          ticks: {
            color: 'white',
            font: {
              size: 14,
              lineHeight: 1,
            },
            padding: 0,
          },
        },
        y: {
          type: ty,
          ticks: {
            color: 'white',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.3)',
          },
        },
      },
    }
  }

  const buffer = await canvas.renderToBuffer(configuration);
  const fileName = `./imgs/transactions/${name}.png`;
  await fs.writeFile(fileName, buffer, 'base64');
  return fileName;
}

export async function renderRank(entries: Array<{
  name: string;
  value: number;
}>, name: string) {
  const width = 800;
  const height = 400;

  const canvas = new ChartJSNodeCanvas({ width, height });

  entries.sort((a, b) => b.value - a.value);

  const colors = [
    '#e06c75',
    '#98c379',
    '#e5c07b',
    '#61afef',
    '#c678dd',
    '#56b6c2',
    '#dcdfe4',
    '#f09862',
    '#e06cdb',
  ];

  const labels = entries.map(x => x.name);
  const datasets = [
    {
      label: '돈',
      data: entries.map(x => x.value),
      backgroundColor: colors[0],
      borderColor: colors[0],
      borderWidth: 1,
    },
  ];

  const configuration: ChartConfiguration = {
    type: 'bar' as const,
    data: {
      labels,
      datasets,
    },
    options: {
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        x: {
          ticks: {
            color: 'white',
            font: {
              size: 14,
              lineHeight: 1,
            },
            padding: 0,
          },
        },
        y: {
          ticks: {
            color: 'white',
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.3)',
          },
        },
      },
    }
  }

  const buffer = await canvas.renderToBuffer(configuration);
  const fileName = `./imgs/transactions/${name}.png`;
  await fs.writeFile(fileName, buffer, 'base64');
  return fileName;
}
