/**
 * @fileOverview Type definitions for the complete Combat module.
 * Includes turn-based combat, status effects, and tactical actions.
 */

export type CombatActionType = 
  | 'attack'          // Attaque physique basique
  | 'defend'          // Se défendre, réduire les dégâts
  | 'skill'           // Utiliser une compétence spéciale
  | 'item'            // Utiliser un objet
  | 'flee'            // Fuir le combat
  | 'special'         // Action spéciale contextuelle
  | 'wait';           // Passer son tour

export type StatusEffect = {
  id: string;
  name: string;
  description: string;
  type: 'buff' | 'debuff' | 'neutral';
  duration: number;         // Nombre de tours restants
  effects: {
    attack?: number;        // Modificateur d'attaque
    defense?: number;       // Modificateur de défense
    energy?: number;        // Modificateur d'énergie par tour
    accuracy?: number;      // Modificateur de précision
    damage_per_turn?: number; // Dégâts/soins par tour
  };
  icon: string;            // Icône pour l'UI
};

export type CombatAction = {
  id: string;
  type: CombatActionType;
  name: string;
  description: string;
  iconName: string;
  
  // Coûts et restrictions
  energyCost: number;
  cooldown?: number;       // Tours avant de pouvoir réutiliser
  
  // Effets
  damage?: {
    base: number;
    scaling?: 'force' | 'charisme' | 'intelligence'; // Stat qui influence les dégâts
    variance: number;      // Variance aléatoire (ex: 0.2 = ±20%)
  };
  
  accuracy: number;        // Chance de réussir (0-100)
  criticalChance?: number; // Chance de critique (0-100)
  
  // Effets spéciaux
  statusEffects?: {
    target: 'self' | 'enemy';
    effect: Omit<StatusEffect, 'id'>;
    chance: number;        // Chance d'appliquer l'effet
  }[];
  
  // Conditions d'utilisation
  requiredSkill?: {
    skill: string;         // Compétence requise (ex: "physical.combat")
    level: number;         // Niveau minimum
  };
  
  requiredItem?: string;   // ID d'objet requis
  usableWhen?: 'always' | 'low_health' | 'high_energy' | 'first_turn';
};

export type Enemy = {
  id: string;
  name: string;
  description: string;
  avatar?: string;         // URL ou icône
  
  // Stats de base
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  
  // Stats de combat
  attack: number;          // Force d'attaque (0-100)
  defense: number;         // Défense physique (0-100)
  speed: number;           // Initiative (0-100)
  accuracy: number;        // Précision de base (0-100)
  
  // Résistances et vulnérabilités
  resistances?: {
    physical?: number;     // Résistance aux dégâts physiques
    mental?: number;       // Résistance aux effets mentaux
    status?: string[];     // Immunités aux effets de statut
  };
  
  // IA et comportement
  aiType: 'aggressive' | 'defensive' | 'tactical' | 'berserker' | 'coward';
  availableActions: string[]; // IDs des actions disponibles
  
  // Récompenses de victoire
  rewards: {
    xp: number;
    money?: number;
    items?: string[];      // IDs d'objets potentiels
  };
  
  // Contexte narratif
  combatText?: {
    onStart?: string;      // Texte au début du combat
    onDefeat?: string;     // Texte à la défaite
    onVictory?: string;    // Texte si l'ennemi gagne
    onFlee?: string;       // Texte si le joueur fuit
  };
};

export type CombatState = {
  isActive: boolean;
  currentTurn: 'player' | 'enemy';
  turnNumber: number;
  initiative: {
    player: number;
    enemy: number;
  };
  
  // États des combattants
  player: {
    health: number;
    energy: number;
    statusEffects: StatusEffect[];
    availableActions: CombatAction[];
    actionCooldowns: { [actionId: string]: number };
  };
  
  enemy: Enemy & {
    statusEffects: StatusEffect[];
    actionCooldowns: { [actionId: string]: number };
  };
  
  // Historique du combat
  combatLog: CombatLogEntry[];
  
  // État de la bataille
  canFlee: boolean;
  fleeAttempts: number;
  environment?: {
    type: 'urban' | 'nature' | 'indoor' | 'underground';
    modifiers?: {
      accuracy?: number;
      damage?: number;
      flee_chance?: number;
    };
  };
};

export type CombatLogEntry = {
  id: string;
  timestamp: number;
  actor: 'player' | 'enemy';
  action: string;
  result: 'success' | 'failure' | 'critical' | 'blocked';
  damage?: number;
  healing?: number;
  statusEffect?: string;
  description: string;    // Texte narratif de l'action
};

export type CombatResult = {
  outcome: 'victory' | 'defeat' | 'fled' | 'draw';
  duration: number;       // Durée en tours
  playerDamageDealt: number;
  playerDamageTaken: number;
  actionsUsed: string[];  // Actions utilisées par le joueur
  rewards?: {
    xp: number;
    money: number;
    items: string[];
    reputation?: { faction: string; change: number }[];
  };
  narrative: string;      // Texte de conclusion du combat
};

// Types pour les événements de combat
export type CombatEvent = 
  | { type: 'COMBAT_ACTION_SELECTED', actionId: string }
  | { type: 'COMBAT_TURN_END' }
  | { type: 'COMBAT_DAMAGE_DEALT', target: 'player' | 'enemy', damage: number, source: string }
  | { type: 'COMBAT_HEALING_APPLIED', target: 'player' | 'enemy', healing: number, source: string }
  | { type: 'COMBAT_STATUS_APPLIED', target: 'player' | 'enemy', effect: StatusEffect }
  | { type: 'COMBAT_STATUS_REMOVED', target: 'player' | 'enemy', effectId: string }
  | { type: 'COMBAT_ENDED', result: CombatResult };

// Configuration du système de combat
export interface CombatConfig {
  maxTurns: number;              // Limite de tours (draw après)
  fleeBaseChance: number;        // Chance de base de fuir (%)
  criticalMultiplier: number;    // Multiplicateur de dégâts critiques
  statusEffectMaxStack: number;  // Nombre max d'effets similaires
  energyRegenPerTurn: number;    // Énergie récupérée par tour
}
