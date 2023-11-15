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
].map(x => x.toJSON());

async function main() {
  console.log(commands.map(x => x.name));
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) {
      return;
    }

    if (interaction.commandName === 'mcstats') {
      await handleMcstats(client, interaction);
    } else if (interaction.commandName === '명언') {
      await handleQuote(client, interaction)
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