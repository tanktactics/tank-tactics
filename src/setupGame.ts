import { Client, MessageActionRow, MessageAttachment, MessageButton, TextChannel } from 'discord.js';
import { games } from '.';
import { gameToCanvas } from './canvasCreation';
import { prisma } from './prisma';
import { TankTacticsGame } from './TankTactics';
import { GameState, GameWithPlayerWithCoordsAndLogs } from './types';
import { componentProps } from './utils';

export async function setupGame(dbGame: GameWithPlayerWithCoordsAndLogs, client: Client, channel: TextChannel) {
  const game = new TankTacticsGame(dbGame);
  for await (const [, player] of game.players) {
    // Update coords
    await prisma.coordinates.update({
      where: {
        id: player.coords.id
      },
      data: {
        x: player.coords.x,
        y: player.coords.y
      }
    });
  }
  const image = await gameToCanvas(game);
  game.boardImageBuffer = image.toBuffer();
  game
    .on('log', async (type, data) => {
      await prisma.log.create({
        data: {
          gameId: game.id,
          type,
          props: JSON.stringify(data)
        }
      });
      if (game.players.getAlivePlayers().size <= 1 && game.state === GameState.OnGoing) {
        await game.setState(GameState.Ended);
        game.emit('log', 'end', null);
      }
      if (type === 'end') {
        if (channel.deleted) return;
        channel.send({
          content: `🎉🎉 <@${game.players.getAlivePlayers().first().userId}> won the game! 🎉🎉`,
          files: [new MessageAttachment(game.boardImageBuffer, 'game.png')]
        })
      }
    })
    .on('apRound', async () => {
      if (channel.deleted) return;
      const nextApRound = game.lastGiftRound + game.giftRoundInterval;
      const dropContentPrefix = Date.now() > nextApRound ? 'Last' : 'Next';
      await channel.send({
        content: `**Everybody in this match has received a single action point.**\n${dropContentPrefix} AP Drop: <t:${Math.floor(
          nextApRound / 1e3,
        )}:R>.`,
        files: [new MessageAttachment(game.boardImageBuffer, 'game.png')],
        components: componentProps
      });
    }).start();
  games.set(dbGame.id, game);
}
