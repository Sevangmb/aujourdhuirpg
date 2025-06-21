
/**
 * @fileOverview Skill check calculation logic.
 * This module provides functions to perform skill checks based on player abilities,
 * stats (in the future), and situational factors against a difficulty target.
 */

import type { Skills, PlayerStats } from './types'; // Assuming types will be re-exported via './types' or adjust path

export type DegreeOfSuccess = 'critical_failure' | 'failure' | 'success' | 'critical_success';

export interface SkillCheckResult {
  success: boolean;
  degreeOfSuccess: DegreeOfSuccess;
  rollValue: number;          // The D100 roll (1-100)
  skillUsed: string;          // The name of the skill checked
  baseSkillValue: number;     // The player's raw value in that skill
  statModifierValue: number;  // Modifier derived from player stats (e.g., Intelligence for Hacking)
  situationalModifierValue: number; // Any circumstantial bonus/penalty (e.g., tools, environment)
  effectiveScore: number;     // baseSkillValue + statModifierValue + situationalModifierValue (the value before rolling)
  totalAchieved: number;      // effectiveScore + rollValue
  difficultyTarget: number;   // The target number the player needed to meet or exceed
  margin: number;             // How much the totalAchieved was over (positive) or under (negative) the difficultyTarget
}

const CRITICAL_SUCCESS_ROLL_THRESHOLD = 95; // Roll of 95-100
const CRITICAL_FAILURE_ROLL_THRESHOLD = 5;   // Roll of 1-5
const CRITICAL_SUCCESS_MARGIN_THRESHOLD = 20;
const CRITICAL_FAILURE_MARGIN_THRESHOLD = -20; // Note: this is margin, so a large negative number

/**
 * Performs a skill check for a player.
 *
 * @param skills The player's skills object (e.g., { "Informatique": 10, "Discretion": 5 }).
 * @param stats The player's stats object (currently unused for direct modifiers, but available for future expansion).
 * @param skillName The name of the skill being checked (e.g., "Informatique").
 * @param difficultyTarget The target number the player needs to meet or exceed for a success.
 * @param situationalModifiers Optional situational modifiers (e.g., +10 for having good tools, -5 for bad lighting). Defaults to 0.
 * @returns A SkillCheckResult object detailing the outcome of the check.
 */
export function performSkillCheck(
  skills: Skills,
  stats: PlayerStats, // Currently unused for direct statModifierValue, but passed for future use
  skillName: string,
  difficultyTarget: number,
  situationalModifiers: number = 0
): SkillCheckResult {
  const baseSkillValue = skills[skillName] || 0;
  const statModifierValue = 0; // Placeholder: In the future, this could be derived from 'stats' (e.g., stats.Intelligence / 10 for hacking)

  const rollValue = Math.floor(Math.random() * 100) + 1; // D100 roll (1-100)

  const effectiveScore = baseSkillValue + statModifierValue + situationalModifiers;
  const totalAchieved = effectiveScore + rollValue;
  const success = totalAchieved >= difficultyTarget;
  const margin = totalAchieved - difficultyTarget;

  let degreeOfSuccess: DegreeOfSuccess = success ? 'success' : 'failure';

  if (success) {
    if (rollValue >= CRITICAL_SUCCESS_ROLL_THRESHOLD || margin >= CRITICAL_SUCCESS_MARGIN_THRESHOLD) {
      degreeOfSuccess = 'critical_success';
    }
  } else { // Failure
    if (rollValue <= CRITICAL_FAILURE_ROLL_THRESHOLD || margin <= CRITICAL_FAILURE_MARGIN_THRESHOLD) {
      degreeOfSuccess = 'critical_failure';
    }
  }

  return {
    success,
    degreeOfSuccess,
    rollValue,
    skillUsed: skillName,
    baseSkillValue,
    statModifierValue,
    situationalModifierValue: situationalModifiers, // Corrected this to use the parameter
    effectiveScore,
    totalAchieved,
    difficultyTarget,
    margin,
  };
}
