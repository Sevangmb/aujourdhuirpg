
/**
 * @fileOverview Skill check calculation logic.
 * This module provides functions to perform skill checks based on player abilities,
 * stats, and situational factors against a difficulty target.
 */

import type { AdvancedSkillSystem, PlayerStats, IntelligentItem, AdvancedPhysiologySystem, SkillDetail } from './types';

export type DegreeOfSuccess = 'critical_failure' | 'failure' | 'success' | 'critical_success';

export interface SkillCheckResult {
  success: boolean;
  degreeOfSuccess: DegreeOfSuccess;
  rollValue: number;
  skillUsed: string;
  baseSkillValue: number;
  statModifierValue: number;
  itemModifierValue: number; 
  itemContributions: { name: string; bonus: number }[];
  situationalModifierValue: number;
  effectiveScore: number;
  totalAchieved: number;
  difficultyTarget: number;
  margin: number;
}

const CRITICAL_SUCCESS_ROLL_THRESHOLD = 95;
const CRITICAL_FAILURE_ROLL_THRESHOLD = 5;

const skillCategoryToStatMap: { [key in keyof AdvancedSkillSystem]: keyof PlayerStats } = {
  cognitive: 'Intelligence',
  social: 'Charisme',
  physical: 'Force',
  technical: 'Intelligence',
  survival: 'Intelligence',
};

function getSkillValueByPath(skills: AdvancedSkillSystem, path: string): SkillDetail {
    const pathParts = path.split('.');
    if (pathParts.length !== 2) return { level: 0, xp: 0, xpToNext: 0 };

    const [category, subSkill] = pathParts as [keyof AdvancedSkillSystem, string];
    const categorySkills = skills[category];

    if (categorySkills && typeof (categorySkills as any)[subSkill] === 'object') {
        return (categorySkills as any)[subSkill];
    }
    return { level: 0, xp: 0, xpToNext: 0 };
}

const getPhysiologyPenalty = (physiology: AdvancedPhysiologySystem): number => {
    let penalty = 0;
    const { hunger, thirst } = physiology.basic_needs;
    // Hunger penalties (gradual)
    if (hunger.level < 10) penalty -= 12;
    else if (hunger.level < 30) penalty -= 8;
    else if (hunger.level < 50) penalty -= 5;
    else if (hunger.level < 70) penalty -= 2;

    // Thirst penalties (more severe)
    if (thirst.level < 10) penalty -= 15;
    else if (thirst.level < 20) penalty -= 10;
    else if (thirst.level < 40) penalty -= 6;
    else if (thirst.level < 60) penalty -= 3;
    
    return penalty;
};

function getSpecializationBonus(skills: AdvancedSkillSystem, skillPath: string): number {
  const categoryName = skillPath.split('.')[0] as keyof AdvancedSkillSystem;
  if (!skills[categoryName]) return 0;

  const categorySkills = skills[categoryName];
  const skillValues = Object.values(categorySkills).map((skill: any) => skill.level);
  if (skillValues.length === 0) return 0;

  const avgCategoryLevel = skillValues.reduce((a, b) => a + b, 0) / skillValues.length;
  // +1 bonus for every 10 average points in the category
  return Math.floor(avgCategoryLevel / 10);
};


/**
 * Performs a skill check for a player using a D100 + modifiers vs. difficulty system.
 *
 * @param skills The player's advanced, categorized skills object.
 * @param stats The player's stats object to derive modifiers.
 * @param skillPath The path to the skill being checked (e.g., "cognitive.observation").
 * @param difficultyTarget The target number for the check.
 * @param inventory The player's current inventory to check for item modifiers.
 * @param situationalModifiers Optional circumstantial modifiers (e.g., weather).
 * @param physiology The player's current physiological state.
 * @returns A SkillCheckResult object detailing the outcome.
 */
export function performSkillCheck(
  skills: AdvancedSkillSystem,
  stats: PlayerStats,
  skillPath: string,
  difficultyTarget: number,
  inventory: IntelligentItem[],
  situationalModifiers: number = 0,
  physiology: AdvancedPhysiologySystem
): SkillCheckResult {
  const skillDetail = getSkillValueByPath(skills, skillPath);
  const baseSkillValue = skillDetail.level;
  const category = skillPath.split('.')[0] as keyof AdvancedSkillSystem;

  const controllingStatName = skillCategoryToStatMap[category];
  const controllingStatValue = controllingStatName ? (stats[controllingStatName]?.value || 0) : 0;
  
  // Rebalanced Stat Modifier (logarithmic style curve)
  const statModifierValue = controllingStatValue > 50 ? Math.floor(Math.sqrt(controllingStatValue - 50) * 2) : 0;

  const itemContributions: { name: string; bonus: number }[] = [];
  const itemModifierValue = inventory.reduce((total, item) => {
    if (item.skillModifiers && item.skillModifiers[skillPath]) {
      const bonus = item.skillModifiers[skillPath]!;
      itemContributions.push({ name: item.name, bonus });
      return total + bonus;
    }
    return total;
  }, 0);

  // Capped item bonus
  const cappedItemModifierValue = Math.min(itemModifierValue, 15);
  
  const physiologicalModifiers = getPhysiologyPenalty(physiology);
  
  const specializationBonus = getSpecializationBonus(skills, skillPath);

  const totalModifier = baseSkillValue + statModifierValue + cappedItemModifierValue + situationalModifiers + physiologicalModifiers + specializationBonus;
  const rollValue = Math.floor(Math.random() * 100) + 1;
  const totalAchieved = rollValue + totalModifier;

  const success = totalAchieved >= difficultyTarget;
  const margin = totalAchieved - difficultyTarget;

  let degreeOfSuccess: DegreeOfSuccess;
  if (rollValue >= CRITICAL_SUCCESS_ROLL_THRESHOLD) {
    degreeOfSuccess = 'critical_success';
  } else if (rollValue <= CRITICAL_FAILURE_ROLL_THRESHOLD) {
    degreeOfSuccess = 'critical_failure';
  } else {
    degreeOfSuccess = success ? 'success' : 'failure';
  }

  return {
    success: degreeOfSuccess.includes('success'),
    degreeOfSuccess,
    rollValue,
    skillUsed: skillPath,
    baseSkillValue,
    statModifierValue,
    itemModifierValue: cappedItemModifierValue,
    itemContributions,
    situationalModifierValue: situationalModifiers + physiologicalModifiers + specializationBonus,
    effectiveScore: totalModifier,
    totalAchieved,
    difficultyTarget,
    margin,
  };
}

/**
 * Calculates the probability of success for a skill check for display purposes.
 * @param skills The player's skills object.
 * @param stats The player's stats object.
 * @param skillPath The path to the skill being checked.
 * @param difficultyTarget The target difficulty for the check.
 * @param inventory The player's inventory.
 * @param situationalModifiers Any situational modifiers.
 * @param physiology The player's current physiological state.
 * @returns A number representing the percentage chance of success (clamped between 6% and 95%).
 */
export function calculateSuccessProbability(
  skills: AdvancedSkillSystem,
  stats: PlayerStats,
  skillPath: string,
  difficultyTarget: number,
  inventory: IntelligentItem[],
  situationalModifiers: number = 0,
  physiology: AdvancedPhysiologySystem
): number {
  const skillDetail = getSkillValueByPath(skills, skillPath);
  const baseSkillValue = skillDetail.level;
  const category = skillPath.split('.')[0] as keyof AdvancedSkillSystem;

  const controllingStatName = skillCategoryToStatMap[category];
  const controllingStatValue = controllingStatName ? (stats[controllingStatName]?.value || 0) : 0;
  const statModifierValue = controllingStatValue > 50 ? Math.floor(Math.sqrt(controllingStatValue - 50) * 2) : 0;

  const itemModifierValue = inventory.reduce((total, item) => {
    if (item.skillModifiers && item.skillModifiers[skillPath]) {
      return total + item.skillModifiers[skillPath]!;
    }
    return total;
  }, 0);
  const cappedItemModifierValue = Math.min(itemModifierValue, 15);

  const physiologicalModifiers = getPhysiologyPenalty(physiology);
  
  const specializationBonus = getSpecializationBonus(skills, skillPath);

  const effectiveScore = baseSkillValue + statModifierValue + cappedItemModifierValue + situationalModifiers + physiologicalModifiers + specializationBonus;
  const requiredRoll = difficultyTarget - effectiveScore;
  const successChance = 101 - requiredRoll;

  return Math.round(Math.max(6, Math.min(95, successChance)));
}
