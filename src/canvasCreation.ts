import { createCanvas, loadImage, Image } from 'canvas';
import { TankTacticsGame } from './TankTactics';

export async function gameToCanvas(game: TankTacticsGame) {
  const playerImages: Record<string, Image> = {};
  const canvas = createCanvas(game.boardWidth * 20, game.boardHeight * 20);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#36393E';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellWidth = Math.floor(canvas.width / game.boardWidth);
  const cellHeight = Math.floor(canvas.width / game.boardWidth);

  for await (const [, player] of game.players) {
    if (!playerImages[player.id]) playerImages[player.id] = await loadImage(player.icon);
  }

  const colors = [
    'rgb(0, 122, 255)',
    'rgb(52, 199, 89)',
    'rgb(255, 149, 0)',
    'rgb(88, 86, 214)',
    'rgb(255, 45, 85)',
    'rgb(175, 82, 222)',
    'rgb(255, 59, 48)',
    'rgb(90, 200, 250)',
    'rgb(255, 204, 0)',
    'rgb(88, 101, 242)',
    'rgb(87, 242, 135)',
    'rgb(254, 231, 92)',
    'rgb(235, 69, 158)',
    'rgb(237, 66, 69)'

  ];

  for (let y = 0; y < game.boardHeight; y++) {
    for (let x = 0; x < game.boardWidth; x++) {
      const closestPlayers = game.getClosestPlayers(x, y);
      const closestPlayer = closestPlayers[0];

      ctx.fillStyle = 'white';

      const alpha = Math.max((20 - closestPlayer.gradientRange) / 20, 0);
      let relevantPlayers = closestPlayers.filter((v) => v.range <= v.player.range);

      ctx.save();
      ctx.translate(x * cellWidth, y * cellHeight);
      if (closestPlayer.range !== 0) {
        if (relevantPlayers.length > 0) {
          let gradient = ctx.createLinearGradient(0, 0, cellWidth, cellHeight);
          for (const [i, relevantPlayer] of relevantPlayers.entries()) {
            let o = 1 / relevantPlayers.length;
            const color = colors[[...game.players.values()].indexOf(relevantPlayer.player) % colors.length];
            gradient.addColorStop(o * i, color);
            gradient.addColorStop(o * (i + 1) - 0.05, color);
          }
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, cellWidth - 1, cellHeight - 1);
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, cellWidth - 1, cellHeight - 1);
        }
      }
      ctx.restore();

      if (closestPlayer.range === 0) {
        ctx.globalAlpha = 1;
        ctx.drawImage(
          playerImages[closestPlayer.player.id],
          x * cellWidth,
          y * cellHeight,
          cellWidth - 1,
          cellHeight - 1,
        );
      }
    }
  }

  return canvas;
}
