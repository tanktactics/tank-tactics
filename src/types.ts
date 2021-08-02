
/**
 * A unique game of Tank Tactics
 */
 export interface Game {
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
}

export type GameState = "ongoing" | "ended";

export interface GameData {
  log?: GameEvent[];
  giftRoundInterval?: number;
  players?: Player[];
  playerInfo?: PlayerInfo[];
  name?: string;
  guild: string;
  lastGiftRound?: number;
  state?: GameState;
  boardWidth?: number;
  boardHeight?: number;
  id?: string;
  channelId: string;
}

/**
 * Player interface
 * Placed in `players` array
 */
export interface Player extends PlayerInfo {
	id: number;
	points: number;
	range: number;
	health: number;
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
  /** Player's user id */
  userId: string;
}

export type GameEventType =
	| "attack"
	| "walk"
	| "gift"
	| "point_take"
	| "point_give"
	| "range_increase";

export type Direction =
  | "up"
  | "up_left"
  | "up_right"
  | "left"
  | "right"
  | "down"
  | "down_right"
  | "down_left";

export interface GameEvent<P = any> {
	type: GameEventType;
	props: P;
}

export interface GameEventProps {
  point_take: {
    pointCount: number;
    player: Player["id"];
  };
  point_give: {
    pointCount: number;
    player: Player["id"];
  };
  walk: {
    dir: Direction;
    player: Player["id"];
    newX: Player["coords"]["x"];
    newY: Player["coords"]["y"];
  };
  attack: {
    attacker: Player["id"];
    victim: Player["id"];
    victimHealth: Player["health"];
  };
  gift: {
    points: number;
    gifter: Player["id"];
    receiver: Player["id"];
  };
  range_increase: {
    player: Player["id"];
  };
}

export interface IEvents {
  save: (type: string) => Awaited<void>;
  end: (winner: Player) => Awaited<void>;
  "points-given": (time: number) => Awaited<void>;
}

type Arguments<T> = [T] extends [(...args: infer U) => unknown] ? U : [T] extends [void] ? [] : [T];

export type Awaited<T> = T | PromiseLike<T>;

export interface IEventEmitter<Events> {
  addListener<E extends keyof Events>(event: E, listener: Events[E]): this;
  on<E extends keyof Events>(event: E, listener: Events[E]): this;
  once<E extends keyof Events>(event: E, listener: Events[E]): this;
  prependListener<E extends keyof Events>(event: E, listener: Events[E]): this;
  prependOnceListener<E extends keyof Events>(event: E, listener: Events[E]): this;

  off<E extends keyof Events>(event: E, listener: Events[E]): this;
  removeAllListeners<E extends keyof Events>(event?: E): this;
  removeListener<E extends keyof Events>(event: E, listener: Events[E]): this;

  emit<E extends keyof Events>(event: E, ...args: Arguments<Events[E]>): boolean;
  eventNames(): (keyof Events | string | symbol)[];
  rawListeners<E extends keyof Events>(event: E): Function[];
  listeners<E extends keyof Events>(event: E): Function[];
  listenerCount<E extends keyof Events>(event: E): number;

  getMaxListeners(): number;
  setMaxListeners(maxListeners: number): this;
}
