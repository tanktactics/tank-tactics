
import { gameToCanvas } from './canvasCreation';
import { TankTacticsGame } from './TankTactics';
import { MessageEmbed, MessageAttachment } from 'discord.js';

export async function gameProps(game: TankTacticsGame) {
  const longestName = game.players.map((player) => player.name).reduce((a, b) => a.length > b.length ? a : b);
  const gameCanvas = await gameToCanvas(game);
  return {
    embeds: [
      new MessageEmbed()
      .setDescription(`\`\`\`${
        game.players
        .sort((a, b) => b.points - a.points)
        .sort((a, b) => b.health - a.health)
        .map((p) => {
          return `${p.name.padEnd(
            longestName.length + 2,
            " "
          )} ${`${p.points} AP`.padEnd(5, " ")} ${`${p.health} lives`.padEnd(
            8,
            " "
          )} ${`${p.range} range`.padEnd(8, " 0")} ${
            p.kills ? `${p.kills} kills` : ""
          }`.trim();
        })
        .join("\n")
        }\`\`\``)
    ],
    files: [new MessageAttachment(gameCanvas.toBuffer(), "output.png")]
  }
}
