import * as discord from 'discord.js';
import { logger } from '../logger';
import { db } from '../db';
import { ChatInput, SYSTEM_MESSAGE, chat } from '../chat';
import { translate } from '../translate';

export async function handle(client: discord.Client, interaction: discord.CommandInteraction) {
  await interaction.deferReply({});

  logger.info('chat.started', {
    user: {
      id: interaction.user.id,
      username: interaction.user.username,
    },
  });

  const channel = interaction.channel;
  if (channel?.type !== 'GUILD_TEXT') {
    interaction.editReply('서버 텍스트 채널에서 사용해주세요');
    return;
  }

  const thread = await channel.threads.create({
    name: `${interaction.user.username}님이 생성한 대화`,
  });

  logger.info('chat.thread.created', {
    user: {
      id: interaction.user.id,
      username: interaction.user.username,
    },
    threadId: thread.id,
  });

  await db.chatHistory.create({
    data: {
      id: thread.id,
      records: JSON.stringify([
        {
          role: 'system',
          content: SYSTEM_MESSAGE,
        },
      ]),
    },
  });

  await interaction.editReply(`대화가 시작되었습니다. ${thread.toString()}`);
  await thread.send('저를 멘션해서 말을 걸어주세요.');

  const collector = thread.createMessageCollector({
    filter: message => !message.author.bot && message.mentions.has(client.user!.id),
  });

  collector.on('collect', async message => {
    const entry = await db.chatHistory.findUnique({ where: { id: thread.id } });
    const records = JSON.parse(entry?.records ?? '[]') as ChatInput[];

    logger.info('chat.message', {
      user: {
        id: message.author.id,
        username: message.author.username,
      },
      threadId: thread.id,
      content: message.content,
    });

    const reply = await message.reply({
      content: '> *입력된 프롬프트 영어로 번역중...*',
    });

    const content = await translate('EN', message.content);
    records.push({
      role: 'user',
      content,
    });

    await reply.edit('> *AI 응답을 기다리는 중...*',);

    const resp = await chat(records);
    records.push({
      role: 'assistant',
      content: resp,
    });

    await db.chatHistory.update({
      where: { id: thread.id },
      data: {
        records: JSON.stringify(records),
      },
    });

    await reply.edit('> *AI 응답을 한국어로 번역중...*',);

    const translated = await translate('KO', resp);

    logger.info('chat.message.end', {
      user: {
        id: message.author.id,
        username: message.author.username,
      },
      threadId: thread.id,
      input: {
        original: message.content,
        translated: content,
      },
      output: {
        original: resp,
        translated,
      },
    });

    await reply.edit(translated);
  });
}