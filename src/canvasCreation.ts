import { createCanvas, loadImage } from 'canvas';
import { TankTacticsGame } from './TankTactics';

export async function gameToCanvas(game: TankTacticsGame) {
    const playerImages = {};
    const canvas = createCanvas(game.boardWidth * 20, game.boardHeight * 20);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#36393E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellWidth = Math.floor(canvas.width / game.boardWidth);
    const cellHeight = Math.floor(canvas.width / game.boardWidth);

    await Promise.all(
        game.players.map(async (v) => {
            if (!playerImages[v.name]) playerImages[v.name] = await loadImage(v.icon);
        }),
    );

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
    ];

    for (let y = 0; y < game.boardHeight; y++) {
        for (let x = 0; x < game.boardWidth; x++) {
            const closestPlayers = game.getClosestPlayer(x, y);
            const closestPlayer = closestPlayers[0];

            ctx.fillStyle = 'white';

            const alpha = Math.max((20 - closestPlayer.distance2) / 20, 0);
            let relevantPlayers = closestPlayers.filter((v) => v.distance <= v.range).sort((a, b) => a.id - b.id);

            ctx.save();
            ctx.translate(x * cellWidth, y * cellHeight);
            if (closestPlayer.distance !== 0) {
                if (relevantPlayers.length > 0) {
                    // const playerColors = relevantPlayers
                    // 	.map((player) => colors[Number(player.id) % colors.length])
                    // 	.map((rgb) =>
                    // 		rgb.split(",").map((s) => Number(s.replace(/[^0-9]/g, "")))
                    // 	);

                    // let avg = [0, 0, 0];
                    // for (let [r, g, b] of playerColors) {
                    // 	avg[0] += r;
                    // 	avg[1] += g;
                    // 	avg[2] += b;
                    // }

                    // avg[0] = Math.round(avg[0] / relevantPlayers.length);
                    // avg[1] = Math.round(avg[1] / relevantPlayers.length);
                    // avg[2] = Math.round(avg[2] / relevantPlayers.length);

                    // const cellColorStr = `rgb(${avg[0]}, ${avg[1]}, ${avg[2]})`;
                    // console.log(cellColorStr);
                    let gradient = ctx.createLinearGradient(0, 0, cellWidth, cellHeight);
                    for (let i = 0; i < relevantPlayers.length; i++) {
                        let o = 1 / relevantPlayers.length;
                        const color = colors[relevantPlayers[i].id % colors.length];
                        gradient.addColorStop(o * i, color);
                        gradient.addColorStop(o * (i + 1) - 0.05, color);
                    }
                    ctx.fillStyle = gradient;

                    // console.log(playerColors);
                    // ctx.globalAlpha = (1 / relevantPlayers.length) * alpha;

                    // ctx.fillStyle = cellColorStr;
                    ctx.fillRect(0, 0, cellWidth - 1, cellHeight - 1);
                } else {
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, cellWidth - 1, cellHeight - 1);
                }
            }
            ctx.restore();

            // ctx.fillRect(
            // 	x * cellWidth,
            // 	y * cellHeight,
            // 	cellWidth - 1,
            // 	cellHeight - 1
            // );

            if (closestPlayer.distance === 0) {
                ctx.globalAlpha = 1;
                ctx.drawImage(
                    playerImages[closestPlayer.name],
                    x * cellWidth,
                    y * cellHeight,
                    cellWidth - 1,
                    cellHeight - 1,
                );
            }
        }
    }

    // const alivePlayers = game.players.filter((v) => v.health > 0);
    // for (let player of alivePlayers) {
    // 	const c = colors[Number(player.id) % colors.length]
    // 		.split(",")
    // 		.map((s) => Number(s.replace(/[^0-9]/g, "")))
    // 		.map((c) => Math.max(c - 100, 0));
    // 	const color = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

    // 	let startX = player.coords.x * cellWidth - player.range * cellWidth;
    // 	let startY = player.coords.y * cellHeight - player.range * cellHeight;
    // 	let width = (player.range * 2 + 1) * cellWidth;
    // 	let height = (player.range * 2 + 1) * cellHeight;

    // 	ctx.strokeStyle = "black";
    // 	ctx.lineWidth = 1;
    // 	ctx.globalAlpha = 0.5;
    // 	ctx.strokeRect(startX, startY, width, height);
    // }

    return canvas;
}
