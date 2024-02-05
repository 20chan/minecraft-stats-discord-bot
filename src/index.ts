import * as discord from 'discord.js';
import dotenv = require('dotenv');
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

dotenv.config();

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
    .addStringOption(option => option.setName('url').setDescription('메시지 url')),
  new SlashCommandBuilder()
    .setName('베팅')
    .setDescription('예측 베팅')
    .addSubcommand(subcommand => subcommand
      .setName('시작')
      .setDescription('새로운 예측을 시작합니다')
      .addStringOption(option => option.setName('주제').setDescription('예측 주제').setRequired(true))
      .addStringOption(option => option.setName('선택지').setDescription('선택지를 쉼표로 구분해서 입력하세요').setRequired(true))
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
      .setName('기록')
      .setDescription('내 코인 기록 그래프 보기')
      .addStringOption(option => option.setName('id').setDescription('id').setRequired(false))
    )
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
].map(x => x.toJSON());

async function main() {
  console.log(commands.map(x => x.name));

  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) {
      return;
    }
    try {
      if (interaction.commandName === 'mcstats') {
        await handleMcstats(client, interaction);
      } else if (interaction.commandName === '명언') {
        await handleQuote(client, interaction)
      } else if (interaction.commandName.startsWith('베팅') || interaction.commandName.startsWith('코인')) {
        await handleBet(client, interaction);
      } else if (interaction.commandName === 'tts') {
        await handleTTS(client, interaction);
      }
    } catch (error) {
      console.error(error);
      await interaction.channel?.send({ content: '오류가 발생했습니다' });
    }
  });
  client.on('error', console.error);


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

main()
