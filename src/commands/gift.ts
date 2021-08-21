import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import { Command, SlashCommand } from '../types';
import { gameCheck } from '../utils';

export const commandData = {
  name: 'gift',
  description: 'Gift someone in your range a set amount of AP',
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'receiver',
      description: 'The person you want to gift AP',
      required: true
    },
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'ap_count',
      description: 'The amount of AP you want to gift',
      required: true
    },
  ]
} as const;

export const executeCommand: Command<typeof commandData> = async ({ interaction, game, args, player }) => {
  await interaction.deferReply();
  const check = gameCheck({ game, player });
  if (check) return interaction.editReply(check);
  if (args.receiver.user === interaction.user) return interaction.editReply('You can\'t gift points to yourself.');
  const receiver = game.players.getPlayerFromDiscordUser(args.receiver.user);
  if (!receiver) return interaction.editReply('This user isn\'t part of this game.');
  if (receiver.lives === 0) return interaction.editReply('This user is already dead!');
  if (player.points <= 0) return interaction.editReply('You don\'t have any points to give away!');
  if (player.lives <= 0) {
    await player.gift(receiver, args.ap_count);
    await interaction.editReply(`You gifted ${args.ap_count} AP to ${args.receiver.user}!`);
  } else {
    const playersInRange = player.getPlayersInRange();
    if (playersInRange.has(receiver.id)) {
      await player.gift(receiver, args.ap_count);
      await interaction.editReply(`You gifted ${args.ap_count} AP to ${args.receiver.user}!`);
    } else return interaction.editReply(`${args.receiver.user} is not in your range, so you can't give them points!`);
  }
}
