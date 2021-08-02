import { v4 as uuid } from "uuid";
import { EventEmitter } from "events";
import { Direction, Game, GameData, GameEvent, GameEventProps, GameEventType, GameState, IEventEmitter, IEvents, Player, PlayerInfo, PlayerWithDistance } from './types';
import { saveScreenshot } from './screenshotLogic';
import db from './db';
import { client, games } from '.';
import * as Discord from "discord.js";
import { gameToCanvas } from './canvasCreation';
import { gameProps } from './utils';


export class TankTacticsGame extends (EventEmitter as new () => IEventEmitter<IEvents>) implements Game {
	id: string;
	name: string;
	players: Player[];
	boardWidth: number;
	boardHeight: number;
	guildId: string;
	channelId: string;
	lastGiftRound: number;
	giftRoundInterval: number;
	state: GameState;
	log: GameEvent[];
  interval: NodeJS.Timer;

	constructor(data: GameData, enableEvents = true) {
    super();
		this.giftRoundInterval = data.giftRoundInterval ?? 600e3;
		this.log = data.log ?? [];

		this.players =
			data.players ??
			data.playerInfo.map((info, id) => {
				return {
					id,
          userId: info.userId,
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
		this.guildId = data.guild;
    this.channelId = data.channelId;
		this.lastGiftRound = data.lastGiftRound ?? 0;
		this.state = data.state ?? "ongoing";

		// Set board details
		this.boardWidth = data.boardWidth ?? this.players.length * 5;
		this.boardHeight = data.boardHeight ?? this.players.length * 3;

		// Spread players over the board
		for (let player of this.players) {
			if (player.coords.x === -1)
				player.coords.x = Math.floor(Math.random() * this.boardWidth);
			if (player.coords.y === -1)
				player.coords.y = Math.floor(Math.random() * this.boardHeight);
		}

		// Set ID
		this.id = data.id ?? uuid();

    if (enableEvents) {
      this.on("end", async (winner) => {
        const gameChannel = await client.channels.fetch(this.channelId) as Discord.TextChannel;
        if (!gameChannel) return;
        await gameChannel.send({
          content: `🎉🎉 De game is gewonnen door <@${winner.userId}> 🎉🎉`,
          ...await gameProps(this)
        });
      });
      this.on("points-given", async () => {
        const gameChannel = await client.channels.fetch(this.channelId) as Discord.TextChannel;
        if (!gameChannel) return;

        const nextApRound = this.lastGiftRound + this.giftRoundInterval;
        const dropContentPrefix = Date.now() > nextApRound ? "Laatste" : "Volgende";


        await gameChannel.send({
          content: `**Everybody in this match has received a single action point.**\n${dropContentPrefix} AP Drop: <t:${Math.floor(nextApRound / 1e3)}:R>.`,
          ...await gameProps(this)
        });
        db.set("games", games.map((g) => g.toJSON()));
      });
      this.on("save", async (type) => {
        db.set("games", games.map((g) => g.toJSON()));
        if (type === "log") saveScreenshot(this);
      });
      // Every so often, give every player a point if the game has not ended
      if (this.state === "ongoing") {
        this.interval = setInterval(() => this.intervalFunction.call(this), this.giftRoundInterval);
        this.intervalFunction();
      }
    }
	}

  private intervalFunction() {
    const stateCheck = this.doStateCheck();
    if (!stateCheck) {
      clearInterval(this.interval);
      return;
    }
    console.log(
      `Giving points at ${new Date().toLocaleString("nl")} for ${this.name}`
    );
    for (let p of this.players) {
      if (p.health > 0 || p.points < 1) this.givePlayerPoints(p.id, 1);
    }
    this.lastGiftRound = Date.now() + 1e3;
    this.emit("points-given", Date.now());
  }

	doStateCheck() {
		if (this.state !== "ongoing")
			return false;

		const remainingPlayers = this.players.filter((p) => p.health > 0);
		if (remainingPlayers.length <= 1) {
			this.state = "ended";
			this.emit("save", "state-change");
      this.emit("end", remainingPlayers[0]);
			return false;
		}

		return true;
	}

	getClosestPlayer(x: number, y: number) {
		return this.players
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
	}

	takePlayerPoints(id: Player["id"], pointCount: number = 1): boolean {
		let p = this.players.find((p) => p.id === id);
		if (p) {
			p.points = Math.max(p.points - pointCount, 0);
			this.addLog("point_take", {
				pointCount,
				player: p.id,
			});
			return true;
		} else return false;
	}

	givePlayerPoints(id: Player["id"], pointCount: number = 1): boolean {
		let p = this.players.find((p) => p.id === id);
		if (p) {
			p.points += pointCount;
			this.addLog("point_give", {
				pointCount,
				player: p.id,
			});
			return true;
		} else return false;
	}

	walkPlayer(
		id: number,
		dir: Direction,
		stepCount: number = 1
	) {
		let stateCheck = this.doStateCheck();
		if (!stateCheck) return "Game is al afgelopen!";

		const p = this.players.find((p) => p.id === id);
		if (!p) return "Speler niet gevonden";

		if (p.health <= 0) return "Je bent al dood!";

		let pointsTaken = 0;

		while (stepCount > 0) {
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

				if (!newPosIsValid) return "Je kan niet verder!";

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
			} else if (stepCount > 0) return `Na ${pointsTaken} stappen naar ${dir} heb je geen punten meer, dat is kut...`;
		}
		return pointsTaken > 0 ? "ok" : "Je hebt niet genoeg punten!";
	}

	doAttack(attackerId: Player["id"], victimId: Player["id"]) {
		let stateCheck = this.doStateCheck();
		if (!stateCheck) return "Game is al afgelopen!";

		const attacker = this.players.find((p) => p.id === attackerId);
		const victim = this.players.find((p) => p.id === victimId);

		if (!attacker || !victim) return "Er is geen speler gevonden!";
		if (attacker.health <= 0) return "Je bent al dood!";
		if (attacker.points <= 0) return "Je hebt hier niet genoeg punten voor!";
		if (victim.health <= 0) return "Je victim is al dood!";

		const disX = Math.abs(attacker.coords.x - victim.coords.x);
		const disY = Math.abs(attacker.coords.y - victim.coords.y);
		const dis = Math.max(disX, disY);

		if (Math.floor(dis) <= attacker.range) {
      this.takePlayerPoints(attacker.id);
			victim.health--;
      
      this.addLog("attack", {
        attacker: attacker.id,
        victim: victim.id,
        victimHealth: victim.health,
      });

			if (victim.health === 0) {
				attacker.kills++;

				// Subtract half points
				const halfPoints = Math.floor(victim.points / 2);
				this.givePlayerPoints(attacker.id, halfPoints);
				this.takePlayerPoints(victim.id, halfPoints);
				return `Je hebt <@${victim.userId}> gekilled en hebt ${halfPoints} AP gepikt.`;
			}
		} else {
			return "Je kan deze persoon niet aanvallen, deze persoon is te ver weg...";
		}
		return "ok";
	}

	doGift(gifterId: Player["id"], receiverId: Player["id"], pointCount: number) {
		let stateCheck = this.doStateCheck();
    if (!stateCheck) return "Game is al afgelopen!";

		const gifter = this.players.find((p) => p.id === gifterId);
		const receiver = this.players.find((p) => p.id === receiverId);

    if (!gifter || !receiver) return "Er is geen speler gevonden!";
		if (receiver.health <= 0) return "Die persoon is al dood!";
		if (gifter.points < pointCount) return "Je hebt hier niet genoeg punten voor!";
		if (pointCount <= 0) return "Wil je cheaten?! Dit is niet mogelijk....";

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

	doRangeIncrease(playerId: Player["id"]) {
		let stateCheck = this.doStateCheck();
		if (!stateCheck) return "Game is al afgelopen!";

		const player = this.players.find((p) => p.id === playerId);

    if (!player) return "Er is geen speler gevonden!";
		if (player.health <= 0) return "Je bent al dood!";
		if (player.points <= 1) return "Je hebt hier niet genoeg punten voor!";

		this.takePlayerPoints(player.id, 2);
		player.range++;

		this.addLog("range_increase", {
			player: player.id,
		});

		return "ok";
	}

  toJSON(): GameData {
    return {
      id: this.id,
      name: this.name,
      players: this.players,
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight,
      guild: this.guildId,
      channelId: this.channelId,
      lastGiftRound: this.lastGiftRound,
      giftRoundInterval: this.giftRoundInterval,
      state: this.state,
      log: this.log 
    }
  }

	private addLog<EventType extends GameEventType>(type: EventType, props: GameEventProps[EventType]) {
		this.log.push({
			type,
			props,
		});
		this.emit("save", "log");
	}
}
