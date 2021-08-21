import { Collection, User } from 'discord.js';
import { IPlayer } from './types';

export class PlayerCollection extends Collection<IPlayer['id'], IPlayer> {

  public constructor(
    entries?: readonly (readonly [IPlayer['id'], IPlayer])[] | null
  ) {
    super(entries);
  }

  public getPlayerFromDiscordUser(user: User): IPlayer | null {
    return this.find((player) => player.userId === user.id) ?? null;
  }

  public getAlivePlayers(): Collection<string, IPlayer> {
    return this.filter((player) => player.lives > 0);
  }
}
