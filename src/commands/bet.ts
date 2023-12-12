import * as discord from 'discord.js';
import * as R from 'remeda';
import { db } from '../db';

const initMoney = 10000;
const currencyName = '코인';

export async function handle(client: discord.Client, interaction: discord.CommandInteraction) {
  try {

    if (interaction.commandName === '베팅') {
      await interaction.deferReply({});
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === '시작') {
        await startPredict(client, interaction);
      }
    } else if (interaction.commandName === '코인') {
      await interaction.deferReply({});
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === '잔고') {
        const money = await db.money.findUnique({
          where: { id: interaction.user.id },
        });

        await interaction.editReply({
          content: `당신의 잔고는... ${money?.amount ?? initMoney} ${currencyName}입니다.\n돈을 존나 탕진했다구요? 다 떨어졌다구요? DM으로 연락부탁드립니다.`,
        });
      } else if (subcommand === '랭킹') {
        const moneys = await db.money.findMany({
          orderBy: { amount: 'desc' },
        });

        const users = await Promise.all(moneys.map(x => client.users.fetch(x.id)));
        const userNames = users.map(x => x.username);
        const amounts = moneys.map(x => x.amount);
        await interaction.editReply({
          content: '잔고 랭킹',
          embeds: [
            new discord.MessageEmbed()
              .setTitle('잔고')
              .setDescription('')
              .addFields(
                amounts.map((x, i) => ({
                  name: userNames[i],
                  value: `${x}${currencyName}`,
                  inline: true,
                })),
              ),
          ],
        });
      } else if (subcommand === '일일보상') {
        const daily = await db.dailyReward.findUnique({
          where: { id: interaction.user.id },
        });

        const now = new Date();

        if (daily && daily.updatedAt.getDate() === now.getDate() && daily.updatedAt.getMonth() === now.getMonth() && daily.updatedAt.getFullYear() === now.getFullYear()) {
          await interaction.editReply({
            content: '일일 보상을 이미 받았습니다',
          });
          return;
        }

        const amount = Math.round(Math.random() * 900 + 100);
        const currentMoney = (await db.money.findUnique({
          where: { id: interaction.user.id },
        }))?.amount ?? initMoney;

        await db.money.upsert({
          where: { id: interaction.user.id },
          update: {
            amount: {
              increment: amount,
            },
          },
          create: {
            id: interaction.user.id,
            amount: initMoney + amount,
          },
        });

        await db.dailyReward.upsert({
          where: { id: interaction.user.id },
          update: {
            amount,
            updatedAt: new Date(),
          },
          create: {
            id: interaction.user.id,
            amount,
            updatedAt: new Date(),
          },
        });

        await interaction.editReply({
          content: `${amount}${currencyName} 획득! 현재 ${currentMoney + amount}${currencyName}`,
        });
      }
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '오류가 발생했습니다.' });
  }
}

async function startPredict(client: discord.Client, interaction: discord.CommandInteraction) {
  const title = interaction.options.getString('주제', true);
  const choices = interaction.options.getString('선택지', true).split(',').map(x => x.trim());

  if (choices.length > 5) {
    await interaction.editReply({
      content: '선택지는 최대 5개까지 가능합니다.',
    });
    return;
  }

  const message = await interaction.fetchReply() as discord.Message<boolean>;

  const entry = await db.prediction.create({
    data: {
      title,
      valueSerialized: JSON.stringify(choices),
      createdAt: new Date(),
      userId: interaction.user.id,
    },
  });

  const updateBetMessage = async () => {
    const prediction = await db.prediction.findUnique({
      where: { id: entry.id },
    });
    if (!prediction) {
      return;
    }
    const bets = await db.bet.findMany({
      where: { predictionId: entry.id },
    });
    const betsByChoice = bets.reduce((acc, bet) => {
      acc[bet.choiceIndex] = (acc[bet.choiceIndex] ?? 0) + bet.amount;
      return acc;
    }, [...new Array(choices.length)].map(() => 0));
    const total = betsByChoice.reduce((acc, x) => acc + x, 0);

    const betsSortedByChoice = R.sortBy(bets, x => x.choiceIndex, x => -x.amount);
    const userNames = await Promise.all(betsSortedByChoice.map(x => client.users.fetch(x.userId).then(x => x.username)));

    const creatorUserName = (await client.users.fetch(prediction.userId)).username;
    const descriptionEnabled = `${creatorUserName}님이 시작한 베팅이 진행중입니다! 선택지를 눌러 베팅하세요`;
    const descriptionEnded = `${creatorUserName}님이 시작한 베팅이 끝났습니다! 결과를 기다려주세요`;
    const descriptionCompleted = `${creatorUserName}님이 시작한 베팅이 종료되었습니다!`;

    const embeds = [
      new discord.MessageEmbed()
        .setTitle(prediction.completed ? `[종료] ${title}` : prediction.ended ? `[결과대기중] ${title}` : `[진행중] ${title}`)
        .setDescription(prediction.completed ? descriptionCompleted : prediction.ended ? descriptionEnded : descriptionEnabled)
        .addFields(
          choices.map((x, i) => ({
            name: x,
            value: `${betsByChoice[i]}${currencyName} (${total === 0 ? 0 : Math.round(betsByChoice[i] / total * 100)}%)`,
            inline: true,
          })),
        ),
      new discord.MessageEmbed()
        .setTitle('베팅 현황')
        .setDescription('')
        .addFields(
          betsSortedByChoice.map((x, i) => ({
            name: userNames[i],
            value: `${choices[x.choiceIndex]}에 ${x.amount}${currencyName}`,
            inline: true,
          })),
        ),
    ];

    const betButtons = choices.map((x, i) => (
      new discord.MessageButton()
        .setCustomId(`bet_${entry.id}_${i}`)
        .setLabel(x)
        .setStyle('PRIMARY')
    ));
    const endButton = new discord.MessageButton()
      .setCustomId(`betEnd_${entry.id}`)
      .setLabel('종료')
      .setStyle('DANGER');

    const completeButtons = choices.map((x, i) => (
      new discord.MessageButton()
        .setCustomId(`betComplete_${entry.id}_${i}`)
        .setLabel(x)
        .setStyle('DANGER')
    ));

    const buttons = prediction.completed ? [] : prediction.ended ? completeButtons : [...betButtons, endButton];

    const row = new discord.MessageActionRow()
      .addComponents(...buttons);

    await interaction.editReply({
      content: '새로운 예측!',
      embeds: embeds,
      components: prediction.completed ? [] : [row],
    });
  };

  await updateBetMessage();

  const collector = interaction.channel!.createMessageComponentCollector({
    componentType: 'BUTTON',
    message,
    time: 1000 * 60 * 60 * 24,
  });

  collector.on('collect', async interaction => {
    const uesrId = interaction.user.id;
    const customId = interaction.customId;

    if (customId.startsWith('bet_')) {
      const [_, id, choice] = interaction.customId.split('_');
      const predictionId = parseInt(id, 10);
      const choiceId = parseInt(choice, 10);

      const prediction = await db.prediction.findUnique({
        where: { id: predictionId },
      });

      if (!prediction || prediction.ended || prediction.completed) {
        await interaction.reply({
          content: '이미 종료된 예측입니다.',
          ephemeral: true,
        });
        return;
      }

      const replayMessage = await interaction.reply({
        content: `얼마 베팅? 누를때마다 베팅액 추가`,
        ephemeral: true,
        fetchReply: true,
        components: [
          new discord.MessageActionRow()
            .addComponents(
              new discord.MessageButton()
                .setCustomId(`betAmount_${predictionId}_${choiceId}_10`)
                .setLabel('10')
                .setStyle('PRIMARY'),
              new discord.MessageButton()
                .setCustomId(`betAmount_${predictionId}_${choiceId}_100`)
                .setLabel('100')
                .setStyle('PRIMARY'),
              new discord.MessageButton()
                .setCustomId(`betAmount_${predictionId}_${choiceId}_500`)
                .setLabel('500')
                .setStyle('PRIMARY'),
              new discord.MessageButton()
                .setCustomId(`betAmount_${predictionId}_${choiceId}_1000`)
                .setLabel('1000')
                .setStyle('PRIMARY'),
            ),
        ],
      }) as discord.Message<boolean>;

      const collector = interaction.channel!.createMessageComponentCollector({
        componentType: 'BUTTON',
        message: replayMessage,
        time: 1000 * 60 * 60 * 24,
      });
      collector.on('collect', async interaction => {
        const [_, id, choiceId, amountRaw] = interaction.customId.split('_');
        const predictionId = parseInt(id, 10);
        const choiceIndex = parseInt(choiceId, 10);
        const amount = parseInt(amountRaw, 10);

        const prediction = await db.prediction.findUnique({
          where: { id: predictionId },
        });

        if (!prediction || prediction.ended || prediction.completed) {
          await interaction.reply({
            content: '이미 종료된 예측입니다.',
            ephemeral: true,
          });
          return;
        }

        const currentMoney = (await db.money.findUnique({
          where: { id: interaction.user.id },
        }))?.amount ?? initMoney;

        if (currentMoney < amount) {
          await interaction.reply({
            content: `${currencyName}이 부족합니다.`,
            ephemeral: true,
          });
          return;
        }

        await db.money.upsert({
          where: { id: interaction.user.id },
          update: {
            amount: {
              decrement: amount,
            },
          },
          create: {
            id: interaction.user.id,
            amount: initMoney - amount,
          },
        });

        await upsertBet(interaction.user.id, predictionId, choiceIndex, amount);

        await updateBetMessage();

        // delelte after 1 sec
        await interaction.reply({
          content: `${choices[choiceIndex]}에 ${amount}${currencyName} 베팅 완료, 현재 ${currentMoney - amount}${currencyName} 남음`,
          ephemeral: true,
          fetchReply: true,
        });
      });
    } else if (customId.startsWith('betEnd_')) {
      const predictionId = parseInt(customId.split('_')[1], 10);
      const prediction = await db.prediction.findFirst({
        where: { id: predictionId },
      });

      if (!prediction) {
        await interaction.reply({
          content: '버근가?',
          ephemeral: true,
        });
        return;
      }

      if (prediction.userId !== interaction.user.id) {
        await interaction.reply({
          content: '내가 만든 예측만 종료할 수 있습니다.',
          ephemeral: true,
        });
        return;
      }

      await db.prediction.update({
        where: { id: predictionId },
        data: {
          ended: true,
        },
      });

      await interaction.reply({
        content: '베팅이 종료되었습니다. 결과가 나오면 빨간색 버튼을 눌러 결과를 선택해주세요',
        ephemeral: true,
      });

      await updateBetMessage();
    } else if (customId.startsWith('betComplete_')) {
      const [_, predictionIdRaw, choiceIndexRaw] = interaction.customId.split('_');
      const predictionId = parseInt(predictionIdRaw, 10);
      const choiceIndex = parseInt(choiceIndexRaw, 10);

      const prediction = await db.prediction.findFirst({
        where: { id: predictionId },
      });

      if (!prediction) {
        await interaction.reply({
          content: '버근가?',
          ephemeral: true,
        });
        return;
      }

      if (prediction.userId !== interaction.user.id) {
        await interaction.reply({
          content: '내가 만든 예측만 결과를 선택할 수 있습니다.',
          ephemeral: true,
        });
        return;
      }

      const bets = await db.bet.findMany({
        where: { predictionId },
      });

      const correctAmount = bets.filter(x => x.choiceIndex === choiceIndex).reduce((acc, x) => acc + x.amount, 0);
      const wrongAmount = bets.filter(x => x.choiceIndex !== choiceIndex).reduce((acc, x) => acc + x.amount, 0);

      const rate = (correctAmount + wrongAmount) / correctAmount;

      const userIds = R.uniq(bets.map(x => x.userId));
      const usersAmounts = userIds.map(userId => ({
        userId,
        amount: Math.round(
          bets
            .filter(x => x.userId === userId)
            .reduce((acc, x) => acc + x.amount * (x.choiceIndex === choiceIndex ? rate : 0), 0)
        ),
      })).filter(x => x.amount !== 0);

      await Promise.all(usersAmounts.map(x => db.money.upsert({
        where: { id: x.userId },
        update: {
          amount: {
            increment: x.amount,
          },
        },
        create: {
          id: x.userId,
          amount: initMoney + x.amount,
        },
      })));

      await db.prediction.update({
        where: { id: predictionId },
        data: {
          completed: true,
        },
      });

      const resultDesc = (
        correctAmount === 0
          ? `### 예측에 성공한 사람이 없어 ${wrongAmount}${currencyName}이 모두 사라졌습니다.`
          : `### x${rate} 배율로 ${wrongAmount}${currencyName}이 분배됩니다.`
      );
      const users = await Promise.all(userIds.map(x => client.users.fetch(x)));
      const amountDesc = usersAmounts.map((x, i) => {
        if (x.amount > 0) {
          return `${users[i]}님이 ${x.amount}${currencyName} 획득`;
        } else if (x.amount === 0) {
          return `${users[i]}님은 ${currencyName} 변동 없음`;
        } else if (x.amount < 0) {
          return `${users[i]}님이 ${Math.round(-x.amount)}${currencyName} 잃음`;
        }
      }).join('\n');


      await interaction.reply({
        content: '예측 종료!',
        embeds: [
          new discord.MessageEmbed()
            .setTitle(`[예측 종료] ${title} 결과`)
            .setDescription(`\`${choices[choiceIndex]}\`이(가) 맞았습니다!\n${resultDesc}\n${amountDesc}`)
            .addFields(
              choices.map((x, i) => ({
                name: x,
                value: (
                  bets.filter(x => x.choiceIndex === i).length === 0
                    ? '..'
                    : bets.filter(x => x.choiceIndex === i).map(x => `<@${x.userId}> ${i === choiceIndex ? `+${x.amount}` : `${Math.round(-x.amount)}`}`).join('\n')
                ),
              })),
            )
        ],
      });

      await updateBetMessage();
    }
  });
}

async function upsertBet(userId: string, predictionId: number, choiceIndex: number, amount: number) {
  const bet = await db.bet.findFirst({
    where: {
      userId,
      predictionId,
      choiceIndex,
    },
  });

  if (!bet) {
    await db.bet.create({
      data: {
        userId,
        predictionId,
        choiceIndex,
        amount,
      },
    });
  } else {
    await db.bet.update({
      where: { id: bet.id },
      data: {
        amount: {
          increment: amount,
        },
      },
    });
  }
}