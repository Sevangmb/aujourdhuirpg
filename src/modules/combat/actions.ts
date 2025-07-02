/**
 * @fileOverview Actions de combat de base disponibles pour tous les joueurs.
 * Ce fichier contient les actions fondamentales du système de combat.
 */

import type { CombatAction } from './types';

/**
 * Actions de base que tous les joueurs peuvent utiliser
 */
export const BASIC_PLAYER_ACTIONS: CombatAction[] = [
  {
    id: 'attack_basic',
    type: 'attack',
    name: 'Attaque basique',
    description: 'Une attaque physique simple mais efficace.',
    iconName: 'Sword',
    energyCost: 10,
    accuracy: 85,
    criticalChance: 10,
    damage: {
      base: 15,
      scaling: 'force',
      variance: 0.3
    }
  },
  
  {
    id: 'defend',
    type: 'defend', 
    name: 'Se défendre',
    description: 'Adopter une posture défensive pour réduire les dégâts.',
    iconName: 'Shield',
    energyCost: 0,
    accuracy: 100,
    statusEffects: [{
      target: 'self',
      effect: {
        name: 'Défense',
        description: 'Dégâts réduits de 50%',
        type: 'buff',
        duration: 1,
        effects: { defense: 50 },
        icon: 'Shield'
      },
      chance: 100
    }]
  },

  {
    id: 'flee',
    type: 'flee',
    name: 'Fuir',
    description: 'Tenter de s\'échapper du combat.',
    iconName: 'ArrowRight',
    energyCost: 5,
    accuracy: 60 // Chance de base, sera modifiée par la logique
  },

  {
    id: 'wait',
    type: 'wait',
    name: 'Attendre',
    description: 'Passer son tour pour récupérer de l\'énergie.',
    iconName: 'Clock',
    energyCost: -10, // Récupère de l'énergie
    accuracy: 100
  }
];

/**
 * Actions avancées débloquées par les compétences
 */
export const SKILL_BASED_ACTIONS: CombatAction[] = [
  {
    id: 'power_attack',
    type: 'skill',
    name: 'Attaque puissante',
    description: 'Une attaque qui fait plus de dégâts mais coûte plus d\'énergie.',
    iconName: 'Zap',
    energyCost: 20,
    accuracy: 70,
    criticalChance: 20,
    damage: {
      base: 25,
      scaling: 'force',
      variance: 0.2
    },
    requiredSkill: {
      skill: 'physical.combat',
      level: 10
    }
  },

  {
    id: 'precise_strike',
    type: 'skill',
    name: 'Frappe précise',
    description: 'Une attaque très précise avec forte chance de critique.',
    iconName: 'Target',
    energyCost: 15,
    accuracy: 95,
    criticalChance: 40,
    damage: {
      base: 18,
      scaling: 'intelligence',
      variance: 0.1
    },
    requiredSkill: {
      skill: 'physical.combat',
      level: 20
    }
  }
];

/**
 * Actions simples pour les ennemis
 */
export const ENEMY_ACTIONS: { [key: string]: CombatAction } = {
  enemy_attack: {
    id: 'enemy_attack',
    type: 'attack',
    name: 'Attaque',
    description: 'L\'ennemi attaque.',
    iconName: 'Sword',
    energyCost: 8,
    accuracy: 75,
    criticalChance: 8,
    damage: {
      base: 12,
      scaling: 'force',
      variance: 0.25
    }
  },

  enemy_defend: {
    id: 'enemy_defend',
    type: 'defend',
    name: 'Position défensive',
    description: 'L\'ennemi adopte une posture défensive.',
    iconName: 'Shield',
    energyCost: 0,
    accuracy: 100,
    statusEffects: [{
      target: 'self',
      effect: {
        name: 'Défense renforcée',
        description: 'Dégâts réduits de 40%',
        type: 'buff',
        duration: 2,
        effects: { defense: 40 },
        icon: 'Shield'
      },
      chance: 100
    }]
  }
};
