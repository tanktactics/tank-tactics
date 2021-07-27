import { TankTacticsGame } from './TankTactics'
import * as Discord from 'discord.js'
import { config } from 'dotenv'
import { createCanvas } from 'canvas'

config()

const client = new Discord.Client();

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);

	doMain()
	setInterval(doMain, 30e3); // Just do every 30 sec for now
});

const playerNames = ["Jip#9051", "wouter#8493", "uniflex#0001", "Kees#6957"]
const game = new TankTacticsGame({
	playerNames
})

const gameToText = (game: TankTacticsGame) => {
	let str = "";
	for(let y = 0; y < game.boardHeight; y++) {
		for(let x = 0; x < game.boardWidth; x++) {
			const closestPlayer = game.getClosestPlayer(x, y)

			let char = '[ ]';
			if(closestPlayer.distance === 0) {
				char = `[${game.selectedFaces[closestPlayer.id + 1]}]`;
			} else if(Math.floor(closestPlayer.distance) <= closestPlayer.range) {
				char = `[=]`
			}

			str += char
		}
		str += "\n";
	}

	str += "\n";
	
	for(let player of game.players) {
		str += `${`**${game.selectedFaces[player.id]} ${player.name}**`.padEnd(20, ' ')} ${player.points} AP, ${[player.health]} health\n`
	}

	return str.trim();
}

async function doMain() {
	console.log(game);

	const gameText = gameToText(game);
	console.log(gameText)

	let channel = client.channels.cache.get('869534069975822368')

	const canvas = createCanvas(600, 600)
	const ctx = canvas.getContext('2d')

	// Write "Awesome!"
	ctx.font = '30px Monospace'
	ctx.fillStyle = "white";
	ctx.fillText(gameText, 0, 0)

	// Convert to image and send it
	const url = canvas.toDataURL()
	const sfbuff = Buffer.from(url.split(",")[1], "base64");
	const sfattach = new Discord.MessageAttachment(sfbuff, "output.png");

	// @ts-ignore
	channel.send(`\`\`\`${gameText}\`\`\``)
}

client.login(process.env.token);