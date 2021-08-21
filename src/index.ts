import { config } from 'dotenv';
import { red } from 'kleur/colors'
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { Command, SlashCommand } from './types';
import readdirp from 'readdirp';
import { basename, join } from 'path';
import { transformInteraction } from './utils';
import { prisma } from './prisma';
import { TankTacticsGame } from './TankTactics';
import { setupGame } from './setupGame';
import { table } from 'table';
import { Client, Formatters, Guild, TextChannel } from 'discord.js';

config();
export const client = new Client({
  partials: ['MESSAGE', 'REACTION'],
  intents: ['GUILD_MESSAGES'],
});

const rest = new REST({ version: '9' }).setToken(process.env.token);

process.on('uncaughtException', (err) => {
  console.log('Caught exception', err);
});

const commands = new Map<string, Command>();
export const games = new Map<string, TankTacticsGame>();
const commandsToRegister: SlashCommand[] = [];

(async () => {
  const commandFiles = readdirp(join(__dirname, 'commands'), {
    fileFilter: '*.js'
  });

  for await (const dir of commandFiles) {
    const command: {
      commandData?: SlashCommand,
      executeCommand?: Command
    } = await import(dir.fullPath);
    if (command.commandData !== undefined && typeof command.executeCommand == 'function') {
      commandsToRegister.push(command.commandData);
      commands.set(command.commandData!.name, command.executeCommand);
      console.log(`Registered command ${command.commandData!.name}`);
    } else console.log(red(`${command.commandData?.name ?? basename(dir.fullPath, '.js')} is missing data to register the command!`));
  }

})();

client.on('ready', async () => {
  console.log('Bot ready!');
  for await (const [, guild] of client.guilds.cache) {
    await setupCommands(guild);
  }
  const onGoingGames = await prisma.game.findMany({
    where: {
      state: 'ongoing'
    },
    include: {
      players: {
        include: {
          coords: true
        }
      },
      logs: true
    }
  });
  for await (const game of onGoingGames) {
    const channel = await client.channels.fetch(game.channelId) as TextChannel;
    await setupGame(game, client, channel);
  }
});

client.on('guildCreate', async (guild) => {
  if (!guild.available) return;
  await setupCommands(guild);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    const command = commands.get(interaction.commandName);
    if (command !== undefined) {
      const dbGame = await prisma.game.findFirst({
        where: {
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          state: 'ongoing'
        },
        select: {
          id: true
        }
      });
      const game = games.get(dbGame?.id ?? null);
      const player = game?.players.getPlayerFromDiscordUser(interaction.user);
      await command({
        args: transformInteraction(interaction.options.data),
        interaction,
        client,
        game,
        player
      });
    }
  } else if (interaction.isButton()) {
    const dbGame = await prisma.game.findFirst({
      where: {
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      },
      select: {
        id: true
      }
    });
    const game = games.get(dbGame?.id ?? null);
    if (interaction.customId === 'view-ap') {
      const tableString = table(
        game.players
          .sort((a, b) => b.points - a.points)
          .sort((a, b) => b.lives - a.lives)
          .map((p) => [p.name, `${p.points} AP`, `${p.lives} lives`, `${p.range} range`, `${p.kills} kills`]),
        {
          border: {
            topBody: `─`,
            topJoin: `┬`,
            topLeft: `┌`,
            topRight: `┐`,

            bottomBody: `─`,
            bottomJoin: `┴`,
            bottomLeft: `└`,
            bottomRight: `┘`,

            bodyLeft: `│`,
            bodyRight: `│`,
            bodyJoin: `│`,

            joinBody: `─`,
            joinLeft: `├`,
            joinRight: `┤`,
            joinJoin: `┼`
          }
        })
      interaction.reply({
        content: Formatters.codeBlock(tableString),
        ephemeral: true
      });
    }
  }
});

client.login(process.env.token);

async function setupCommands(guild: Guild) {
  await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), {
    body: commandsToRegister,
  });
  console.log(`Commands setupped for ${guild.name ?? guild.id}`);
}
