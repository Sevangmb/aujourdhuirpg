/**
 * @fileOverview Defines the available historical eras for the game.
 */

export const AVAILABLE_ERAS = ["Antiquité", "Moyen-Âge", "Renaissance", "Époque Moderne", "Époque Contemporaine"] as const;
export type GameEra = typeof AVAILABLE_ERAS[number];

export const ERA_YEARS: Record<GameEra, { start: number; end: number }> = {
    'Antiquité': { start: -800, end: 476 },
    'Moyen-Âge': { start: 477, end: 1492 },
    'Renaissance': { start: 1493, end: 1610 },
    'Époque Moderne': { start: 1611, end: 1789 },
    'Époque Contemporaine': { start: 1790, end: new Date().getFullYear() },
};
