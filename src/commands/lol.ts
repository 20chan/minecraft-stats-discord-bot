import * as discord from 'discord.js';
import { logger } from '../logger';
import { addAccount, deleteAccount, editAccount, getAccounts } from '../lol';

export async function handle(client: discord.Client, interaction: discord.CommandInteraction) {
  await interaction.deferReply({});
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === '등록') {
    const name = interaction.options.getString('name', true);
    const alias = interaction.options.getString('alias', false);
    logger.info('lol.register.started', {
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
      },
      params: {
        name,
        alias,
      },
    });

    try {
      await addAccount(name, alias ?? '');
      await interaction.editReply(`롤 아이디 ${name} (${alias}) 등록 완료`);
    } catch (e) {
      logger.error('lol.register.error', e);
      await interaction.editReply(`롤 아이디 ${name} (${alias}) 등록 실패`);
    }
  } else if (subcommand === '수정') {
    const name = interaction.options.getString('name', true);
    const alias = interaction.options.getString('alias', false);
    logger.info('lol.update.started', {
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
      },
      params: {
        name,
        alias,
      },
    });

    try {
      await editAccount(name, alias ?? '');
      await interaction.editReply(`롤 아이디 ${name} (${alias}) 수정 완료`);
    } catch (e) {
      logger.error('lol.update.error', e);
      await interaction.editReply(`롤 아이디 ${name} (${alias}) 수정 실패`);
    }
  } else if (subcommand === '목록') {
    logger.info('lol.list.started', {
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
      },
    });

    const accounts = await getAccounts();
    const message = accounts.map(x => `- ${x.name} (${x.alias})`).join('\n');
    await interaction.editReply(message || '등록된 롤 아이디가 없습니다');
  } else if (subcommand === '삭제') {
    const name = interaction.options.getString('name', true);
    logger.info('lol.delete.started', {
      user: {
        id: interaction.user.id,
        username: interaction.user.username,
      },
      params: {
        name,
      },
    });

    try {
      await deleteAccount(name);
      await interaction.editReply(`롤 아이디 ${name} 삭제 완료`);
    } catch (e) {
      logger.error('lol.delete.error', e);
      await interaction.editReply(`롤 아이디 ${name} 삭제 실패`);
    }
  }
}
