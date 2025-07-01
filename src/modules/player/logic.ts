/**
 * @fileOverview Contains the core business logic for the Player module.
 * This will eventually replace parts of lib/player-state-helpers.ts.
 */
import type { Player, Progression, AdvancedSkillSystem, PlayerStats } from './types';
import type { GameEvent } from '@/lib/types';

export function calculateXpToNextLevel(level: number): number {
  if (level <= 0) level = 1;
  return level * 100 + 50 * (level - 1) * level;
}

export function addXp(currentProgression: Progression, xpGained: number): { newProgression: Progression, events: GameEvent[] } {
  const newProgression = { ...currentProgression };
  const events: GameEvent[] = [];

  if (typeof newProgression.level !== 'number' || newProgression.level <= 0) newProgression.level = 1;
  if (typeof newProgression.xp !== 'number' || newProgression.xp < 0) newProgression.xp = 0;
  if (typeof newProgression.xpToNextLevel !== 'number' || newProgression.xpToNextLevel <= 0) {
    newProgression.xpToNextLevel = calculateXpToNextLevel(newProgression.level);
  }

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

export function applyStatChanges(currentStats: PlayerStats, changes: Partial<Record<keyof PlayerStats, number>>): PlayerStats {
  const newStats = JSON.parse(JSON.stringify(currentStats));
  for (const key in changes) {
    if (Object.prototype.hasOwnProperty.call(newStats, key)) {
      const statKey = key as keyof PlayerStats;
      const changeValue = changes[statKey] || 0;
      const statToChange = newStats[statKey];

      const newValue = statToChange.value + changeValue;
      const maxValue = statToChange.max !== undefined ? statToChange.max : newValue;
      statToChange.value = Math.max(0, Math.min(newValue, maxValue));
    }
  }
  return newStats;
}


export function applySkillGains(currentSkills: AdvancedSkillSystem, gains: Record<string, number>): { updatedSkills: AdvancedSkillSystem, notifications: string[] } {
    const newSkills = JSON.parse(JSON.stringify(currentSkills)); // Deep copy
    const notifications: string[] = [];

    for (const skillPath in gains) {
        if (Object.prototype.hasOwnProperty.call(gains, skillPath)) {
            const pathParts = skillPath.split('.');
            if (pathParts.length === 2) {
                const [category, subSkill] = pathParts as [keyof AdvancedSkillSystem, string];
                const categorySkills = newSkills[category];
                if (categorySkills && typeof (categorySkills as any)[subSkill] === 'number') {
                    (categorySkills as any)[subSkill] += gains[skillPath];
                    const skillName = subSkill.charAt(0).toUpperCase() + subSkill.slice(1).replace(/_/g, ' ');
                    notifications.push(`${skillName} a augmenté de +${gains[skillPath]}.`);
                }
            }
        }
    }
    return { updatedSkills: newSkills, notifications };
}