import { gameToCanvas } from './canvasCreation';
import { TankTacticsGame } from './TankTactics';
import { MessageEmbed, MessageAttachment, CommandInteractionOption, MessageActionRow, MessageButton } from 'discord.js';
import { ArgumentsOf, Context, SlashCommand } from './types';

export const componentProps: MessageActionRow[] = [new MessageActionRow()
  .addComponents([
    new MessageButton()
      .setCustomId('view-ap')
      .setLabel('View AP')
      .setStyle('SECONDARY')
  ])]

export function transformInteraction<T extends SlashCommand>(options: readonly CommandInteractionOption[]): ArgumentsOf<T> {
  const opts: any = {};

  for (const top of options) {
    if (top.type === 'SUB_COMMAND' || top.type === 'SUB_COMMAND_GROUP') {
      opts[top.name] = transformInteraction(top.options ? [...top.options] : []);
    } else if (top.type === 'USER') {
      opts[top.name] = { user: top.user, member: top.member };
    } else if (top.type === 'CHANNEL') {
      opts[top.name] = top.channel;
    } else if (top.type === 'ROLE') {
      opts[top.name] = top.role;
    } else {
      opts[top.name] = top.value;
    }
  }

  return opts;
}

export function gameCheck({ game }: Pick<Context, 'game'>, onlyGameCheck: boolean): string;
export function gameCheck({ game }: Pick<Context, 'game' | 'player'>): string;
export function gameCheck({ game, player }: Pick<Context, 'game' | 'player'>, onlyGameCheck = false) {
  if (onlyGameCheck && game) return null;
  if (onlyGameCheck && !game) return 'There is no game in this channel!';
  return game && player ? null : game && !player ? 'You are not a player in this game.' : 'There is no game in this channel!';
}
