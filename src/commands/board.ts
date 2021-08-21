import { MessageAttachment } from 'discord.js';
import { Command } from '../types';
import { componentProps, gameCheck } from '../utils';

export const commandData = {
  name: 'board',
  description: 'Get an up-to-date view of the board',
} as const;

export const executeCommand: Command = async ({ interaction, game }) => {
  const check = gameCheck({ game }, true);
  if (check) return interaction.reply(check);
  const nextApRound = game.lastGiftRound + game.giftRoundInterval;
  const dropContentPrefix = Date.now() > nextApRound ? 'Last' : 'Next';

  await interaction.reply({
    content: `${dropContentPrefix} AP Drop: <t:${Math.floor(
      nextApRound / 1e3,
    )}:R>.`,
    files: [new MessageAttachment(game.boardImageBuffer, 'board.png')],
    components: componentProps
  })
}
