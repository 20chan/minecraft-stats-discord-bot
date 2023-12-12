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

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;
const GUILD_ID = process.env.GUILD_ID!;

const client = new discord.Client({
  intents: [
    8,
    discord.Intents.FLAGS.GUILDS,
    discord.Intents.FLAGS.GUILD_MEMBERS,
    discord.Intents.FLAGS.GUILD_MESSAGES,
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
      .setName('일일보상')
      .setDescription('일일 출석 보상 (100~1000) 랜덤 획득')
    ),
].map(x => x.toJSON());

async function main() {
  console.log(commands.map(x => x.name));
  const channel = await client.channels.fetch('1161658078266150973');
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
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '오류가 발생했습니다' });
    }
  });

  const rest = new REST({ version: '9' }).setToken(BOT_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) as any, { body: commands });
  await client.login(BOT_TOKEN);

  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch();
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