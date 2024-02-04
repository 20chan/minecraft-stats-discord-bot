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
let actor_id = '';
let tone = '1';

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
          queues.get(interaction.guildId!)?.push([msg.content, actor_id]);
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

    queues.get(interaction.guildId!)?.push([text, actor_id]);
    await interaction.editReply('재생합니다');
  } else if (subcommand === 'voice') {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.user.id !== '268210869341650945') {
      await interaction.editReply({
        content: '권한이 없습니다.',
      });
      return;
    }

    actor_id = interaction.options.getString('actor_id', true);
    await interaction.editReply(`actor_id를 ${actor_id}로 설정했습니다`);
  } else if (subcommand === 'tone') {
    await interaction.deferReply({ ephemeral: true });

    if (interaction.user.id !== '268210869341650945') {
      await interaction.editReply({
        content: '권한이 없습니다.',
      });
      return;
    }

    tone = interaction.options.getString('tone', true);
    await interaction.editReply(`tone을 ${tone}로 설정했습니다`);
  }
}

async function batchHandleQueue(collector: discord.MessageCollector, player: AudioPlayer, guildId: string) {
  while (players.get(guildId) === player) {
    const pop = queues.get(guildId)!.shift();

    if (!pop) {
      await setTimeout(50);
      continue;
    }

    const [text, actor_id] = pop;
    const audioUrl = await download(text, actor_id);
    if (!audioUrl) {
      continue;
    }
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

async function getActorId() {
  const resp = await fetch('https://typecast.ai/api/actors', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  });

  const json = await resp.json();
  actor_id = json.result.actors[0].actor_id;
}

export async function download(text: string, actor_id: string) {
  const resp = await fetch('https://typecast.ai/api/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({
      text,
      lang: 'auto',
      actor_id,
      xapi_hd: true,
      model_version: 'latest',
      emotion_tone_preset: `normal-${tone}`,
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
  }
}

export const actors = [
  {
    name: '미스터 변사',
    value: '603fa172a669dfd23f450abd',
  },
];
