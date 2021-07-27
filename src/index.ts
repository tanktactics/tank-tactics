import { PlayerInfo, TankTacticsGame } from './TankTactics'
import * as Discord from 'discord.js'
import { config } from 'dotenv'
import { createCanvas, loadImage } from 'canvas'

config()

const client = new Discord.Client();

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);

	sendToDiscord()
	setInterval(sendToDiscord, 30e3); // Just do every 30 sec for now
});

const playerInfo: PlayerInfo[] = [
	{
		name: "Jip#9051",
		icon: "https://cdn.discordapp.com/avatars/159704489970892800/a_1559c4dc542fce82a9a7c42c8f346d8c.png?size=128"
	},
	{
		name: "Wouter#3441",
		icon: "https://cdn.discordapp.com/avatars/262522481376493568/976dee75bbf2b8da504471a9f83d2e78.png?size=128"
	},
	{
		name: "Martijn#6372",
		icon: "https://cdn.discordapp.com/avatars/585495804932784173/d81440e9c982fdc67de05b3fbf246e19.png?size=128"
	}
]
const game = new TankTacticsGame({
	playerInfo
})

const gameToCanvas = async (game: TankTacticsGame) => {

	const canvas = createCanvas(game.boardWidth * 60, game.boardHeight * 60)
	const ctx = canvas.getContext('2d')

	const cellWidth = Math.floor(canvas.width / game.boardWidth)
	const cellHeight = Math.floor(canvas.width / game.boardWidth)

	const playerImages = await Promise.all(game.players.map(v => loadImage(v.icon)))

	for(let y = 0; y < game.boardHeight; y++) {
		for(let x = 0; x < game.boardWidth; x++) {
			const closestPlayer = game.getClosestPlayer(x, y)

			ctx.fillStyle = "white";

			if(closestPlayer.distance === 0) {
				ctx.fillStyle = "white";
			} else if(Math.floor(closestPlayer.distance) === 1) {
				ctx.fillStyle = "orange";
			} else if(Math.floor(closestPlayer.distance) === 2) {
				ctx.fillStyle = "yellow";
			}

			ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth - 2, cellHeight - 2)

			if(closestPlayer.distance === 0) {
				console.log(playerImages[closestPlayer.id])
				ctx.drawImage(playerImages[closestPlayer.id], x * cellWidth, y * cellHeight, cellWidth - 2, cellHeight - 2)
			}
		}
	}
	
	// for(let player of game.players) {
	// 	str += `${`**${game.selectedFaces[player.id]} ${player.name}**`.padEnd(20, ' ')} ${player.points} AP, ${[player.health]} health\n`
	// }

	return canvas;
}

async function sendToDiscord() {
	console.log(game);

	const gameCanvas = await gameToCanvas(game);
	console.log(gameCanvas)

	let channel = client.channels.cache.get('869534069975822368')

	

	// // Write "Awesome!"
	// ctx.font = '30px Monospace'
	// ctx.fillStyle = "white";
	// ctx.fillText(gameText, 0, 0)

	// Convert to image and send it
	const url = gameCanvas.toDataURL()
	const sfbuff = Buffer.from(url.split(",")[1], "base64");
	const sfattach = new Discord.MessageAttachment(sfbuff, "output.png");

	// @ts-ignore
	channel.send(sfattach)
}

client.login(process.env.token);