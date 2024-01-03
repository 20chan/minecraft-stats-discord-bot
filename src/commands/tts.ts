import fetch from 'node-fetch';
import * as discord from 'discord.js';
import {
  joinVoiceChannel,
  getVoiceConnections,
  getVoiceConnection,
  AudioPlayer,
  createAudioResource,
  VoiceConnection,
} from '@discordjs/voice';
import { Readable } from 'node:stream';
import { setTimeout } from 'node:timers/promises';

const API_TOKEN = process.env.TYPECAST_API_KEY;
const voiceActor = '찬구';

const players = new Map<string, AudioPlayer>();
const queues = new Map<string, Array<[string, string]>>();

export async function handle(client: discord.Client, interaction: discord.CommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === 'join') {
    await interaction.deferReply({ ephemeral: true });

    const channel = (interaction.member as discord.GuildMember)?.voice?.channel;
    if (!channel) {
      await interaction.reply('채널에 참가해주세요');
      return;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as any,
    });

    const player = new AudioPlayer();
    players.set(interaction.guildId!, player);

    queues.set(interaction.guildId!, []);

    const collector = channel.createMessageCollector()
      .on('collect', async msg => {
        if (msg.content !== '') {
          queues.get(interaction.guildId!)?.push([msg.content, voiceActor]);
        }
      });

    connection.subscribe(player);
    connection.on('stateChange', async (_, newState) => {
      if (newState.status === 'destroyed') {
        players.delete(interaction.guildId!);
        queues.delete(interaction.guildId!);
      } else if (newState.status === 'ready') {
        batchHandleQueue(collector, player, interaction.guildId!);
      }
    });
    await interaction.editReply('채널에 참가했습니다');
    return;
  } else if (subcommand === 'leave') {
    await interaction.deferReply({ ephemeral: true });

    const connection = getVoiceConnection(interaction.guildId!);
    connection?.destroy();
    await interaction.editReply('채널에서 나갔습니다');
  } else if (subcommand === 'play') {
    await interaction.deferReply({ ephemeral: true });

    const text = interaction.options.getString('text', true);
    const connection = getVoiceConnection(interaction.guildId!);
    if (!connection) {
      await interaction.reply('채널에 참가해주세요');
      return;
    }

    const channel = (interaction.member as discord.GuildMember)?.voice?.channel;
    if (!channel) {
      await interaction.reply('채널에 참가해주세요');
      return;
    }

    queues.get(interaction.guildId!)?.push([text, voiceActor]);
    await interaction.editReply('재생합니다');
  }
}

async function batchHandleQueue(collector: discord.MessageCollector, player: AudioPlayer, guildId: string) {
  while (players.get(guildId) === player) {
    const pop = queues.get(guildId)!.shift();

    if (!pop) {
      await setTimeout(50);
      continue;
    }

    const [text, voice] = pop;
    const audioUrl = await download(text, voice);
    const resource = createAudioResource(audioUrl);
    player.play(resource);
    await new Promise(resolve => {
      player.on('stateChange', (_, newState) => {
        if (newState.status === 'idle') {
          resolve(null);
        }
      });
    });
  }

  collector.stop();
}

export async function download(text: string, voice: string) {
  const resp = await fetch('https://typecast.ai/api/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({
      text,
      lang: 'auto',
      actor_id: voices.find(x => x[0] === voice)![1],
      xapi_hd: true,
      model_version: 'latest',
      emotion_tone_preset: 'normal-1',
    }),
  });

  const json = await resp.json();
  try {
    const pollUrl = json.result.speak_v2_url;

    let downloadUrl = '';
    while (true) {
      const pollResp = await fetch(pollUrl, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
        },
      });
      const body = await pollResp.json();

      const { status, audio_download_url } = body.result;
      if (status === 'done') {
        downloadUrl = audio_download_url;
        break;
      }
    }

    return downloadUrl;
  } catch (e) {
    console.error(json);
    throw e;
  }
}

export const voices = [
  ['오빠', '632293f759d649937b97f323'],
  ['남앵커', '6539f9a955c3de938ae20ed9'],
  ['아재', '636b1d81b58379d5c6b6aeeb'],
  ['셜록', '63da42a2dbbf266ceb0b0fb2'],
  ['남잼민', '5ffda49bcba8f6d3d46fc447'],
  ['찬구', '5c3c52c95827e00008dd7f34'],
  ['여잼민', '5ffda44bcba8f6d3d46fc41f'],
  ['할배', '61945d9c2c11c2c9fd934340'],
  ['누나', '6568164fe05ddffee8b0e271'],
  ['asmr', '6047863af12456064b35354e'],
  ['보라', '618203f635ea62f8574c7d8a'],
  ['루나', '609b98c2e587f6dbd19414b9'],
];