
import { v4 as uuid } from 'uuid'

/**
 * A unique game of Tank Tactics
 */
interface Game {
	id: string;
	players: Player[];
}

/**
 * Player interface
 * Placed in `players` array
 */
interface Player {
	id: number;
	name: string;
	points: number;
	range: number;
	health: number;
	coords: {
		x: number;
		y: number;
	}
}

interface PlayerWithDistance extends Player {
	distance?: number;
}

/**
 * Options passed to game class
 */
interface TankTacticsGameOptions {
	playerNames: string[]
}

export class TankTacticsGame implements Game {

	id: string;
	players: Player[];
	boardWidth: number;
	boardHeight: number;
	selectedFaces: string[]

	constructor({ playerNames }: TankTacticsGameOptions) {

		// Set board details
		this.boardHeight = 10;
		this.boardWidth = 10;
		this.selectedFaces = ['😃', '😅', '🤣', '😉', '😇', '😍', '🤩', '😜', '🤑', '🤢', '🥶']

		// Set ID
		this.id = uuid()

		// Set players
		this.players = playerNames.map((name, id) => {
			return {
				id,
				name,
				points: 1,
				range: 2,
				health: 3,
				coords: {
					x: Math.floor(Math.random() * this.boardWidth),
					y: Math.floor(Math.random() * this.boardHeight)
				}
			}
		});

		// Every so often, give every player a point
		setInterval(() => {
			for(let p of this.players) {
				this.givePlayerPoints(p.id, 1)
			}
		}, 30e3);
	}

	getClosestPlayer(x: number, y: number) {
		const playerDistances = this.players.map((player) => {
			let newPlayer: PlayerWithDistance = player;
			
			const disX = Math.abs(x - player.coords.x)
			const disY = Math.abs(y - player.coords.y)

			newPlayer.distance = Math.sqrt(disX * disX + disY * disY)
			
			return newPlayer
		}).sort((a, b) => a.distance - b.distance)

		return playerDistances[0]
	}

	takePlayerPoints(id: number, pointCount: number = 1): "ok" | "not_found" {
		let p = this.players.find(p => p.id === id);
		if(p) {
			p.points = Math.max(p.points - pointCount, 0)
			return "ok";
		}
		return "not_found";
	}

	givePlayerPoints(id: number, pointCount: number = 1): "ok" | "not_found" {
		let p = this.players.find(p => p.id === id);
		if(p) {
			p.points += pointCount
			return "ok";
		}
		return "not_found";
	}
}