import { TankTacticsGame } from './TankTactics';
import * as fs from 'fs';
import { GameEventType } from './types';
import { gameToCanvas } from './canvasCreation';

export const saveScreenshot = async (game: TankTacticsGame) => {
    const gameCopy = new TankTacticsGame(game.toJSON(), false);
    const worthyLogs: GameEventType[] = ['attack', 'gift', 'range_increase', 'walk'];
    const relevantLogs = gameCopy.log.filter((v) => worthyLogs.includes(v.type));
    const i = relevantLogs.length.toString().padStart(5, '0');
    console.log(`Saving screenshot ${i}`);

    // @ts-ignore
    const canvas = await gameToCanvas(gameCopy);

    if (!fs.existsSync(`game-imgs/`)) fs.mkdirSync(`game-imgs/`);

    if (!fs.existsSync(`game-imgs/${gameCopy.name}/`)) fs.mkdirSync(`game-imgs/${gameCopy.name}/`);

    const url = canvas.toDataURL();
    const base64Data = url.replace(/^data:image\/png;base64,/, '');

    fs.writeFileSync(`game-imgs/${gameCopy.name}/${i}.png`, base64Data, 'base64');
};
