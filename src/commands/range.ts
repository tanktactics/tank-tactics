import { MessageAttachment } from 'discord.js';
import { gameToCanvas } from '../canvasCreation';
import { Command } from '../types';
import { componentProps, gameCheck } from '../utils';

export const commandData = {
  name: 'range',
  description: 'Trade 2 AP for a range increase',
} as const;

export const executeCommand: Command = async ({ interaction, game, player }) => {
  await interaction.deferReply();
  const check = gameCheck({ game, player });
  if (check) return interaction.reply(check);
  if (player.lives <= 0) return interaction.editReply('You are already dead!');
  if (player.points <= 0) return interaction.editReply('You don\'t have any points to use!');
  if (player.points < 2) return interaction.editReply('You need at least 2 points to use this command!');
  await player.increaseRange(1);
  game.boardImageBuffer = (await gameToCanvas(game)).toBuffer();
  await interaction.editReply({
    content: `Your range has been upgraded!`,
    files: [new MessageAttachment(game.boardImageBuffer, 'board.png')],
    components: componentProps
  });
}
