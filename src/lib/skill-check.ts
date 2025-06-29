/**
 * @fileOverview Skill check calculation logic.
 * This module provides functions to perform skill checks based on player abilities,
 * stats, and situational factors against a difficulty target.
 */

import type { AdvancedSkillSystem, PlayerStats } from './types';

export type DegreeOfSuccess = 'critical_failure' | 'failure' | 'success' | 'critical_success';

export interface SkillCheckResult {
  success: boolean;
  degreeOfSuccess: DegreeOfSuccess;
  rollValue: number;          // The D100 roll (1-100)
  skillUsed: string;          // The name of the skill checked
  baseSkillValue: number;     // The player's raw value in that skill
  statModifierValue: number;  // Modifier derived from player stats
  situationalModifierValue: number; // Any circumstantial bonus/penalty
  effectiveScore: number;     // The total modifier (baseSkill + statMod + situationalMod)
  totalAchieved: number;      // rollValue + effectiveScore
  difficultyTarget: number;   // The target number the player needed to meet or exceed
  margin: number;             // How much the totalAchieved was over (positive) or under (negative) the difficultyTarget
}

const CRITICAL_SUCCESS_ROLL_THRESHOLD = 95; // Roll of 95-100 is always a critical success
const CRITICAL_FAILURE_ROLL_THRESHOLD = 5;   // Roll of 1-5 is always a critical failure

const skillCategoryToStatMap: { [key in keyof AdvancedSkillSystem]: keyof PlayerStats } = {
  cognitive: 'Intelligence',
  social: 'Charisme',
  physical: 'Force',
  technical: 'Intelligence',
  survival: 'Intelligence',
};

function getSkillValueByPath(skills: AdvancedSkillSystem, path: string): number {
    const pathParts = path.split('.');
    if (pathParts.length !== 2) return 0;

    const [category, subSkill] = pathParts as [keyof AdvancedSkillSystem, string];
    const categorySkills = skills[category];

    if (categorySkills && typeof (categorySkills as any)[subSkill] === 'number') {
        return (categorySkills as any)[subSkill];
    }
    return 0;
}

/**
 * Performs a skill check for a player using a D100 + modifiers vs. difficulty system.
 *
 * @param skills The player's advanced, categorized skills object.
 * @param stats The player's stats object to derive modifiers.
 * @param skillPath The path to the skill being checked (e.g., "cognitive.observation").
 * @param difficultyTarget The target number the player needs to meet or exceed for a success.
 * @param situationalModifiers Optional situational modifiers (e.g., +10 for good tools, -5 for bad lighting).
 * @returns A SkillCheckResult object detailing the outcome of the check.
 */
export function performSkillCheck(
  skills: AdvancedSkillSystem,
  stats: PlayerStats,
  skillPath: string,
  difficultyTarget: number,
  situationalModifiers: number = 0
): SkillCheckResult {
  const baseSkillValue = getSkillValueByPath(skills, skillPath);
  const category = skillPath.split('.')[0] as keyof AdvancedSkillSystem;

  // Calculate the modifier from the relevant stat (e.g., Intelligence for cognitive skills)
  const controllingStatName = skillCategoryToStatMap[category];
  const controllingStatValue = controllingStatName ? (stats[controllingStatName] || 0) : 0;
  const statModifierValue = Math.floor(controllingStatValue / 10); // e.g., 50 INT gives a +5 bonus

  const totalModifier = baseSkillValue + statModifierValue + situationalModifiers;
  const rollValue = Math.floor(Math.random() * 100) + 1; // D100 roll (1-100)
  const totalAchieved = rollValue + totalModifier;

  const success = totalAchieved >= difficultyTarget;
  const margin = totalAchieved - difficultyTarget;

  let degreeOfSuccess: DegreeOfSuccess;

  // Determine the degree of success, with rolls of 1-5 and 95-100 being automatic criticals.
  if (rollValue >= CRITICAL_SUCCESS_ROLL_THRESHOLD) {
    degreeOfSuccess = 'critical_success';
  } else if (rollValue <= CRITICAL_FAILURE_ROLL_THRESHOLD) {
    degreeOfSuccess = 'critical_failure';
  } else {
    degreeOfSuccess = success ? 'success' : 'failure';
  }

  return {
    success: degreeOfSuccess.includes('success'), // True for 'success' and 'critical_success'
    degreeOfSuccess,
    rollValue,
    skillUsed: skillPath,
    baseSkillValue,
    statModifierValue,
    situationalModifierValue: situationalModifiers,
    effectiveScore: totalModifier, // This is the total bonus added to the roll
    totalAchieved,
    difficultyTarget,
    margin,
  };
}
