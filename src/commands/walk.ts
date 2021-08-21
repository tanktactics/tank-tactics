import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import { MessageAttachment } from 'discord.js';
import { gameToCanvas } from '../canvasCreation';
import { Command, SlashCommand } from '../types';
import { componentProps, gameCheck } from '../utils';

export const commandData = {
  name: 'walk',
  description: 'Use 1 AP (for each step) to walk in towards any of the 8 directions',
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'direction',
      description: 'The direction you want to walk in',
      required: true,
      choices: [
        { name: 'Up', value: 'up' },
        { name: 'Upper left', value: 'up_left' },
        { name: 'Upper right', value: 'up_right' },
        { name: 'Left', value: 'left' },
        { name: 'Right', value: 'right' },
        { name: 'Down', value: 'down' },
        { name: 'Bottom right', value: 'down_right' },
        { name: 'Bottom left', value: 'down_left' },
      ]
    },
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'step_count',
      description: 'The amount of times to repeat this action',
    }
  ]
} as const;

export const executeCommand: Command<typeof commandData> = async ({ interaction, game, args, player }) => {
  await interaction.deferReply();
  const check = gameCheck({ game, player });
  if (check) return interaction.editReply(check);
  if (player.lives <= 0) return interaction.editReply('You are already dead!');

  let steps: number = -1;

  try {
    steps = await player.walk(args.direction, args.step_count);
  } catch (error) {
    if (error instanceof Error) {
      await interaction.editReply({
        content: error.message,
        files: [new MessageAttachment(game.boardImageBuffer, 'board.png')],
        components: componentProps
      })
    }
  }

  game.boardImageBuffer = (await gameToCanvas(game)).toBuffer();

  if (steps != -1) {
    await player.removePoints(steps);
    if (steps < args.step_count) {
      await interaction.editReply({
        content: `We could only let you move ${steps} steps towards the chosen direction.`,
        files: [new MessageAttachment(game.boardImageBuffer, 'board.png')],
        components: componentProps
      })
    } else {
      await interaction.editReply({
        content: `You've successfully moved ${steps} steps towards the chosen direction!`,
        files: [new MessageAttachment(game.boardImageBuffer, 'board.png')],
        components: componentProps
      })
    }
  }

}
