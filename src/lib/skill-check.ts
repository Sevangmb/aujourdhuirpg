/**
 * @fileOverview Skill check calculation logic.
 * This module provides functions to perform skill checks based on player abilities,
 * stats, and situational factors against a difficulty target.
 */

import type { Skills, PlayerStats } from './types';

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

const skillToStatMap: Record<string, keyof PlayerStats> = {
  Perception: 'Intelligence',
  Dialogue: 'Charisme',
  Discretion: 'Intelligence',
  Informatique: 'Intelligence',
  Survie: 'Force',
  // Add other skill-to-stat mappings here as needed
};

/**
 * Performs a skill check for a player using a D100 + modifiers vs. difficulty system.
 *
 * @param skills The player's skills object (e.g., { "Informatique": 10, "Discretion": 5 }).
 * @param stats The player's stats object to derive modifiers.
 * @param skillName The name of the skill being checked (e.g., "Informatique").
 * @param difficultyTarget The target number the player needs to meet or exceed for a success.
 * @param situationalModifiers Optional situational modifiers (e.g., +10 for good tools, -5 for bad lighting).
 * @returns A SkillCheckResult object detailing the outcome of the check.
 */
export function performSkillCheck(
  skills: Skills,
  stats: PlayerStats,
  skillName: string,
  difficultyTarget: number,
  situationalModifiers: number = 0
): SkillCheckResult {
  const baseSkillValue = skills[skillName] || 0;

  // Calculate the modifier from the relevant stat (e.g., Intelligence for Perception)
  const controllingStatName = skillToStatMap[skillName];
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
    skillUsed: skillName,
    baseSkillValue,
    statModifierValue,
    situationalModifierValue: situationalModifiers,
    effectiveScore: totalModifier, // This is the total bonus added to the roll
    totalAchieved,
    difficultyTarget,
    margin,
  };
}
