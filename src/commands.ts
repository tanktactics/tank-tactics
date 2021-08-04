import { SlashCommandBuilder } from '@discordjs/builders';

export const boardCommand = new SlashCommandBuilder()
    .setName('board')
    .setDescription('Get an up-to-date view of the board');

export const posCommand = new SlashCommandBuilder().setName('pos').setDescription('Get your in-game coordinates');

export const rangeCommand = new SlashCommandBuilder()
    .setName('range')
    .setDescription('Trade 2 AP for a range increase');

export const walkCommand = new SlashCommandBuilder()
    .setName('walk')
    .setDescription('Use 1 AP to walk in any of 8 direction')
    .addStringOption((option) =>
        option
            .setName('direction')
            .setDescription('The direction you want to walk in')
            .setRequired(true)
            .addChoices([
                ['Up', 'up'],
                ['Upper left', 'up_left'],
                ['Upper right', 'up_right'],
                ['Left', 'left'],
                ['Right', 'right'],
                ['Down', 'down'],
                ['Bottom right', 'down_right'],
                ['Bottom left', 'down_left'],
            ]),
    )
    .addIntegerOption((option) =>
        option.setName('step_count').setDescription('The amount of times to repeat this action').setRequired(false),
    );

export const attackCommand = new SlashCommandBuilder()
    .setName('attack')
    .setDescription('Attack someone, taking 1 HP if they are in range')
    .addUserOption((option) =>
        option.setName('victim').setDescription('The person you want to kill').setRequired(true),
    );

export const createCommand = new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a game with the specified members')
    .addIntegerOption((option) =>
        option
            .setName('ap_interval')
            .setDescription('The amount of minutes it takes to give everyone 1 AP')
            .setRequired(true),
    );

for (let i = 0; i < 20; i++) {
    createCommand.addUserOption((option) =>
        option
            .setName(`player_${i + 1}`)
            .setDescription('A player to play in your match')
            .setRequired(i < 3),
    );
}

export const giftCommand = new SlashCommandBuilder()
    .setName('gift')
    .setDescription('Gift someone in your range a set amount of AP')
    .addUserOption((option) =>
        option.setName('receiver').setDescription('The person you want to gift AP').setRequired(true),
    )
    .addIntegerOption((option) =>
        option.setName('ap_count').setDescription('The amount of AP you want to donate').setRequired(true),
    );
