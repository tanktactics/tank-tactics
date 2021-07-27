
import { v4 as uuid } from 'uuid'

/**
 * A unique game of Tank Tactics
 */
export interface Game {
	id: string;
	players: Player[];
}

/**
 * Player interface
 * Placed in `players` array
 */
export interface Player {
	id: number;
	name: string;
	points: number;
	range: number;
	health: number;
	icon: string;
	kills: number;
	coords: {
		x: number;
		y: number;
	}
}

export interface PlayerWithDistance extends Player {
	distance?: number;
}

/**
 * Options passed to game class
 */
export interface TankTacticsGameOptions {
	playerInfo: PlayerInfo[]
	name: string;
}

export interface PlayerInfo {
	/** Player's name */
	name: string;
	/** URL to icon */
	icon: string;
}

export class TankTacticsGame implements Game {

	id: string;
	name: string;
	players: Player[];
	boardWidth: number;
	boardHeight: number;
	eventListeners: any[];

	constructor(data) {

		this.eventListeners = [];

		const playerList = data.players ?? data.playerInfo.map((info: PlayerInfo, id: number) => {
			return {
				id,
				name: info.name,
				icon: info.icon,
				points: 1,
				range: 2,
				health: 3,
				kills: 0,
				coords: {
					x: -1,
					y: -1
				}
			}
		});

		// Set game details
		this.name = data.name ?? 'No name'

		// Set board details
		this.boardWidth = data.boardWidth ?? playerList.length * 8;
		this.boardHeight = data.boardHeight ?? playerList.length * 5;

		// Spread players over the board
		for(let player of playerList) {
			if(player.coords.x === -1) player.coords.x = Math.floor(Math.random() * this.boardWidth)
			if(player.coords.y === -1) player.coords.y = Math.floor(Math.random() * this.boardHeight)
		}

		// Set ID
		this.id = data.id ?? uuid()

		// Set players
		this.players = playerList

		// Every so often, give every player a point
		setInterval(() => {
			console.log('Giving points at', new Date().toLocaleString('nl'))
			this.emit('points-given', Date.now())
			for(let p of this.players) {
				this.givePlayerPoints(p.id, 1)
			}
		}, 120e3);
	}

	getClosestPlayer(x: number, y: number) {
		const playerDistances = this.players.filter(v => v.health > 0).map((player) => {
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

	walkPlayer(id: number, dir: "up" | "up_left" | "up_right" | "left" | "right" | "down" | "down_right" | "down_left", stepCount: number = 1) {
		const p = this.players.find(p => p.id === id)
		if(!p) {
			return "not_found"
		}

		if(p.health <= 0) {
			return "Je bent al dood man"
		}
		console.log(stepCount)
		while(stepCount > 0) {
			console.log(stepCount)
			stepCount--
			if(p.points > 0) {

				let newX = p.coords.x;
				let newY = p.coords.y;
	
				if(dir === "up") {
					newY--
				} else if(dir === "up_left") {
					newX--
					newY--
				} else if(dir === "up_right") {
					newX++
					newY--
				} else if(dir === "left") {
					newX--
				} else if(dir === "right") {
					newX++
				} else if(dir === "down") {
					newY++
				} else if(dir === "down_left") {
					newX--
					newY++
				} else if(dir === "down_right") {
					newX++
					newY++
				}
				
				let newPosIsValid = true;
				if(newX < 0 || newY < 0 || newX > this.boardWidth - 1 || newY > this.boardHeight - 1) newPosIsValid = false;
	
				for(let player of this.players.filter(p => p.health > 0)) {
					if(player.coords.x === newX && player.coords.y === newY) {
						newPosIsValid = false;
					}
				}
	
				if(!newPosIsValid) return "Verder kan je niet jong"
				
				p.coords.x = newX;
				p.coords.y = newY;
		
				this.takePlayerPoints(id, 1)
			} else {
				return "Nu heb je geen punten meer"
			}
		}
		return "ok"

	}

	doAttack(attackerId: number, victimId: number) {

		const attacker = this.players.find(p => p.id === attackerId)
		const victim = this.players.find(p => p.id === victimId)

		if(!attacker || !victim) {
			return "Ja die bestaat niet he"
		} 

		if(attacker.health <= 0) {
			return "lol je bent al dood"
		}

		if(attacker.points <= 0) {
			return "bruh daar heb je de punten niet voor hoor"
		}

		if(victim.health <= 0) {
			return "necrofiel die je bent"
		}

		const disX = Math.abs(attacker.coords.x - victim.coords.x)
		const disY = Math.abs(attacker.coords.y - victim.coords.y)
		const dis = Math.sqrt(disX*disX + disY*disY)
		
		if(Math.floor(dis) < attacker.range) {
			this.takePlayerPoints(attacker.id)
			victim.health--

			if(victim.health === 0) {
				attacker.kills++
				return "Goed bezig hij is dood"
			}
		} else {
			return "Die is veeeeeeeeel te ver weg"
		}

		return "ok"
	}

	on(evtName: string, callback: any) {
		this.eventListeners.push({
			evtName,
			callback
		})
	}

	emit(evtName: string, value: any) {
		let relevantListeners = this.eventListeners.filter(v => v.evtName === evtName);
		for(let listener of relevantListeners) {
			listener.callback(value)
		}
	}
}