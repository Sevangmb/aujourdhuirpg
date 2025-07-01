/**
 * @fileOverview Contains the core business logic for the Player module.
 * This will eventually replace parts of lib/player-state-helpers.ts.
 */
import type { Player, Progression, AdvancedSkillSystem, PlayerStats, SkillDetail } from './types';
import type { GameEvent } from '@/lib/types';

export function calculateXpToNextLevel(level: number): number {
  if (level <= 0) level = 1;
  return level * 100 + 50 * (level - 1) * level;
}

export function getSkillUpgradeCost(currentLevel: number): number {
  if (currentLevel <= 0) currentLevel = 1;
  // Formula from user's plan
  return Math.floor(currentLevel * currentLevel * 1.5) + 20;
}

export function applySkillXp(currentSkills: AdvancedSkillSystem, skillPath: string, xpGained: number): { updatedSkills: AdvancedSkillSystem, leveledUp: boolean, newLevel?: number } {
  const newSkills = JSON.parse(JSON.stringify(currentSkills));
  const pathParts = skillPath.split('.');
  
  if (pathParts.length !== 2) {
    return { updatedSkills: newSkills, leveledUp: false };
  }

  const [category, subSkill] = pathParts as [keyof AdvancedSkillSystem, string];
  const skillCategory = newSkills[category];
  if (!skillCategory || !(subSkill in skillCategory)) {
    return { updatedSkills: newSkills, leveledUp: false };
  }

  const skill: SkillDetail = (skillCategory as any)[subSkill];
  
  skill.xp += xpGained;
  let leveledUp = false;
  let newLevel: number | undefined;

  while (skill.xp >= skill.xpToNext) {
    leveledUp = true;
    skill.level += 1;
    skill.xp -= skill.xpToNext;
    skill.xpToNext = getSkillUpgradeCost(skill.level);
    newLevel = skill.level;
  }

  (newSkills[category] as any)[subSkill] = skill;

  return { updatedSkills: newSkills, leveledUp, newLevel };
}

export function getSkillXp(difficulty: number, success: boolean): number {
  const baseXP = Math.floor(difficulty / 10);
  return success ? baseXP : Math.floor(baseXP / 2);
}

export function addPlayerXp(currentProgression: Progression, xpGained: number): { newProgression: Progression, events: GameEvent[] } {
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
