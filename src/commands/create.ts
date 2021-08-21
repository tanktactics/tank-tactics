import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import { GuildMember } from 'discord.js';
import { slugify } from 'transliteration';
import { prisma } from '../prisma';
import { setupGame } from '../setupGame';
import { Command, SlashCommand } from '../types';

export const commandData = {
  name: "create",
  description: "Create a game with the specified members",
  options: [
    {
      name: "ap_interval",
      description:
        "The amount of minutes it takes to give everyone 1 AP",
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
    ...Array(20)
      .fill(0)
      .map((_, i) => ({
        name: `player_${i + 1}`,
        description: "A player to play in your match",
        type: ApplicationCommandOptionType.User,
        required: i < 3,
      })),
  ],
} as const;

export const executeCommand: Command<typeof commandData> = async ({ interaction, client, args }) => {
  await interaction.deferReply();
  const gameCount = await prisma.game.count();
  const members = interaction.options.data
    .filter((option) => option.name.startsWith('player'))
    .map((option) => option.member!)
    .map((member) => member as GuildMember)
    .filter((member, pos, array) => array.indexOf(member) === pos)
    .filter((member) => !member.user.bot);
  const apCountInterval = args.ap_interval > 0 ? args.ap_interval * 60e3 : 60e3;
  if (members.length >= 3) {
    const channel = await interaction.guild.channels.create(
      `${slugify(client.user.username.toLowerCase())}-${gameCount + 1}`,
      {
        reason: `New TankTactics game created by ${interaction.user.tag}`,
      },
    );
    const game = await prisma.game.create({
      data: {
        boardHeight: members.length * 3,
        boardWidth: members.length * 5,
        channelId: channel.id,
        giftInterval: apCountInterval ?? 600e3,
        guildId: interaction.guildId,
        name: channel.name,
        state: 'ongoing',
        logs: {},
        players: {
          create: [...members.map((player) => ({
            userId: player.user.id,
            icon: player.user.displayAvatarURL({
              format: 'png',
              size: 32,
            }),
            name: player.user.tag,
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
    await setupGame(game, client, channel);

    interaction.editReply(`New game created in ${channel}!`);
    await channel.send({
      content: `New game created!\n\n${members.join(', ')}`,
      allowedMentions: {
        users: members.map((member) => member.id),
      }
    });
  } else {
    interaction.editReply('You need more than 3 humans to create a game!');
  }
}
