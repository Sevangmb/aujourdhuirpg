
/**
 * @fileOverview Skill check calculation logic.
 * This module provides functions to perform skill checks based on player abilities,
 * stats, and situational factors against a difficulty target.
 */

import type { AdvancedSkillSystem, PlayerStats, IntelligentItem, AdvancedPhysiologySystem, SkillDetail, MomentumSystem } from './types';

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

const skillToAttributeMap: { [skillPath: string]: (keyof PlayerStats)[] } = {
    // Physiques
    'physiques.combat_mains_nues': ['Force', 'Dexterite'],
    'physiques.arme_blanche': ['Force', 'Dexterite'],
    'physiques.arme_de_tir': ['Dexterite', 'Perception'],
    'physiques.arme_a_feu': ['Dexterite', 'Perception'],
    'physiques.pilotage_monture': ['Dexterite', 'Perception'],
    'physiques.pilotage_vehicules': ['Dexterite', 'Technique'],
    'physiques.pilotage_spatial': ['Dexterite', 'Technique'],
    'physiques.esquive': ['Dexterite'],
    'physiques.natation': ['Force', 'Constitution'],
    'physiques.escalade': ['Force', 'Dexterite'],
    'physiques.discretion_skill': ['Discretion', 'Dexterite'],
    // Techniques
    'techniques.artisanat_general': ['Technique'],
    'techniques.forge_metallurgie': ['Force', 'Technique'],
    'techniques.maconnerie_construction': ['Force', 'Technique'],
    'techniques.menuiserie': ['Technique'],
    'techniques.couture_tissage': ['Dexterite', 'Technique'],
    'techniques.joaillerie': ['Dexterite', 'Technique'],
    'techniques.navigation': ['Intelligence', 'Perception'],
    'techniques.mecanique': ['Technique'],
    'techniques.electronique': ['Technique', 'Savoir'],
    'techniques.informatique_hacking': ['Technique', 'Intelligence'],
    'techniques.ingenierie_spatiale': ['Technique', 'Intelligence'],
    'techniques.contrefacon': ['Dexterite', 'Technique'],
    // Survie
    'survie.pistage': ['Perception'],
    'survie.orientation': ['Intelligence', 'Perception'],
    'survie.chasse_peche': ['Perception', 'Dexterite'],
    'survie.herboristerie': ['Perception', 'Savoir'],
    'survie.premiers_secours': ['Intelligence', 'Savoir'],
    'survie.medecine': ['Intelligence', 'Savoir'],
    'survie.survie_generale': ['Constitution', 'Perception'],
    // Sociales
    'sociales.persuasion': ['Charisme'],
    'sociales.seduction': ['Charisme'],
    'sociales.intimidation': ['Force', 'Charisme'],
    'sociales.tromperie_baratin': ['Charisme', 'Intelligence'],
    'sociales.commandement': ['Charisme', 'Volonte'],
    'sociales.etiquette': ['Charisme', 'Savoir'],
    // Savoir
    'savoir.histoire': ['Savoir', 'Intelligence'],
    'savoir.geographie': ['Savoir', 'Perception'],
    'savoir.theologie_religions': ['Savoir', 'MagieOccultisme'],
    'savoir.sciences_naturelles': ['Savoir', 'Intelligence'],
    'savoir.alchimie_chimie': ['Savoir', 'Intelligence'],
    'savoir.occultisme_magie_theorique': ['Savoir', 'MagieOccultisme'],
    'savoir.astrologie_astronomie': ['Savoir', 'Intelligence'],
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

const getPhysiologyPenalty = (physiology: AdvancedPhysiologySystem, stats: PlayerStats): number => {
    let penalty = 0;
    const { hunger, thirst } = physiology.basic_needs;
    const { Energie } = stats;

    if (hunger.level < 10) penalty -= 12;
    else if (hunger.level < 30) penalty -= 8;
    else if (hunger.level < 50) penalty -= 5;
    else if (hunger.level < 70) penalty -= 2;

    if (thirst.level < 10) penalty -= 15;
    else if (thirst.level < 20) penalty -= 10;
    else if (thirst.level < 40) penalty -= 6;
    else if (thirst.level < 60) penalty -= 3;
    
    if (Energie.value < 10) penalty -= 10;
    else if (Energie.value < 30) penalty -= 5;

    return penalty;
};


function getStatModifier(stats: PlayerStats, skillPath: string): number {
  const relevantStats = skillToAttributeMap[skillPath];
  if (!relevantStats || relevantStats.length === 0) {
    return 0;
  }
  
  const highestStatValue = Math.max(...relevantStats.map(statName => stats[statName]?.value || 0));

  // A bonus of +1 for every 10 points in the relevant stat
  return Math.floor(highestStatValue / 10);
}


export function performSkillCheck(
  skills: AdvancedSkillSystem,
  stats: PlayerStats,
  skillPath: string,
  difficultyTarget: number,
  inventory: IntelligentItem[],
  situationalModifiers: number = 0,
  physiology: AdvancedPhysiologySystem,
  momentum: MomentumSystem
): SkillCheckResult {
  const skillDetail = getSkillValueByPath(skills, skillPath);
  const baseSkillValue = skillDetail.level;

  const statModifierValue = getStatModifier(stats, skillPath);

  const itemContributions: { name: string; bonus: number }[] = [];
  const itemModifierValue = inventory.reduce((total, item) => {
    if (item.skillModifiers && item.skillModifiers[skillPath]) {
      const bonus = item.skillModifiers[skillPath]!;
      itemContributions.push({ name: item.name, bonus });
      return total + bonus;
    }
    return total;
  }, 0);

  const cappedItemModifierValue = Math.min(itemModifierValue, 15);
  
  const physiologicalModifiers = getPhysiologyPenalty(physiology, stats);
  const momentumBonus = momentum.momentum_bonus - momentum.desperation_bonus; // Desperation is a negative modifier in the context of a bonus
  const luckModifier = Math.floor(stats.ChanceDestin.value / 10);

  const totalModifier = baseSkillValue + statModifierValue + cappedItemModifierValue + situationalModifiers + physiologicalModifiers + momentumBonus + luckModifier;
  const rollValue = Math.floor(Math.random() * 100) + 1;
  const totalAchieved = rollValue + totalModifier;

  const success = totalAchieved >= difficultyTarget;
  const margin = totalAchieved - difficultyTarget;

  let degreeOfSuccess: DegreeOfSuccess;
  if (rollValue >= CRITICAL_SUCCESS_ROLL_THRESHOLD || (success && rollValue + stats.ChanceDestin.value >= 100)) {
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
    situationalModifierValue: situationalModifiers + physiologicalModifiers + momentumBonus + luckModifier,
    effectiveScore: totalModifier,
    totalAchieved,
    difficultyTarget,
    margin,
  };
}

export function calculateSuccessProbability(
  skills: AdvancedSkillSystem,
  stats: PlayerStats,
  skillPath: string,
  difficultyTarget: number,
  inventory: IntelligentItem[],
  situationalModifiers: number = 0,
  physiology: AdvancedPhysiologySystem,
  momentum: MomentumSystem
): number {
  const skillDetail = getSkillValueByPath(skills, skillPath);
  const baseSkillValue = skillDetail.level;

  const statModifierValue = getStatModifier(stats, skillPath);

  const itemModifierValue = inventory.reduce((total, item) => {
    if (item.skillModifiers && item.skillModifiers[skillPath]) {
      return total + item.skillModifiers[skillPath]!;
    }
    return total;
  }, 0);
  const cappedItemModifierValue = Math.min(itemModifierValue, 15);

  const physiologicalModifiers = getPhysiologyPenalty(physiology, stats);
  const momentumBonus = momentum.momentum_bonus - momentum.desperation_bonus;
  const luckModifier = Math.floor(stats.ChanceDestin.value / 10);

  const effectiveScore = baseSkillValue + statModifierValue + cappedItemModifierValue + situationalModifiers + physiologicalModifiers + momentumBonus + luckModifier;
  const requiredRoll = difficultyTarget - effectiveScore;
  const successChance = 101 - requiredRoll;

  // Probability is capped between 5% and 95% to always leave room for chance.
  return Math.round(Math.max(5, Math.min(95, successChance)));
}
