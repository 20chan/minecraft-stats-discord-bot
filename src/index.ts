import dotenv = require('dotenv');
dotenv.config();

import * as discord from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { SlashCommandBuilder } from "@discordjs/builders";
import { getUserList } from './mc';
import { postProcess } from './score';
import cron from 'node-cron';
import { saveSnapshot } from './snapshot';
import {
  handle as handleMcstats,
  reportSnapshot,
} from './commands/mcstats';
import {
  handle as handleQuote,
} from './commands/quote';
import {
  handle as handleBet,
} from './commands/bet';
import {
  handle as handleTTS,
} from './commands/tts';
import {
  handle as handleChat,
} from './commands/chat';
import {
  handle as handleLol,
} from './commands/lol';
import { logger } from './logger';
import { adminId } from './constants';
import { batch } from './lol';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;

const client = new discord.Client({
  intents: [
    8,
    discord.Intents.FLAGS.GUILDS,
    discord.Intents.FLAGS.GUILD_MEMBERS,
    discord.Intents.FLAGS.GUILD_MESSAGES,
    discord.Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName('mcstats')
    .setDescription('id 없이 쓰면 최근 일일 리포트')
    .addStringOption(option => option.setName('id').setDescription('마크id')),
  new SlashCommandBuilder()
    .setName('명언')
    .setDescription('명언 제조기')
    .addStringOption(option => option.setName('url').setDescription('메시지 url').setRequired(true)),
  new SlashCommandBuilder()
    .setName('베팅')
    .setDescription('예측 베팅')
    .addSubcommand(subcommand => subcommand
      .setName('시작')
      .setDescription('새로운 예측을 시작합니다')
      .addStringOption(option => option.setName('주제').setDescription('예측 주제').setRequired(true))
      .addStringOption(option => option.setName('선택지').setDescription('선택지를 쉼표로 구분해서 입력하세요').setRequired(true))
  )
    .addSubcommand(subcommand => subcommand
      .setName('종료')
      .setDescription('베팅 종료')
      .addIntegerOption(option => option.setName('id').setDescription('베팅 id').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
      .setName('결과')
      .setDescription('베팅 결과')
      .addIntegerOption(option => option.setName('id').setDescription('베팅 id').setRequired(true))
      .addIntegerOption(option => option.setName('index').setDescription('결과 인덱스').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
      .setName('취소')
      .setDescription('베팅 취소')
      .addIntegerOption(option => option.setName('id').setDescription('베팅 id').setRequired(true))
    ),
  new SlashCommandBuilder()
    .setName('코인')
    .setDescription('코인')
    .addSubcommand(subcommand => subcommand
      .setName('잔고')
      .setDescription('내 잔고 확인')
    )
    .addSubcommand(subcommand => subcommand
      .setName('랭킹')
      .setDescription('전체 코인 랭킹 확인')
    )
    .addSubcommand(subcommand => subcommand
      .setName('송금')
      .setDescription('어드민 전용^^7')
      .addStringOption(option => option.setName('id').setDescription('id').setRequired(true))
      .addIntegerOption(option => option.setName('amount').setDescription('amount').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
      .setName('일일보상')
      .setDescription('일일 출석 보상 (1~30000) 랜덤 획득')
    )
    .addSubcommand(subcommand => subcommand
      .setName('리롤')
      .setDescription('500원 지불하고 일일 출석 보상 (1~30000) 한번 더 받기, 하루 10번 제한')
    )
    .addSubcommand(subcommand => subcommand
      .setName('스틸')
      .setDescription('상대에게 1000원을 주고, 내 전재산 중 1000원만큼의 비율을 상대방 전재산 비율로 도박을 해서 돈을 뺏어온다, 하루 10번 제한')
      .addUserOption(option => option.setName('target').setDescription('target').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
      .setName('기록')
      .setDescription('내 코인 기록 그래프 보기')
      .addStringOption(option => option.setName('id').setDescription('id').setRequired(false))
    )
    .addSubcommand(subcommand => subcommand
      .setName('최근기록')
      .setDescription('모두의 최근 코인 기록 그래프 보기')
      .addStringOption(option => option.setName('기간').setDescription('얼마나?').addChoices(
        { name: '1일', value: '1' },
        { name: '3일', value: '3' },
        { name: '7일', value: '7' },
      ).setRequired(false))
      .addStringOption(option => option.setName('type').setDescription('그래프 y축 타입').addChoices(
        { name: 'linear', value: 'linear' },
        { name: 'logarithmic', value: 'logarithmic' },
      ).setRequired(false))
    )
  ,
  new SlashCommandBuilder()
    .setName('again')
    .setDescription('마지막으로 한 리롤 한번 더')
  ,
  new SlashCommandBuilder()
    .setName('tts')
    .setDescription('봉칠표 tts')
    .addSubcommand(subcommand => subcommand
      .setName('join')
      .setDescription('채널 참가')
    )
    .addSubcommand(subcommand => subcommand
      .setName('voice')
      .setDescription('set actor_id')
      .addStringOption(option => option.setName('actor_id').setDescription('actor_id').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
      .setName('tone')
      .setDescription('tone')
      .addStringOption(option => option.setName('tone').setDescription('tone').addChoices(
        { name: '1', value: '1' },
        { name: '2', value: '2' },
        { name: '3', value: '3' },
        { name: '4', value: '4' },
      ).setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
      .setName('play')
      .setDescription('음성 채널에서 tts 재생')
      .addStringOption(option => option.setName('text').setDescription('재생할 텍스트').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
      .setName('leave')
      .setDescription('채널 나가기')
    ),
  new SlashCommandBuilder()
    .setName('chat')
    .setDescription('스레드 만들어서 챗봇과 대화하기'),
  new SlashCommandBuilder()
    .setName('롤')
    .setDescription('롤 전적 알리미')
    .addSubcommand(subcommand => subcommand
      .setName('등록')
      .setDescription('롤 아이디 등록')
      .addStringOption(option => option.setName('name').setDescription('롤 아이디 (태그 포함, #KR1은 생략 가능)').setRequired(true))
      .addStringOption(option => option.setName('alias').setDescription('별칭 (메모)').setRequired(false))
    )
    .addSubcommand(subcommand => subcommand
      .setName('수정')
      .setDescription('등록된 롤 아이디 수정')
      .addStringOption(option => option.setName('name').setDescription('롤 아이디 (태그 포함, #KR1은 생략 가능)').setRequired(true))
      .addStringOption(option => option.setName('alias').setDescription('별칭 (메모)').setRequired(false))
    )
    .addSubcommand(subcommand => subcommand
      .setName('삭제')
      .setDescription('등록된 롤 아이디 삭제')
      .addStringOption(option => option.setName('name').setDescription('롤 아이디 (목록에 나온것과 동일하게)').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
      .setName('목록')
      .setDescription('등록된 롤 아이디 목록')
    )
].map(x => x.toJSON());

async function main() {
  console.log(commands.map(x => x.name));

  logger.info('bot started', { commands: commands.map(x => x.name) });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) {
      return;
    }
    logger.debug('interaction started', {
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
      },
      commandName: interaction.commandName,
      options: interaction.options.data.map(x => [x.name, x.value]),
    });
    try {
      if (interaction.commandName === 'mcstats') {
        await handleMcstats(client, interaction);
      } else if (interaction.commandName === '명언') {
        await handleQuote(client, interaction)
      } else if (interaction.commandName.startsWith('베팅') || interaction.commandName.startsWith('코인') || interaction.commandName === 'again') {
        await handleBet(client, interaction);
      } else if (interaction.commandName === 'tts') {
        await handleTTS(client, interaction);
      } else if (interaction.commandName === 'chat') {
        await handleChat(client, interaction);
      } else if (interaction.commandName === '롤') {
        await handleLol(client, interaction);
      }
    } catch (error) {
      logger.error('interaction error', error);
      await interaction.channel?.send({ content: '오류가 발생했습니다' });
    }
  });
  client.on('error', error => {
    logger.error('discord client error', { error });
  });


  client.on('ready', () => {
    const fn = async () => {
      const rest = new REST({ version: '9' }).setToken(BOT_TOKEN);

      for (const guildId of client.guilds.cache.map(x => x.id)) {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId) as any, { body: commands });

        try {
          const guild = await client.guilds.fetch(guildId);
          await guild.members.fetch();
        } catch { }
      }
    };

    fn();
  });
  await client.login(BOT_TOKEN);
}

cron.schedule('0 0 * * *', async () => {
  const resp = await reportSnapshot();

  const channel = await client.channels.fetch('1161658078266150973') as discord.TextChannel;
  if (resp) {
    channel.send(resp);
  }

  const users = await getUserList();
  const current = users.map(postProcess);
  await saveSnapshot(current);
});

cron.schedule('* * * * *', async () => {
  await batch();
});

main()
