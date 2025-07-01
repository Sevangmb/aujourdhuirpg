/**
 * @fileOverview Contains the core business logic for the Player module.
 * This will eventually replace parts of lib/player-state-helpers.ts.
 */
import type { Player, Progression } from './types';
import type { GameEvent } from '@/lib/types';

export function calculateXpToNextLevel(level: number): number {
  if (level <= 0) level = 1;
  return level * 100 + 50 * (level - 1) * level;
}

export function addXp(currentProgression: Progression, xpGained: number): { newProgression: Progression, events: GameEvent[] } {
  const newProgression = { ...currentProgression };
  const events: GameEvent[] = [];

  newProgression.xp += xpGained;
  events.push({ type: 'XP_GAINED', amount: xpGained });

  while (newProgression.xp >= newProgression.xpToNextLevel && newProgression.xpToNextLevel > 0) {
    newProgression.level += 1;
    newProgression.xp -= newProgression.xpToNextLevel;
    newProgression.xpToNextLevel = calculateXpToNextLevel(newProgression.level);
    events.push({ type: 'PLAYER_LEVELED_UP', newLevel: newProgression.level });
  }

  if (newProgression.xp < 0) newProgression.xp = 0;

  return { newProgression, events };
}

// More player-specific logic will be migrated here...
