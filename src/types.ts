import type { ApplicationCommandOptionType, APIApplicationCommandOption } from 'discord-api-types/v9';
import { Coordinates, Game, Log, Player } from '@prisma/client';
import { Client, CommandInteraction, GuildChannel, GuildMember, Role, User } from 'discord.js';
import { TankTacticsGame } from './TankTactics';
import { PlayerCollection } from './PlayerCollection';

/**
 * A unique game of Tank Tactics
 */
export interface ITankTacticsGame extends IEventEmitter<IEvents> {
  id: string;
  name: string;
  boardWidth: number;
  boardHeight: number;
  players: PlayerCollection;
  guildId: string;
  channelId: string;
  lastGiftRound: number;
  giftRoundInterval: number;
  state: GameState;
  interval: NodeJS.Timer;
  boardImageBuffer: Buffer;
  setState(state: GameState): Promise<void>;
  start(): void;
  getClosestPlayers(x: number, y: number): RangePlayer[];
}

export interface IPlayer {
  id: string;
  points: number;
  range: number;
  lives: number;
  kills: number;
  coords: ICoords;
  icon: string;
  name: string;
  userId: string;

  /**
   * @returns {number} The amount of steps the player has taken
  */
  walk(dir: Direction, stepCount?: number): Promise<number>;
  addPoints(points: number): Promise<void>;
  removePoints(points: number): Promise<void>;
  increaseRange(range: number): Promise<void>;
  removeLive(attacker: IPlayer): Promise<void>;
  addKill(deadPlayer: IPlayer): Promise<void>;
  gift(receiver: IPlayer, points: number): Promise<void>;
  getPlayersInRange(): PlayerCollection;
}

export type RangePlayer = { player: IPlayer, range: number; gradientRange: number; };

export interface ICoords {
  id: string;
  x: number;
  y: number;
}

export enum GameState {
  OnGoing = 'ongoing',
  Ended = 'ended'
}

export type Direction = 'up' | 'up_left' | 'up_right' | 'left' | 'right' | 'down' | 'down_right' | 'down_left';


export interface LogProps {
  pointGive: {
    points: IPlayer['points'];
    player: IPlayer['id'];
  };
  walk: {
    dir: Direction;
    player: IPlayer['id'];
    oldX: IPlayer['coords']['x'];
    oldY: IPlayer['coords']['y'];
    newX: IPlayer['coords']['x'];
    newY: IPlayer['coords']['y'];
  };
  attack: {
    attacker: IPlayer['id'];
    attackedPlayer: IPlayer['id'];
    attackedHealth: IPlayer['lives'];
  };
  gift: {
    points: number;
    gifter: IPlayer['id'];
    receiver: IPlayer['id'];
  };
  rangeIncrease: {
    player: IPlayer['id'];
    oldRange: IPlayer['range'];
    newRange: IPlayer['range'];
  };
  kill: {
    killer: IPlayer['id'];
    deadPlayer: IPlayer['id'];
  };
  end: {};
}

type LogType = 'walk' | 'pointGive' | 'rangeIncrease' | 'kill' | 'gift' | 'end';

export interface IEvents {
  log: <T extends LogType>(type: T, log: LogProps[T]) => Awaitable<void>;
  apRound: () => Awaitable<void>;
}

export type PlayerWithCoords = Player & {
  coords: Coordinates;
}

export type GameWithPlayerWithCoordsAndLogs = Game & {
  players: PlayerWithCoords[];
  logs: Log[];
}

type Arguments<T> = [T] extends [(...args: infer U) => unknown] ? U : [T] extends [void] ? [] : [T];

export type Awaitable<T> = T | PromiseLike<T>;

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

export type SlashCommand = Readonly<{
  name: string;
  description: string;
  options?: readonly Option[];
}>;

type Option = Readonly<
  {
    name: string;
    description: string;
    required?: boolean;
  } & (
    | {
      type: ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup;
      options?: readonly Option[];
    }
    | {
      type: ApplicationCommandOptionType.String;
      choices?: readonly Readonly<{ name: string; value: string }>[];
    }
    | {
      type: ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number;
      choices?: readonly Readonly<{ name: string; value: number }>[];
    }
    | {
      type:
      | ApplicationCommandOptionType.Boolean
      | ApplicationCommandOptionType.User
      | ApplicationCommandOptionType.Channel
      | ApplicationCommandOptionType.Role
      | ApplicationCommandOptionType.Mentionable;
    }
  )
>;


type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type TypeIdToType<T, O, C> = T extends ApplicationCommandOptionType.Subcommand
  ? ArgumentsOfRaw<O>
  : T extends ApplicationCommandOptionType.SubcommandGroup
  ? ArgumentsOfRaw<O>
  : T extends ApplicationCommandOptionType.String
  ? C extends readonly { value: string }[]
  ? C[number]['value']
  : string
  : T extends ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
  ? C extends readonly { value: number }[]
  ? C[number]['value']
  : number
  : T extends ApplicationCommandOptionType.Boolean
  ? boolean
  : T extends ApplicationCommandOptionType.User
  ? { user: User; member?: GuildMember }
  : T extends ApplicationCommandOptionType.Channel
  ? GuildChannel
  : T extends ApplicationCommandOptionType.Role
  ? Role
  : T extends ApplicationCommandOptionType.Mentionable
  ?
  | { user: User; member?: GuildMember }
  | GuildChannel
  | Role
  : never;

type OptionToObject<O> = O extends {
  name: infer K;
  type: infer T;
  required?: infer R;
  options?: infer O;
  choices?: infer C;
}
  ? K extends string
  ? R extends true
  ? { [k in K]: TypeIdToType<T, O, C> }
  : T extends ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup
  ? { [k in K]: TypeIdToType<T, O, C> }
  : { [k in K]?: TypeIdToType<T, O, C> }
  : never
  : never;

type ArgumentsOfRaw<O> = O extends readonly any[] ? UnionToIntersection<OptionToObject<O[number]>> : never;

export type ArgumentsOf<C extends SlashCommand> = C extends { options: readonly Option[] }
  ? UnionToIntersection<OptionToObject<C['options'][number]>>
  : unknown;

export interface Context<T extends SlashCommand = null> {
  interaction: CommandInteraction;
  game?: TankTacticsGame;
  player?: IPlayer;
  client: Client;
  args: ArgumentsOf<T>
}

export type Command<T extends SlashCommand = null> = (context: Context<T>) => Awaitable<any>;
