import { v4 as uuid } from "uuid";

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
	};
}

export interface PlayerWithDistance extends Player {
	distance?: number;
	distance2?: number;
}

/**
 * Options passed to game class
 */
export interface TankTacticsGameOptions {
	playerInfo: PlayerInfo[];
	name: string;
}

export interface PlayerInfo {
	/** Player's name */
	name: string;
	/** URL to icon */
	icon: string;
}

export type GameEventType =
	| "attack"
	| "walk"
	| "gift"
	| "point_take"
	| "point_give"
	| "range_increase";

export interface GameEvent {
	type: GameEventType;
	props: any;
}

export class TankTacticsGame implements Game {
	id: string;
	name: string;
	players: Player[];
	boardWidth: number;
	boardHeight: number;
	eventListeners: any[];
	guild: string;
	lastGiftRound: number;
	giftRoundInterval: number;
	state: "ongoing" | "ended";
	log: GameEvent[];

	constructor(data) {
		this.giftRoundInterval = data.giftRoundInterval ?? 600e3;
		this.log = data.log ?? [];
		this.eventListeners = [];

		const playerList =
			data.players ??
			data.playerInfo.map((info: PlayerInfo, id: number) => {
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
						y: -1,
					},
				};
			});

		// Set game details
		this.name = data.name ?? "No name";
		this.guild = data.guild ?? "869534069527027734";
		this.lastGiftRound = data.lastGiftRound ?? 0;
		this.state = data.state ?? "ongoing";

		// Set board details
		this.boardWidth = data.boardWidth ?? playerList.length * 5;
		this.boardHeight = data.boardHeight ?? playerList.length * 3;

		// Spread players over the board
		for (let player of playerList) {
			if (player.coords.x === -1)
				player.coords.x = Math.floor(Math.random() * this.boardWidth);
			if (player.coords.y === -1)
				player.coords.y = Math.floor(Math.random() * this.boardHeight);
		}

		// Set ID
		this.id = data.id ?? uuid();

		// Set players
		this.players = playerList;

		// Every so often, give every player a point
		this.checkGiftRounds();
	}

	doStateCheck() {
		if (this.state !== "ongoing")
			return "Broooo de game is al LANG afgelopen.........";

		const remainingPlayers = this.players.filter((p) => p.health > 0);
		if (remainingPlayers.length <= 1) {
			this.state = "ended";
			this.emit("save", "state-change");
			console.log("winnaar");
			return `En DE WINNAAR ISSSSSS ${remainingPlayers
				.map((p) => p.name)
				.join(", ")}.... Echt pro`;
		}

		return "ok";
	}

	checkGiftRounds() {
		let stateCheck = this.doStateCheck();
		if (stateCheck !== "ok") return stateCheck;

		let diff = Date.now() - this.lastGiftRound;
		let timeRemaining = Math.max(this.giftRoundInterval - diff, 0);

		setTimeout(() => {
			if (this.state === "ongoing") {
				console.log(
					`Giving points at ${new Date().toLocaleString("nl")} for ${this.name}`
				);
				for (let p of this.players) {
					if (p.health > 0 || p.points < 1) this.givePlayerPoints(p.id, 1);
				}
				this.lastGiftRound = Date.now() + 1e3;
				this.checkGiftRounds();
				this.emit("points-given", Date.now());
			}
		}, timeRemaining);
	}

	getClosestPlayer(x: number, y: number) {
		const playerDistances = this.players
			.filter((v) => v.health > 0)
			.map((player) => {
				let newPlayer: PlayerWithDistance = player;

				const disX = Math.abs(x - player.coords.x);
				const disY = Math.abs(y - player.coords.y);

				newPlayer.distance = Math.max(disX, disY);
				newPlayer.distance2 = Math.sqrt(disX * disX + disY * disY);

				return newPlayer;
			})
			.sort((a, b) => a.distance2 - b.distance2);

		return playerDistances;
	}

	takePlayerPoints(id: number, pointCount: number = 1): "ok" | "not_found" {
		let p = this.players.find((p) => p.id === id);
		if (p) {
			p.points = Math.max(p.points - pointCount, 0);
			this.addLog("point_take", {
				pointCount,
				player: p.id,
			});
			return "ok";
		}
		return "not_found";
	}

	givePlayerPoints(id: number, pointCount: number = 1): "ok" | "not_found" {
		let p = this.players.find((p) => p.id === id);
		if (p) {
			p.points += pointCount;
			this.addLog("point_give", {
				pointCount,
				player: p.id,
			});
			return "ok";
		}
		return "not_found";
	}

	walkPlayer(
		id: number,
		dir:
			| "up"
			| "up_left"
			| "up_right"
			| "left"
			| "right"
			| "down"
			| "down_right"
			| "down_left",
		stepCount: number = 1
	) {
		let stateCheck = this.doStateCheck();
		if (stateCheck !== "ok") return stateCheck;

		const p = this.players.find((p) => p.id === id);
		if (!p) {
			return "not_found";
		}

		if (p.health <= 0) {
			return "Je bent al dood man";
		}

		let pointsTaken = 0;

		while (stepCount > 0) {
			console.log(stepCount);
			stepCount--;
			if (p.points > 0) {
				let newX = p.coords.x;
				let newY = p.coords.y;

				if (dir === "up") {
					newY--;
				} else if (dir === "up_left") {
					newX--;
					newY--;
				} else if (dir === "up_right") {
					newX++;
					newY--;
				} else if (dir === "left") {
					newX--;
				} else if (dir === "right") {
					newX++;
				} else if (dir === "down") {
					newY++;
				} else if (dir === "down_left") {
					newX--;
					newY++;
				} else if (dir === "down_right") {
					newX++;
					newY++;
				}

				let newPosIsValid = true;
				if (
					newX < 0 ||
					newY < 0 ||
					newX > this.boardWidth - 1 ||
					newY > this.boardHeight - 1
				)
					newPosIsValid = false;

				for (let player of this.players.filter((p) => p.health > 0)) {
					if (player.coords.x === newX && player.coords.y === newY) {
						newPosIsValid = false;
					}
				}

				if (!newPosIsValid) return "Verder kan je niet jong";

				this.addLog("walk", {
					dir,
					player: p.id,
					newX,
					newY,
				});

				p.coords.x = newX;
				p.coords.y = newY;

				this.takePlayerPoints(id, 1);
				pointsTaken++;
				this.emit("capture");
			} else if (stepCount > 0) {
				return `Na ${pointsTaken} stappen naar ${dir} heb je geen punten meer, dat is kut man`;
			}
		}
		return pointsTaken > 0 ? "ok" : "nie genoeg punten";
	}

	doAttack(attackerId: number, victimId: number) {
		let stateCheck = this.doStateCheck();
		if (stateCheck !== "ok") return stateCheck;

		const attacker = this.players.find((p) => p.id === attackerId);
		const victim = this.players.find((p) => p.id === victimId);

		if (!attacker || !victim) {
			return "Ja die bestaat niet he";
		}

		if (attacker.health <= 0) {
			return "lol je bent al dood";
		}

		if (attacker.points <= 0) {
			return "bruh daar heb je de punten niet voor hoor";
		}

		if (victim.health <= 0) {
			return "necrofiel die je bent";
		}

		const disX = Math.abs(attacker.coords.x - victim.coords.x);
		const disY = Math.abs(attacker.coords.y - victim.coords.y);
		const dis = Math.max(disX, disY);

		if (Math.floor(dis) <= attacker.range) {
			this.takePlayerPoints(attacker.id);
			victim.health--;

			this.emit("capture");

			if (victim.health === 0) {
				attacker.kills++;

				// Subtract half points
				const halfPoints = Math.floor(victim.points / 2);
				this.givePlayerPoints(attacker.id, halfPoints);
				this.takePlayerPoints(victim.id, halfPoints);

				let stateCheck = this.doStateCheck();

				this.addLog("attack", {
					attacker: attacker.id,
					victim: victim.id,
					victimHealth: victim.health,
				});

				if (stateCheck !== "ok")
					return (
						`Je hebt m gekilled en hebt ${halfPoints} AP gepikt: ` + stateCheck
					);

				return `Goed bezig, die is dood en je hebt ${halfPoints} AP gepikt`;
			}
		} else {
			return "Die is veeeeeeeeel te ver weg";
		}

		this.addLog("attack", {
			attacker: attacker.id,
			victim: victim.id,
			victimHealth: victim.health,
		});

		return "ok";
	}

	doGift(gifterId: number, receiverId: number, pointCount: number) {
		let stateCheck = this.doStateCheck();
		if (stateCheck !== "ok") return stateCheck;

		const gifter = this.players.find((p) => p.id === gifterId);
		const receiver = this.players.find((p) => p.id === receiverId);

		if (!gifter || !receiver) {
			return "Ja die bestaat niet he";
		}

		if (receiver.health <= 0) {
			return "lol die is al dood";
		}

		if (gifter.points < pointCount) {
			return "bruh daar heb je de punten niet voor hoor";
		}

		if (pointCount <= 0) {
			return "bruh doe normaal wil je cheaten ofz......";
		}

		const disX = Math.abs(gifter.coords.x - receiver.coords.x);
		const disY = Math.abs(gifter.coords.y - receiver.coords.y);
		const dis = Math.max(disX, disY);

		if (Math.floor(dis) <= gifter.range || gifter.health <= 0) {
			this.takePlayerPoints(gifter.id, pointCount);
			this.givePlayerPoints(receiver.id, pointCount);
		} else {
			return "Die is veeeeeeeeel te ver weg";
		}

		this.addLog("gift", {
			gifter: gifter.id,
			receiver: receiver.id,
			points: pointCount,
		});

		return "ok";
	}

	doRangeIncrease(playerId: number) {
		let stateCheck = this.doStateCheck();
		if (stateCheck !== "ok") return stateCheck;

		const player = this.players.find((p) => p.id === playerId);

		if (!player) {
			return "Ja die bestaat niet he";
		}

		if (player.health <= 0) {
			return "lol je bent al dood";
		}

		if (player.points <= 1) {
			return "bruh daar heb je de punten niet voor hoor";
		}

		this.takePlayerPoints(player.id, 2);
		player.range++;

		this.addLog("range_increase", {
			player: player.id,
		});

		return "ok";
	}

	private addLog(type: GameEventType, props: any) {
		this.log.push({
			type,
			props,
		});
		this.emit("save", "log");
		this.emit("capture");
	}

	on(evtName: string, callback: any) {
		this.eventListeners.push({
			evtName,
			callback,
		});
	}

	emit(evtName: string, value?: any) {
		let relevantListeners = this.eventListeners.filter(
			(v) => v.evtName === evtName
		);
		for (let listener of relevantListeners) {
			listener.callback(value);
		}
	}
}
