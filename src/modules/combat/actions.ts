
/**
 * @fileOverview Advanced Combat Actions System
 * Defines all available combat actions with tactical mechanics
 */

import type { CombatAction, CombatActionType, StatusEffect, DamageType } from './enhanced-types';

// === STATUS EFFECTS LIBRARY ===

export const STATUS_EFFECTS: Record<string, StatusEffect> = {
  bleeding: {
    id: 'bleeding',
    name: 'Saignement',
    description: 'Perd de la santé à chaque tour',
    duration: 3,
    effects: {
      damage: { amount: 5, type: 'physical', perTurn: true }
    }
  },
  stunned: {
    id: 'stunned',
    name: 'Étourdi',
    description: 'Ne peut pas agir ce tour',
    duration: 1,
    effects: {
      actions: { disabled: ['attack', 'special', 'feint'], enhanced: [] }
    }
  },
  intimidated: {
    id: 'intimidated',
    name: 'Intimidé',
    description: 'Précision et dégâts réduits',
    duration: 2,
    effects: {
      stats: { Force: -10, Dexterite: -10 }
    }
  },
  focused: {
    id: 'focused',
    name: 'Concentré',
    description: 'Précision et chances critiques augmentées',
    duration: 2,
    effects: {
      stats: { Perception: 15, Dexterite: 10 },
      actions: { disabled: [], enhanced: ['attack', 'analyze'] }
    }
  },
  defending: {
    id: 'defending',
    name: 'En Défense',
    description: 'Défense augmentée mais mobilité réduite',
    duration: 1,
    effects: {
      stats: { Constitution: 20, Dexterite: -10 }
    }
  },
  adrenaline: {
    id: 'adrenaline',
    name: 'Adrénaline',
    description: 'Force et vitesse accrues',
    duration: 3,
    effects: {
      stats: { Force: 15, Dexterite: 15 },
      actions: { disabled: [], enhanced: ['attack', 'flee'] }
    }
  },
  exhausted: {
    id: 'exhausted',
    name: 'Épuisé',
    description: 'Toutes les actions coûtent plus d\'endurance',
    duration: 4,
    effects: {
      stats: { Force: -15, Constitution: -15 }
    }
  },
  analyzed: {
    id: 'analyzed',
    name: 'Analysé',
    description: 'Vulnérabilités exposées, prend plus de dégâts',
    duration: 3,
    effects: {
      stats: { Constitution: -10 }
    }
  }
};

// === CORE COMBAT ACTIONS ===

export const COMBAT_ACTIONS: Record<string, CombatAction> = {
  // === BASIC ACTIONS ===
  basic_attack: {
    id: 'basic_attack',
    name: 'Attaque de Base',
    description: 'Une attaque simple avec l\'arme équipée',
    type: 'attack',
    requirements: {
      stamina: 10,
      position: ['melee', 'ranged']
    },
    effects: {
      damage: { base: 15, stat_modifier: 'Force', type: 'physical' }
    },
    success_modifiers: {
      stat_bonus: { Force: 0.3, Dexterite: 0.2 },
      skill_bonus: 'physiques.arme_blanche',
      equipment_bonus: true
    },
    stamina_cost: 10
  },

  power_attack: {
    id: 'power_attack',
    name: 'Attaque Puissante',
    description: 'Attaque lente mais dévastatrice',
    type: 'attack',
    requirements: {
      stamina: 20,
      position: ['melee']
    },
    effects: {
      damage: { base: 25, stat_modifier: 'Force', type: 'physical' },
      status_apply: [STATUS_EFFECTS.bleeding]
    },
    success_modifiers: {
      stat_bonus: { Force: 0.5, Dexterite: -0.1 },
      skill_bonus: 'physiques.arme_blanche',
      equipment_bonus: true,
      circumstance: 'Attaque lente mais puissante'
    },
    stamina_cost: 20,
    unlock_condition: {
      skill_requirement: { skill: 'physiques.arme_blanche', level: 3 }
    }
  },

  precise_strike: {
    id: 'precise_strike',
    name: 'Frappe Précise',
    description: 'Vise les points vitaux pour des dégâts critiques',
    type: 'attack',
    requirements: {
      stamina: 15,
      position: ['melee', 'ranged']
    },
    effects: {
      damage: { base: 12, stat_modifier: 'Dexterite', type: 'physical' }
    },
    success_modifiers: {
      stat_bonus: { Dexterite: 0.4, Perception: 0.3 },
      skill_bonus: 'physiques.arme_blanche',
      equipment_bonus: true,
      circumstance: 'Chance critique x2'
    },
    stamina_cost: 15,
    unlock_condition: {
      skill_requirement: { skill: 'physiques.arme_blanche', level: 2 }
    }
  },

  // === DEFENSIVE ACTIONS ===
  defensive_stance: {
    id: 'defensive_stance',
    name: 'Position Défensive',
    description: 'Adopte une posture défensive pour réduire les dégâts',
    type: 'defend',
    requirements: {
      stamina: 5
    },
    effects: {
      status_apply: [STATUS_EFFECTS.defending],
      stance_change: 'defensive'
    },
    success_modifiers: {
      stat_bonus: { Constitution: 0.3 },
      skill_bonus: 'physiques.esquive'
    },
    stamina_cost: 5
  },

  counter_attack: {
    id: 'counter_attack',
    name: 'Contre-Attaque',
    description: 'Pare et riposte immédiatement',
    type: 'defend',
    requirements: {
      stamina: 18,
      position: ['melee']
    },
    effects: {
      damage: { base: 18, stat_modifier: 'Dexterite', type: 'physical' }
    },
    success_modifiers: {
      stat_bonus: { Dexterite: 0.4, Perception: 0.2 },
      skill_bonus: 'physiques.esquive',
      circumstance: 'Requiert un timing parfait'
    },
    stamina_cost: 18,
    unlock_condition: {
      skill_requirement: { skill: 'physiques.esquive', level: 4 }
    }
  },

  // === SPECIAL ACTIONS ===
  analyze_enemy: {
    id: 'analyze_enemy',
    name: 'Analyser l\'Ennemi',
    description: 'Étudie l\'adversaire pour révéler ses faiblesses',
    type: 'analyze',
    requirements: {
      stamina: 8
    },
    effects: {
      status_apply: [STATUS_EFFECTS.analyzed],
      status_remove: ['intimidated']
    },
    success_modifiers: {
      stat_bonus: { Intelligence: 0.4, Perception: 0.3 },
      skill_bonus: 'savoir.sciences_naturelles'
    },
    stamina_cost: 8
  },

  intimidate: {
    id: 'intimidate',
    name: 'Intimidation',
    description: 'Tente de démoraliser l\'adversaire',
    type: 'intimidate',
    requirements: {
      stamina: 12
    },
    effects: {
      status_apply: [STATUS_EFFECTS.intimidated]
    },
    success_modifiers: {
      stat_bonus: { Charisme: 0.3, Force: 0.2 },
      skill_bonus: 'sociales.intimidation'
    },
    stamina_cost: 12,
    unlock_condition: {
      skill_requirement: { skill: 'sociales.intimidation', level: 2 }
    }
  },

  feint: {
    id: 'feint',
    name: 'Feinte',
    description: 'Simule une attaque pour tromper l\'ennemi',
    type: 'feint',
    requirements: {
      stamina: 10,
      position: ['melee']
    },
    effects: {
      status_apply: [STATUS_EFFECTS.focused]
    },
    success_modifiers: {
      stat_bonus: { Dexterite: 0.3, Charisme: 0.2 },
      skill_bonus: 'sociales.tromperie_baratin'
    },
    stamina_cost: 10,
    unlock_condition: {
      skill_requirement: { skill: 'sociales.tromperie_baratin', level: 2 }
    }
  },

  adrenaline_rush: {
    id: 'adrenaline_rush',
    name: 'Poussée d\'Adrénaline',
    description: 'Puise dans ses réserves pour un regain d\'énergie',
    type: 'special',
    requirements: {
      stamina: 5
    },
    effects: {
      status_apply: [STATUS_EFFECTS.adrenaline],
      healing: { base: 15, stat_modifier: 'Constitution' }
    },
    success_modifiers: {
      stat_bonus: { Constitution: 0.4, Volonte: 0.3 }
    },
    stamina_cost: 5,
    unlock_condition: {
      skill_requirement: { skill: 'physiques.esquive', level: 3 }
    }
  },

  // === MOBILITY ACTIONS ===
  tactical_retreat: {
    id: 'tactical_retreat',
    name: 'Retraite Tactique',
    description: 'Recule pour prendre une position avantageuse',
    type: 'flee',
    requirements: {
      stamina: 12
    },
    effects: {
      position_change: 'ranged',
      status_apply: [STATUS_EFFECTS.focused]
    },
    success_modifiers: {
      stat_bonus: { Dexterite: 0.4, Intelligence: 0.2 },
      skill_bonus: 'physiques.esquive'
    },
    stamina_cost: 12
  },

  desperate_escape: {
    id: 'desperate_escape',
    name: 'Fuite Désespérée',
    description: 'Tentative de fuite du combat',
    type: 'flee',
    requirements: {
      stamina: 15
    },
    effects: {
      status_apply: [STATUS_EFFECTS.exhausted]
    },
    success_modifiers: {
      stat_bonus: { Dexterite: 0.5 },
      skill_bonus: 'physiques.esquive',
      circumstance: 'Plus efficace à faible santé'
    },
    stamina_cost: 15
  },

  // === ADVANCED TECHNIQUES ===
  whirlwind_attack: {
    id: 'whirlwind_attack',
    name: 'Attaque Tourbillon',
    description: 'Attaque multiple qui frappe tous les ennemis proches',
    type: 'special',
    requirements: {
      stamina: 25,
      position: ['melee']
    },
    effects: {
      damage: { base: 20, stat_modifier: 'Dexterite', type: 'physical' },
      status_apply: [STATUS_EFFECTS.exhausted]
    },
    success_modifiers: {
      stat_bonus: { Dexterite: 0.4, Force: 0.3 },
      skill_bonus: 'physiques.arme_blanche'
    },
    stamina_cost: 25,
    unlock_condition: {
      skill_requirement: { skill: 'physiques.arme_blanche', level: 6 }
    }
  },

  focus_mind: {
    id: 'focus_mind',
    name: 'Concentration Mentale',
    description: 'Concentre son esprit pour améliorer la précision',
    type: 'special',
    requirements: {
      stamina: 8
    },
    effects: {
      status_apply: [STATUS_EFFECTS.focused],
      status_remove: ['intimidated']
    },
    success_modifiers: {
      stat_bonus: { Intelligence: 0.4, Volonte: 0.3 }
    },
    stamina_cost: 8,
    unlock_condition: {
      skill_requirement: { skill: 'savoir.sciences_naturelles', level: 3 }
    }
  }
};

// === UTILITY FUNCTIONS ===

/**
 * Gets available actions for a player based on their skills and equipment
 */
export function getAvailableActions(
  playerSkills: any,
  playerStats: any,
  equippedWeapon?: any,
  playerStamina: number = 100
): CombatAction[] {
  const available: CombatAction[] = [];

  Object.values(COMBAT_ACTIONS).forEach(action => {
    // Check stamina requirement
    if (action.requirements.stamina && playerStamina < action.requirements.stamina) {
      return;
    }

    // Check unlock conditions
    if (action.unlock_condition?.skill_requirement) {
      const { skill, level } = action.unlock_condition.skill_requirement;
      const skillPath = skill.split('.');
      const skillValue = skillPath.reduce((obj, path) => obj?.[path], playerSkills);
      if (!skillValue || skillValue.level < level) {
        return;
      }
    }

    // Check equipment requirements
    if (action.unlock_condition?.equipment_requirement) {
      if (!equippedWeapon || !action.unlock_condition.equipment_requirement.includes(equippedWeapon.type)) {
        return;
      }
    }

    available.push(action);
  });

  return available;
}

/**
 * Calculates the success probability for a combat action
 */
export function calculateActionSuccessProbability(
  action: CombatAction,
  playerStats: any,
  playerSkills: any,
  targetDefense: number,
  equippedWeapon?: any
): number {
  let baseChance = 50;

  // Apply stat bonuses
  if (action.success_modifiers.stat_bonus) {
    Object.entries(action.success_modifiers.stat_bonus).forEach(([stat, modifier]) => {
      const statValue = playerStats[stat]?.value || 0;
      baseChance += (statValue * modifier);
    });
  }

  // Apply skill bonus
  if (action.success_modifiers.skill_bonus) {
    const skillPath = action.success_modifiers.skill_bonus.split('.');
    const skillValue = skillPath.reduce((obj, path) => obj?.[path], playerSkills);
    if (skillValue) {
      baseChance += skillValue.level * 2;
    }
  }

  // Apply equipment bonus
  if (action.success_modifiers.equipment_bonus && equippedWeapon) {
    baseChance += (equippedWeapon.combatStats?.accuracy || 0);
  }

  // Reduce by target defense
  baseChance -= targetDefense / 2;

  return Math.max(10, Math.min(95, baseChance));
}

export { STATUS_EFFECTS as statusEffects };
export default COMBAT_ACTIONS;
