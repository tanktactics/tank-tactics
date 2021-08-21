import { EventEmitter } from 'events';
import { Player } from './Player';
import { PlayerCollection } from './PlayerCollection';
import { prisma } from './prisma';
import { GameState, IEventEmitter, IEvents, IPlayer, ITankTacticsGame, GameWithPlayerWithCoordsAndLogs, RangePlayer } from './types';

export class TankTacticsGame extends (EventEmitter as new () => IEventEmitter<IEvents>) implements ITankTacticsGame {
  id: string;
  name: string;
  players: PlayerCollection;
  boardWidth: number;
  boardHeight: number;
  guildId: string;
  channelId: string;
  lastGiftRound: number;
  giftRoundInterval: number;
  state: GameState;
  interval: NodeJS.Timer;
  boardImageBuffer: Buffer;
  constructor(data: GameWithPlayerWithCoordsAndLogs) {
    super();
    this.id = data.id;
    this.name = data.name;
    this.boardWidth = data.boardWidth;
    this.boardHeight = data.boardHeight;
    this.guildId = data.guildId;
    this.channelId = data.channelId;
    this.lastGiftRound = 0;
    this.giftRoundInterval = data.giftInterval;
    this.state = data.state as GameState;
    this.players = new PlayerCollection(data.players.map((player) => new Player(this, player)).map((player => [player.id, player])));
  }

  start() {
    if (this.state === 'ongoing') {
      this.interval = setInterval(() => this.apInterval.call(this), this.giftRoundInterval);
      this.apInterval();
    }
  }

  private async apInterval() {
    if (this.state !== 'ongoing') return clearInterval(this.interval);
    await Promise.all(this.players.filter((player) => player.lives > 0).map(player => player.addPoints(1)));
    this.lastGiftRound = Date.now() + 1e3;
    this.emit('apRound');
  }

  getClosestPlayers(x: number, y: number): RangePlayer[] {
    return this.players.filter((player) => player.lives > 0).map<RangePlayer>((player) => {
      const disX = Math.abs(x - player.coords.x);
      const disY = Math.abs(y - player.coords.y);
      return {
        player,
        gradientRange: Math.sqrt(disX * disX + disY * disY),
        range: Math.max(disX, disY),
      }
    }).sort((a, b) => a.gradientRange - b.gradientRange);
  }

  async setState(state: GameState) {
    this.state = state;
    await prisma.game.update({
      where: {
        id: this.id
      },
      data: {
        state
      }
    })
  }

}
