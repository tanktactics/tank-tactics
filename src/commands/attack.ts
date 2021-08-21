import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import { MessageAttachment } from 'discord.js';
import { gameToCanvas } from '../canvasCreation';
import { Command, SlashCommand } from '../types';
import { componentProps, gameCheck } from '../utils';

export const commandData = {
  name: 'attack',
  description: 'Attack someone, taking 1 HP if they are in range',
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'victim',
      description: 'The person you want to kill',
      required: true
    },
  ]
} as const;

export const executeCommand: Command<typeof commandData> = async ({ interaction, game, args, player }) => {
  await interaction.deferReply();
  const check = gameCheck({ game, player });
  if (check) return interaction.editReply(check);
  if (args.victim.user === interaction.user) return interaction.editReply('You can\'t kill yourself.');
  const victim = game.players.getPlayerFromDiscordUser(args.victim.user);
  if (!victim) return interaction.editReply('This user isn\'t part of this game.');
  const playersInRange = player.getPlayersInRange();

  if (playersInRange.has(victim.id)) {
    // Already dead
    if (player.lives <= 0) return interaction.editReply('You are already dead!');
    // Not enough points
    if (player.points <= 0) return interaction.editReply('You don\'t have any points to use!');
    // Victim is already dead
    if (victim.lives === 0) return interaction.editReply('This user is already dead!');
    else if (victim.lives > 1) {
      await victim.removeLive(player);
      await player.removePoints(1);
      await interaction.editReply({
        content: `Succesfully attacked ${args.victim.user}!`,
        components: componentProps,
        allowedMentions: {
          users: [
            victim.userId
          ]
        }
      });
      await interaction.followUp({
        content: args.victim.user.toString(),
        allowedMentions: {
          users: [
            victim.userId
          ]
        }
      });
    } else {
      await victim.removeLive(player);
      await player.addKill(victim);
      await player.removePoints(1);
      const halfPoints = Math.floor(victim.points / 2);
      player.addPoints(halfPoints);
      victim.removePoints(halfPoints);
      game.boardImageBuffer = (await gameToCanvas(game)).toBuffer();

      await interaction.editReply({
        content: `You killed ${args.victim.user} and received ${halfPoints} points from them!`,
        files: [new MessageAttachment(game.boardImageBuffer, 'board.png')],
        components: componentProps,
        allowedMentions: {
          users: [
            victim.userId
          ]
        }
      });
      await interaction.followUp({
        content: args.victim.user.toString(),
        allowedMentions: {
          users: [
            victim.userId
          ]
        }
      });
    }
  } else return interaction.editReply(`${args.victim.user} is not in your range, so you can't attack them!`);
}
