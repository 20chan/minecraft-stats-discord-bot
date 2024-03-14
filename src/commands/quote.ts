import * as discord from 'discord.js';
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { writeFile } from 'fs/promises';
import { logger } from '../logger';

export async function handle(client: discord.Client, interaction: discord.CommandInteraction) {
  await interaction.deferReply({});

  logger.info('quote.started', {
    user: {
      id: interaction.user.id,
      username: interaction.user.username,
    },
    params: {
      url: interaction.options.getString('url', false),
    }
  });

  const url = interaction.options.getString('url', false);
  if (!url) {
    interaction.editReply('사용법: /명언 <디코 메시지 우클릭 후 메시지 링크 복사>');
    return;
  }

  const parsed = url.match(/https:\/\/discord.com\/channels\/\d+\/(\d+)\/(\d+)/);
  if (!parsed) {
    logger.debug('quote.failed.parsed', {
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
      },
      params: {
        url: interaction.options.getString('url', false),
      },
    });

    interaction.editReply('메시지 url이 잘못됐습니다');
    return;
  }

  const channelId = parsed[1];
  const messageId = parsed[2];

  const channel = await client.channels.fetch(channelId) as discord.TextChannel | null;
  if (!channel) {
    logger.debug('quote.failed.channel', {
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
      },
      params: {
        url: interaction.options.getString('url', false),
      },
    });
    interaction.editReply('메시지 url이 잘못됐습니다');
    return;
  }

  const message = await (channel as discord.TextChannel).messages.fetch(messageId)

  const author = message.member?.displayName ?? message.member?.nickname ?? message.author.username;
  const content = message.content;

  const avatarUrl = message.member?.avatarURL({ format: 'png' }) ?? message.author.avatarURL({ format: 'png' })!;

  const savePath = `./imgs/quotes/${messageId}.png`;

  await createQuoteImage({
    avatarUrl: avatarUrl!,
    author,
    content,
    savePath,
  });

  await interaction.editReply({
    files: [{
      attachment: savePath,
      name: 'quote.png',
    }],
  });

  logger.debug('quote.finished', {
    user: {
      id: interaction.user.id,
      username: interaction.user.username,
    },
    params: {
      url: interaction.options.getString('url', false),
    },
    vars: {
      savePath,
    },
  });
}

// 800 x 300, 왼쪽 300x300은 아바타, 오른쪽 500x300은 텍스트
export async function createQuoteImage(params: {
  avatarUrl: string;
  author: string;
  content: string;
  savePath: string;
}) {
  const { avatarUrl, author, content, savePath } = params;
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');

  ctx.strokeStyle = 'black';
  ctx.fillRect(0, 0, 800, 300);

  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';
  ctx.font = 'bold 30px Noto Serif CJK TC';

  const quotedContent = `“${content}”`;

  ctx.textAlign = 'center';
  let y = drawTextMultiLine(ctx, quotedContent, 550, 100, 460, 30);
  y = drawTextMultiLine(ctx, `${author}`, 550, y + 50, 460, 30);

  const randStartYear = Math.floor(Math.random() * 320) + 1700;
  const randEndYear = randStartYear + Math.floor(1 + Math.random() * 119);

  const year = `(${randStartYear} - ${randEndYear})`;

  ctx.font = '30px Noto Serif CJK TC';
  ctx.fillText(year, 550, y);

  const avatar = await loadImage(avatarUrl);
  ctx.drawImage(avatar, 0, 0, 300, 300);

  grayscale(ctx, 0, 0, 300, 300)

  const buffer = canvas.toBuffer('image/png');
  await writeFile(savePath, buffer, 'base64',);
}

function drawTextMultiLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, height: number): number {
  var line = '';
  var currY = y;
  ctx.textBaseline = 'top';
  for (var i = 0; i < text.length; i += 1) {
    const tempLine = line + text[i];
    const tempWidth = ctx.measureText(tempLine).width;

    if (tempWidth < width && text[i] !== '\n') {
      line = tempLine;
    } else {
      ctx.fillText(line, x, currY);
      line = text[i] === '\n' ? '' : text[i];
      currY += height;
    }
  }

  ctx.fillText(line, x, currY);
  return currY + height;
}

function grayscale(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg;
    data[i + 1] = avg;
    data[i + 2] = avg;
  }

  ctx.putImageData(imageData, 0, 0);
}