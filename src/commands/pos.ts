import { MessageAttachment } from 'discord.js';
import { Command } from '../types';
import { componentProps, gameCheck } from '../utils';

export const commandData = {
  name: 'pos',
  description: 'Get your in-game coordinates',
} as const;

export const executeCommand: Command = async ({ interaction, game, player }) => {
  const check = gameCheck({ game, player });
  if (check) return interaction.reply(check);
  await interaction.reply({
    content: `**X**: ${player.coords.x}\n**Y**: ${player.coords.y}`,
    files: [new MessageAttachment(game.boardImageBuffer, 'board.png')],
    components: componentProps,
    ephemeral: true
  })
}
