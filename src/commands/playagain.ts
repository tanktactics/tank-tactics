import { channel } from 'diagnostics_channel';
import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import { GuildChannel } from 'discord.js';
import { slugify } from 'transliteration';
import { prisma } from '../prisma';
import { setupGame } from '../setupGame';
import { Command, SlashCommand } from '../types';

export const commandData = {
  name: 'playagain',
  description: 'Start a new game with the old players',
  options: [
    {
      type: ApplicationCommandOptionType.Channel,
      name: 'channel',
      description: 'The channel the game took place in',
      required: false
    },
  ]
} as const;

export const executeCommand: Command<typeof commandData> = async ({ interaction, args, client }) => {
  await interaction.deferReply();
  if (!args.channel) args.channel = interaction.channel as GuildChannel ?? await interaction.guild.channels.fetch(interaction.channelId);
  if (args.channel.isText()) {
    const game = await prisma.game.findFirst({
      where: {
        channelId: args.channel.id,
      },
      include: {
        players: true
      }
    });
    if (!game) return interaction.editReply('There was no game in the given channel!');
    if (game.state === 'ongoing') return interaction.editReply('That game is still running!');
    const gameCount = await prisma.game.count();
    const channel = await interaction.guild.channels.create(
      `${slugify(client.user.username.toLowerCase())}-${gameCount + 1}`,
      {
        reason: `New TankTactics game created by ${interaction.user.tag}`,
      },
    );
    const newGame = await prisma.game.create({
      data: {
        boardHeight: game.boardHeight,
        boardWidth: game.boardWidth,
        channelId: channel.id,
        giftInterval: game.giftInterval,
        guildId: interaction.guildId,
        name: channel.name,
        state: 'ongoing',
        logs: {},
        players: {
          create: [...game.players.map((player) => ({
            userId: player.userId,
            icon: player.icon,
            name: player.name,
            points: 1,
            range: 2,
            lives: 3,
            kills: 0,
            coords: {
              create: {
                x: -1,
                y: -1,
              }
            }
          }))]
        }
      },
      include: {
        logs: true,
        players: {
          include: {
            coords: true,
          }
        }
      }
    });
    await setupGame(newGame, client, channel);
    interaction.editReply(`New game created in ${channel}!`);
    await channel.send({
      content: `New game created!\n\n${game.players.map(p => `<@${p.userId}>`).join(', ')}`,
      allowedMentions: {
        users: game.players.map((member) => member.userId),
      }
    });

  } else return interaction.editReply('This command can only be used for a text channel!');
};
