import * as Discord from "discord.js";
import { config } from "dotenv";
import db from "./db";
import { attackCommand, boardCommand, createCommand, giftCommand, posCommand, rangeCommand, walkCommand } from './commands';
import { TankTacticsGame } from './TankTactics';
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { saveScreenshot } from './screenshotLogic';
import { gameToCanvas } from './canvasCreation';
import { slugify } from 'transliteration';
import { Direction, GameData } from './types';
import { gameProps } from './utils';

config();
export const client = new Discord.Client({
	partials: ["MESSAGE", "REACTION"],
  intents: [
    "GUILD_MESSAGES"
  ]
});

const rest = new REST({ version: '9' }).setToken(process.env.token);

process.on("uncaughtException", (err) => {
	console.log("Caught exception", err);
});

export let games: TankTacticsGame[] = [];

client.on("ready", async () => {
  await setupCommands();
  console.log("Bot ready!");
	games = (db.get("games") as GameData[]).filter((g) => g.state === "ongoing").map((g) => new TankTacticsGame(g));
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    await interaction.defer();
    if (interaction.commandName === 'create') {
      const members = interaction.options.data.filter((option) => option.name.startsWith('player')).map((option) => option.member!).map((member) => member as Discord.GuildMember);
      const apCountInterval = interaction.options.getInteger("ap_interval", true) * 60e3;
      if (members.length >= 3) {
        const channel = await interaction.guild.channels.create(`${slugify(client.user.username.toLowerCase())}-${games.length + 1}`, {
          type: "GUILD_TEXT",
          reason: `New TankTactics game created by ${interaction.user.tag}`
        });
        const game = new TankTacticsGame({
          playerInfo: members.map((member) => {
            return {
              name: member.user.tag,
              icon: member.user.displayAvatarURL({
                format: "png",
                size: 32
              }),
              userId: member.user.id
            };
          }),
          giftRoundInterval: apCountInterval ?? 600e3,
          name: channel.name,
          guild: interaction.guildId,
          channelId: channel.id
        });
        games.push(game);

			  db.set("games", games.map((g) => g.toJSON()));

        interaction.editReply(`Game aangemaakt in ${channel}!`);
			} else {
        interaction.editReply("Je hebt op zn minst 3 spelers nodig om een spel te starten!");
      }
    } else {
      const game = games.find((game) => game.channelId == interaction.channelId);
      if (!game) {
        interaction.editReply('Wut?! Dit command moet in een game kanaal uitgevoerd worden!');
        return;
      }
      const player = game.players.find((player) => player.userId == interaction.user.id);
      if (!player) {
        interaction.editReply('Je bent niet eens een speler?!');
        return;
      }
      if (interaction.commandName === 'walk') {
        const direction = interaction.options.getString('direction', true) as Direction;
        const stepCount = interaction.options.getInteger('step_count') ?? 1;

        const walkRes = game.walkPlayer(player.id, direction, stepCount);

        if (walkRes !== "ok") {
					await interaction.editReply({
            content: walkRes,
            ...await gameProps(game)
          });
				} else {
          await interaction.editReply({
            content: `Veel plezier daar, ${stepCount} naar ${direction}`,
            ...await gameProps(game)
          });
        }
      } else if (interaction.commandName === 'board') {
        await interaction.editReply({
          content: 'Hierzo!!',
          ...await gameProps(game)
        });
      } else if (interaction.commandName === 'attack') {
        const victim = interaction.options.getUser('victim', true);
        if (victim === interaction.user) {
          interaction.editReply("Dat ben jij zelf. Hulp is beschikbaar. 0800-0113");
          return;
        }
        const victimPlayer = game.players.find((p) => p.userId === victim.id);
        if (!victimPlayer) {
          interaction.editReply("Die guy speelt niet eens mee...");
          return;
        }

				const attackRes = game.doAttack(player.id, victimPlayer.id);
        if (attackRes !== "ok") {
					await interaction.editReply({
            content: attackRes,
            ...await gameProps(game)
          });
				} else {
          await interaction.editReply({
            content: `${victim} aanvallen? Broer, jij bent echt gangster...`,
            ...await gameProps(game),
            allowedMentions: {
              users: [victim.id]
            }
          });
        }
        await game.doStateCheck();
      } else if (interaction.commandName === 'gift') {
        const receiver = interaction.options.getUser('receiver', true);
        const apCount = interaction.options.getInteger('ap_count') ?? 0;

        if (receiver === interaction.user) {
          interaction.editReply("Dat ben jij zelf. Hoezo wil je jezelf AP geven?");
          return;
        }

        const receiverPlayer = game.players.find((p) => p.userId === receiver.id);
        if (!receiverPlayer) {
          interaction.editReply("Die guy speelt niet eens mee...");
          return;
        }

				const giftRes = game.doGift(player.id, receiverPlayer.id, apCount);

        if (giftRes !== "ok") {
					await interaction.editReply({
            content: giftRes,
            ...await gameProps(game)
          });
				} else {
          await interaction.editReply({
            content: `Dat is lief van je, om die arme ${receiver} lekker ${apCount} van je mooie AP te geven <3`,
            ...await gameProps(game),
            allowedMentions: {
              users: [receiver.id]
            }
          });
        }

        
      } else if (interaction.commandName === 'pos') {
				if (player.health <= 0) interaction.editReply(`Je positie? Broer je bent dood 😂`);
				else interaction.editReply(`Your position: X ${player.coords.x}, Y ${player.coords.y}`);
      } else if (interaction.commandName === 'range') {
				const rangeRes = game.doRangeIncrease(player.id);
        if (rangeRes !== "ok") {
					await interaction.editReply({
            content: rangeRes,
            ...await gameProps(game)
          });
				} else {
          await interaction.editReply({
            content: "Zo zo, geniet maar van die extra range 😎",
            ...await gameProps(game)
          });
        }
      }
    }
  }
});

client.login(process.env.token);

async function setupCommands() {
  const guilds = await Promise.all(client.guilds.cache.map(async (g) => await g.fetch()));
  for await (const guild of guilds) {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, guild.id),
      {
        body: [
          boardCommand.toJSON(),
          posCommand.toJSON(),
          rangeCommand.toJSON(),
          walkCommand.toJSON(),
          attackCommand.toJSON(),
          createCommand.toJSON(),
          giftCommand.toJSON()
        ]
      },
    );
    console.log(`Commands setupped for ${guild.name}`);
  }
}

setInterval(() => {
	console.log("Forcefully storing db");
	db.store(false);
}, 60e3 * 2);
