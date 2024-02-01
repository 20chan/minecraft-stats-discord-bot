import * as discord from 'discord.js';
import * as R from 'remeda';
import { db } from '../db';

const initMoney = 10000;
const rerollPrice = 500;
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
      } else if (subcommand === '송금') {
        if (interaction.user.id !== '268210869341650945') {
          await interaction.editReply({
            content: '권한이 없습니다.',
          });
          return;
        }

        const id = interaction.options.getString('id', true);
        const amount = interaction.options.getInteger('amount', true);

        const target = await client.users.fetch(id);
        if (!target) {
          await interaction.editReply({
            content: '유저를 찾을 수 없습니다.',
          });
          return;
        }

        await charge(id, amount);
        await interaction.editReply({
          content: `${target.username}님에게 ${amount}${currencyName}을 지급했습니다.`,
        });
      } else if (subcommand === '일일보상') {
        const daily = await db.dailyReward.findUnique({
          where: { id: interaction.user.id },
        });

        const now = new Date();

        if (daily && compareDate(daily.updatedAt, now)) {
          await interaction.editReply({
            content: '일일 보상을 이미 받았습니다',
          });
          return;
        }

        const amount = randomDaily();
        const newMoney = await charge(interaction.user.id, amount);

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
          content: (
            amount === 1
              ? `${amount}${currencyName} 획득 ㅋㅋㅋ 어떻게 ㅋㅋㅋㅋ 현재 ${newMoney}${currencyName}`
              : amount <= 5
                ? `${amount}${currencyName} 획득..? 운이 지지리도 없으시네요... 현재 ${newMoney}${currencyName}`
                : amount >= 10000
                  ? `${amount}${currencyName} 획득!!!! 이거 확률 조작 의심해봐야!!!! 현재 ${newMoney}${currencyName}`
                  : `${amount}${currencyName} 획득! 현재 ${newMoney}${currencyName}`
          )
        });
      } else if (subcommand === '리롤') {
        const buttons = [1, 2, 5, 10].map(x => (
          new discord.MessageButton()
            .setCustomId(`reroll_${x}`)
            .setLabel(`x${x}`)
            .setStyle(x <= 2 ? 'PRIMARY' : 'DANGER')
        ));

        await interaction.editReply({
          content: `${rerollPrice}${currencyName}에 리롤을 하시겠습니까? (하루 10번 가능)\n배율은 가격과 받는 보상을 배율대로 증가시킵니다.`,
          components: [
            new discord.MessageActionRow().addComponents(...buttons),
          ],
        });

        const message = await interaction.fetchReply() as discord.Message<boolean>;
        const collector = interaction.channel!.createMessageComponentCollector({
          componentType: 'BUTTON',
          message,
          time: 1000 * 60 * 60 * 24,
        });

        async function collectHandler(interaction: discord.ButtonInteraction) {
          const customId = interaction.customId;
          const multiplier = parseInt(customId.split('_')[1], 10);

          const price = multiplier * rerollPrice;

          const daily = await db.dailyReroll.findUnique({
            where: { id: interaction.user.id },
          });

          const now = new Date();

          if (daily && compareDate(daily.updatedAt, now)) {
            if (daily.count >= 10) {
              await interaction.reply({
                content: '리롤은 하루에 10번만 가능합니다.',
              });
              return;
            }
          }

          const currentMoney = (await db.money.findUnique({
            where: { id: interaction.user.id },
          }))?.amount ?? initMoney;

          await db.dailyReroll.upsert({
            where: { id: interaction.user.id },
            update: {
              count: {
                increment: 1,
              },
              updatedAt: new Date(),
            },
            create: {
              id: interaction.user.id,
              count: 1,
              updatedAt: new Date(),
            },
          })

          if (currentMoney < price) {
            await interaction.reply({
              content: `잔고 ${currentMoney}${currencyName}이 리롤 비용 ${price}${currencyName}보다 적습니다.`,
            });
            return;
          }

          const amount = randomDaily() * multiplier;
          const newMoney = await charge(interaction.user.id, amount - price);

          const pre = `${interaction.user.username}님의 ${price}${currencyName}어치 배율 x${multiplier} 리롤 결과\n`;
          await interaction.reply({
            content: (
              amount <= 10
                ? `${pre}고작 ${amount}${currencyName} 획득하셨는데 이러려고 ${price}${currencyName}이나 내셨나요? 현재 ${newMoney}${currencyName}`
                : amount <= price
                  ? `${pre}${amount}${currencyName} 획득..? 손해좀 보셨네요.. 현재 ${newMoney}${currencyName}`
                  : amount <= 1000
                    ? `${pre}${amount}${currencyName} 획득! 나쁘지 않네요. 현재 ${newMoney}${currencyName}`
                    : amount >= 10000
                      ? `${pre}${amount}${currencyName} 획득!!!! 이거 확률 조작 의심해봐야!!!! 현재 ${newMoney}${currencyName}`
                      : `${pre}${amount}${currencyName} 획득! 현재 ${newMoney}${currencyName}`
            )
          });
        }

        collector.on('collect', collectHandler);
      }
    }
  } catch (error) {
    console.error(interaction);
    console.error(error);
    await interaction.reply({ content: '오류가 발생했습니다.' });
  }
}

async function startPredict(client: discord.Client, interaction: discord.CommandInteraction) {
  const title = interaction.options.getString('주제', true);
  const choices = interaction.options.getString('선택지', true).split(',').map(x => x.trim());

  if (choices.length >= 20) {
    await interaction.editReply({
      content: '선택지는 최대 20개까지 가능합니다.',
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
    const betChunk = R.chunk(betButtons, 5);
    const actionRows = betChunk.map(x => new discord.MessageActionRow().addComponents(...x));

    const endButton = new discord.MessageButton()
      .setCustomId(`betEnd_${entry.id}`)
      .setLabel('종료')
      .setStyle('DANGER');

    const completeButtons = [
      ...choices.map((x, i) => (
        new discord.MessageButton()
          .setCustomId(`betComplete_${entry.id}_${i}`)
          .setLabel(x)
          .setStyle('DANGER')
      )),
      new discord.MessageButton()
        .setCustomId(`betCancel_${entry.id}`)
        .setLabel('취소')
        .setStyle('SECONDARY'),
    ];
    const completeChunk = R.chunk(completeButtons, 5);
    const completeActionRows = completeChunk.map(x => new discord.MessageActionRow().addComponents(...x));

    const components = (
      prediction.completed
        ? []
        : prediction.ended
          ? [...completeActionRows]
          : [...actionRows, new discord.MessageActionRow().addComponents(endButton)]
    );

    try {
      await interaction.editReply({
        content: '새로운 예측!',
        embeds: embeds,
        components,
      });
    } catch (error) {
      console.error(error);
      await message.edit({
        content: '새로운 예측!',
        embeds: embeds,
        components,
      });
    }
  };

  const interval = setInterval(updateBetMessage, 1000 * 60 * 5);

  await updateBetMessage();

  const collector = interaction.channel!.createMessageComponentCollector({
    componentType: 'BUTTON',
    message,
    time: 1000 * 60 * 60 * 24,
  });

  const selectCollector = interaction.channel!.createMessageComponentCollector({
    componentType: 'SELECT_MENU',
    message,
    time: 1000 * 60 * 60 * 24,
  });

  async function collectHandler(interaction: discord.ButtonInteraction | discord.SelectMenuInteraction) {
    const uesrId = interaction.user.id;
    const customId = interaction.customId;

    if (customId.startsWith('bet_') || customId.startsWith('betselect_')) {
      const get = () => {
        if (interaction.isButton()) {
          const [_, id, choice] = interaction.customId.split('_');
          const predictionId = parseInt(id, 10);
          const choiceId = parseInt(choice, 10);

          return {
            predictionId,
            choiceId,
          };
        } else if (interaction.isSelectMenu()) {
          const [_, id] = interaction.customId.split('_');
          const predictionId = parseInt(id, 10);
          const choiceId = parseInt(interaction.values[0]);

          return {
            predictionId,
            choiceId,
          };
        }

        throw new Error('what?');
      }

      const {
        predictionId,
        choiceId,
      } = get();

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
        content: `얼마를 거시나요? 누를때마다 베팅액이 추가됩니다.\n한 번 베팅 이후 다른 선택지에는 베팅할 수 없습니다.\n**자신이 베팅한 금액의 최대 3배만큼만 획득할 수 있습니다.** 쫄보배팅 방지용`,
        ephemeral: true,
        fetchReply: true,
        components: [
          new discord.MessageActionRow()
            .addComponents(
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
              new discord.MessageButton()
                .setCustomId(`betAmount_${predictionId}_${choiceId}_3000`)
                .setLabel('3000')
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

        const bets = await db.bet.findMany({
          where: { predictionId, userId: interaction.user.id },
        });

        if (bets.find(x => x.choiceIndex !== choiceIndex)) {
          await interaction.reply({
            content: '이미 다른 선택지에 베팅하셨습니다.',
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
    } else if (customId.startsWith('betCancel')) {
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
          content: '내가 만든 예측만 취소할 수 있습니다.',
          ephemeral: true,
        });
        return;
      }

      await db.prediction.update({
        where: { id: predictionId },
        data: {
          completed: true,
        }
      });

      const bets = await db.bet.findMany({
        where: { predictionId },
      });

      const userIds = R.uniq(bets.map(x => x.userId));
      const usersAmounts = userIds.map(userId => ({
        userId,
        amount: Math.round(
          bets
            .filter(x => x.userId === userId)
            .reduce((acc, x) => acc + x.amount, 0)
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

      await interaction.reply({
        content: '예측이 취소되었습니다.',
        ephemeral: true,
      });

      await updateBetMessage();
      clearInterval(interval);
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
      }))
        .map(x => ({
          userId: x.userId,
          amount: Math.min((bets.find(y => x.userId === y.userId)?.amount ?? 0) * 3, x.amount),
        }))
        .filter(x => x.amount !== 0);

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
      const users = await Promise.all(usersAmounts.map(x => client.users.fetch(x.userId)));
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
      clearInterval(interval);
    }
  };

  collector.on('collect', collectHandler);
  selectCollector.on('selectCollector', collectHandler);
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

function compareDate(a: Date, b: Date) {
  if (a.getDate() !== b.getDate()) {
    return false;
  }
  if (a.getMonth() !== b.getMonth()) {
    return false;
  }
  if (a.getFullYear() !== b.getFullYear()) {
    return false;
  }
  return true;
}

async function charge(id: string, amount: number) {
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

  return currentMoney + amount;
}

export function randomDaily(): number {
  let x = Math.pow(Math.random(), 80) * 30000;
  if (x < 1000) {
    x = Math.pow(Math.random(), 1.5) * 1000;
  }

  return Math.max(1, Math.floor(x));
}