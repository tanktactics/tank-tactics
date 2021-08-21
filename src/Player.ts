import { prisma } from './prisma';
import { PlayerCollection } from './PlayerCollection';
import { Direction, ICoords, IPlayer, ITankTacticsGame, PlayerWithCoords } from './types';

export class Player implements IPlayer {
  id: string;
  points: number;
  range: number;
  lives: number;
  kills: number;
  coords: ICoords;
  icon: string;
  name: string;
  userId: string;
  constructor(protected game: ITankTacticsGame, data: PlayerWithCoords) {
    this.id = data.id;
    this.points = data.points;
    this.range = data.range;
    this.lives = data.lives;
    this.kills = data.kills;
    this.coords = data.coords;
    this.icon = data.icon;
    this.name = data.name;
    this.userId = data.userId;
    if (this.coords.x === -1) this.coords.x = Math.floor(Math.random() * this.game.boardWidth);
    if (this.coords.y === -1) this.coords.y = Math.floor(Math.random() * this.game.boardHeight);
  }

  async walk(dir: Direction, stepCount = 1): Promise<number> {
    let takenSteps = 0;
    let xPos = this.coords.x;
    let yPos = this.coords.y;
    if (stepCount > this.points) throw new Error('You don\'t have enough points to walk this far!');
    for (let steps = 0; steps < stepCount; steps++) {
      switch (dir) {
        case 'up':
          yPos--;
          break;
        case 'up_left':
          xPos--;
          yPos--;
          break;
        case 'up_right':
          xPos++;
          yPos--;
          break;
        case 'down':
          yPos++;
          break;
        case 'down_left':
          xPos--;
          yPos++;
          break;
        case 'down_right':
          xPos++;
          yPos++;
          break;
        case 'left':
          xPos--;
          break;
        case 'right':
          xPos++;
          break;
        default:
          throw new Error('Unknown direction');
      }

      if (
        xPos < 0 ||
        xPos >= this.game.boardWidth - 1 ||
        yPos < 0 ||
        yPos >= this.game.boardHeight - 1 ||
        this.game.players.filter(
          (player) => player.lives > 0
        ).some(
          (player) => player.coords.x === xPos && player.coords.y === yPos
        )
      ) {
        break;
      }

      // add log
      this.game.emit('log', 'walk', {
        player: this.id,
        dir: dir,
        oldX: this.coords.x,
        newX: xPos,
        oldY: this.coords.y,
        newY: yPos,
      });
      takenSteps++;
      this.coords.y = yPos;
      this.coords.x = xPos;
    }

    await prisma.player.update({
      data: {
        coords: {
          update: {
            x: this.coords.x,
            y: this.coords.y
          }
        }
      },
      where: { id: this.id }
    });
    return takenSteps;
  }

  async addPoints(points: number): Promise<void> {
    console.log(`Adding ${points} point(s) to ${this.name}.`);
    await prisma.player.update({
      data: {
        points: {
          increment: points
        }
      },
      where: { id: this.id }
    });
    this.points += points;
    this.game.emit("log", "pointGive", {
      points,
      player: this.id
    });
  }

  async removePoints(points: number): Promise<void> {
    await prisma.player.update({
      data: {
        points: {
          decrement: points
        }
      },
      where: { id: this.id }
    });
    this.points -= points;
  }

  async increaseRange(): Promise<void> {
    await prisma.player.update({
      data: {
        range: {
          increment: 1
        },
        points: {
          decrement: 2
        }
      },
      where: { id: this.id }
    });
    await prisma.log.create({
      data: {
        gameId: this.game.id,
        type: 'rangeIncrease',
        props: JSON.stringify({
          player: this.id,
          oldRange: this.range,
          newRange: this.range + 1
        })
      }
    });
    this.range++;
    this.points -= 2;
  }

  async removeLive(attacker: IPlayer): Promise<void> {
    await prisma.player.update({
      data: {
        lives: {
          decrement: 1
        }
      },
      where: { id: this.id }
    });
    this.lives--;
    await prisma.log.create({
      data: {
        gameId: this.game.id,
        type: 'attack',
        props: JSON.stringify({
          attacker: attacker.id,
          attackedPlayer: this.id,
          attackedHealth: this.lives
        })
      }
    });
  }

  async addKill(deadPlayer: IPlayer): Promise<void> {
    await prisma.player.update({
      data: {
        kills: {
          increment: 1
        }
      },
      where: { id: this.id }
    });
    await prisma.log.create({
      data: {
        gameId: this.game.id,
        type: 'kill',
        props: JSON.stringify({
          killer: this.id,
          deadPlayer: deadPlayer.id
        })
      }
    });
    this.kills++;
  }

  async gift(receiver: IPlayer, points: number): Promise<void> {
    await prisma.log.create({
      data: {
        gameId: this.game.id,
        type: 'gift',
        props: JSON.stringify({
          killer: this.id,
          receiver: receiver.id,
          points
        })
      }
    });
    await prisma.player.update({
      data: {
        points: {
          decrement: points
        }
      },
      where: { id: this.id }
    });
    this.points--;
    await receiver.addPoints(points);
  }

  getPlayersInRange(): PlayerCollection {
    return this.game.players
      .filter((player) => player.lives > 0)
      .filter((player) => {
        const disX = Math.abs(this.coords.x - player.coords.x);
        const disY = Math.abs(this.coords.y - player.coords.y);
        const dis = Math.max(disX, disY);
        return Math.floor(dis) <= this.range;
      }) as PlayerCollection;
  }
}
