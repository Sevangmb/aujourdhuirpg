
/**
 * @fileOverview Type definitions for the complete Combat system
 * Enhanced combat system with tactical turn-based mechanics
 */
import { z } from 'zod';
import type { PlayerStats, IntelligentItem } from '@/lib/types';

// === CORE COMBAT TYPES ===

export type CombatActionType = 
  | 'attack' 
  | 'defend' 
  | 'flee' 
  | 'special' 
  | 'use_item' 
  | 'analyze' 
  | 'intimidate' 
  | 'feint';

export type CombatPosition = 'melee' | 'ranged' | 'cover';
export type CombatStance = 'aggressive' | 'balanced' | 'defensive';
export type DamageType = 'physical' | 'mental' | 'magical' | 'environmental';

export interface CombatStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  armor: number;
  position: CombatPosition;
  stance: CombatStance;
  statusEffects: StatusEffect[];
}

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // turns remaining
  effects: {
    stats?: Partial<Record<keyof PlayerStats, number>>;
    damage?: { amount: number; type: DamageType; perTurn: boolean };
    healing?: { amount: number; perTurn: boolean };
    actions?: { disabled: CombatActionType[]; enhanced: CombatActionType[] };
  };
}

export interface WeaponStats {
  damage: number;
  accuracy: number;
  criticalChance: number;
  stamina_cost: number;
  range: CombatPosition[];
  damage_type: DamageType;
  special_effects?: StatusEffect[];
}

export interface ArmorStats {
  defense: number;
  damage_reduction: { [key in DamageType]?: number };
  mobility_penalty: number;
  special_properties?: string[];
}

// === ENEMY SYSTEM ===

export interface EnemyTemplate {
  id: string;
  name: string;
  description: string;
  baseStats: {
    Force: number;
    Dexterite: number;
    Constitution: number;
    Intelligence: number;
    Perception: number;
  };
  combatBehavior: {
    aggressiveness: number; // 0-100
    intelligence: number; // 0-100
    preferredActions: CombatActionType[];
    fleeThreshold: number; // health % to flee
  };
  naturalWeapons: WeaponStats;
  naturalArmor: ArmorStats;
  loot: {
    money: { min: number; max: number };
    items: { itemId: string; chance: number; quantity?: number }[];
  };
  xpReward: number;
}

export interface Enemy extends EnemyTemplate {
  instanceId: string;
  currentStats: CombatStats;
  ai_state: {
    lastAction: CombatActionType | null;
    target_priority: 'player' | 'weakest' | 'strongest';
    turns_since_special: number;
  };
}

// === COMBAT ACTIONS ===

export interface CombatAction {
  id: string;
  name: string;
  description: string;
  type: CombatActionType;
  requirements: {
    stamina?: number;
    position?: CombatPosition[];
    weapon_type?: string[];
    skill_level?: { skill: string; minimum: number };
    status_required?: string[];
    status_forbidden?: string[];
  };
  effects: {
    damage?: { base: number; stat_modifier?: keyof PlayerStats; type: DamageType };
    healing?: { base: number; stat_modifier?: keyof PlayerStats };
    status_apply?: StatusEffect[];
    status_remove?: string[];
    position_change?: CombatPosition;
    stance_change?: CombatStance;
  };
  success_modifiers: {
    stat_bonus?: Partial<Record<keyof PlayerStats, number>>;
    skill_bonus?: string; // skill path
    equipment_bonus?: boolean;
    circumstance?: string; // description of bonus/malus
  };
  stamina_cost: number;
  unlock_condition?: {
    skill_requirement?: { skill: string; level: number };
    equipment_requirement?: string[];
    combo_requirement?: CombatActionType[];
  };
}

// === COMBAT STATE ===

export interface CombatState {
  isActive: boolean;
  currentTurn: 'player' | 'enemy';
  turnCount: number;
  player: {
    stats: CombatStats;
    availableActions: CombatAction[];
    equipped: {
      weapon?: IntelligentItem & { combatStats: WeaponStats };
      armor?: IntelligentItem & { armorStats: ArmorStats };
      accessories: (IntelligentItem & { special_effects?: StatusEffect[] })[];
    };
  };
  enemies: Enemy[];
  environment: {
    type: 'urban' | 'indoor' | 'natural' | 'supernatural';
    modifiers: {
      visibility: number; // 0-100
      mobility: number; // 0-100
      special_effects?: StatusEffect[];
    };
  };
  combatLog: CombatLogEntry[];
}

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  type: 'action' | 'damage' | 'healing' | 'status' | 'turn_start' | 'combat_end';
  actor: string;
  target?: string;
  description: string;
  details?: {
    damage?: number;
    healing?: number;
    status_effects?: string[];
    critical?: boolean;
  };
}

// === COMBAT RESULTS ===

export interface CombatResult {
  outcome: 'victory' | 'defeat' | 'flee' | 'draw';
  rewards: {
    xp: number;
    money: number;
    items: string[]; // item IDs
    skill_progress: { skill: string; xp: number }[];
  };
  casualties: {
    player_injuries?: StatusEffect[];
    enemies_defeated: string[]; // enemy instance IDs
  };
  duration: {
    turns: number;
    time_minutes: number;
  };
}

// === ZOD SCHEMAS FOR AI ===

const DamageTypeSchema = z.enum(['physical', 'mental', 'magical', 'environmental']);

const WeaponStatsSchema = z.object({
  damage: z.number().describe("Dégâts de base de l'arme naturelle (griffes, poings...)."),
  accuracy: z.number().describe("Précision de base."),
  criticalChance: z.number().describe("Chance de coup critique de base (%)."),
  stamina_cost: z.number().describe("Coût en endurance pour utiliser."),
  range: z.array(z.enum(['melee', 'ranged', 'cover'])).describe("Portée."),
  damage_type: DamageTypeSchema.describe("Type de dégâts."),
}).describe("Les statistiques de l'arme naturelle de l'ennemi.");

const ArmorStatsSchema = z.object({
  defense: z.number().describe("Valeur de défense de base."),
  damage_reduction: z.record(DamageTypeSchema, z.number()).optional().describe("Réduction de dégâts par type."),
  mobility_penalty: z.number().describe("Pénalité de mobilité."),
  special_properties: z.array(z.string()).optional().describe("Propriétés spéciales de l'armure."),
}).describe("Les statistiques de l'armure naturelle de l'ennemi (peau, carapace...).");

const LootSchema = z.object({
    money: z.object({
        min: z.number(),
        max: z.number(),
    }).describe("Argent lâché par l'ennemi."),
    items: z.array(z.object({
        itemId: z.string().describe("ID de l'objet de la base de données d'objets."),
        chance: z.number().min(0).max(1).describe("Chance de drop (0 à 1)."),
        quantity: z.number().optional().describe("Quantité (1 par défaut)."),
    })).describe("Liste des objets potentiellement lâchés."),
}).describe("Le butin laissé par l'ennemi à sa mort.");


export const EnemyTemplateSchema = z.object({
  name: z.string().describe("Nom de l'ennemi"),
  description: z.string().describe("Description de l'ennemi et de son apparence"),
  baseStats: z.object({
    Force: z.number().min(1).max(100).describe("Force de l'ennemi"),
    Dexterite: z.number().min(1).max(100).describe("Dextérité de l'ennemi"),
    Constitution: z.number().min(1).max(100).describe("Constitution de l'ennemi"),
    Intelligence: z.number().min(1).max(100).describe("Intelligence de l'ennemi"),
    Perception: z.number().min(1).max(100).describe("Perception de l'ennemi"),
  }),
  combatBehavior: z.object({
    aggressiveness: z.number().min(0).max(100).describe("Niveau d'agressivité (0-100)"),
    intelligence: z.number().min(0).max(100).describe("Intelligence tactique (0-100)"),
    preferredActions: z.array(z.enum(['attack', 'defend', 'flee', 'special', 'use_item', 'analyze', 'intimidate', 'feint'])).describe("Actions préférées de l'ennemi"),
    fleeThreshold: z.number().min(0).max(100).describe("Seuil de santé pour fuir (pourcentage)"),
  }),
  naturalWeapons: WeaponStatsSchema,
  naturalArmor: ArmorStatsSchema,
  loot: LootSchema,
  xpReward: z.number().min(10).max(500).describe("Points d'expérience accordés en cas de victoire"),
});

export const CombatActionSchema = z.object({
  name: z.string().describe("Nom de l'action de combat"),
  description: z.string().describe("Description de l'action et de ses effets"),
  type: z.enum(['attack', 'defend', 'flee', 'special', 'use_item', 'analyze', 'intimidate', 'feint']).describe("Type d'action de combat"),
  stamina_cost: z.number().min(0).max(50).describe("Coût en endurance de l'action"),
});

// Combat choice for AI generation
export const CombatChoiceSchema = z.object({
  id: z.string().describe("Identifiant unique de l'action"),
  text: z.string().describe("Texte affiché pour l'action"),
  description: z.string().describe("Description détaillée de l'action"),
  iconName: z.enum(['Sword', 'Shield', 'Zap', 'Eye', 'MessageSquare', 'Wind']).describe("Icône pour l'action"),
  type: z.literal('action').describe("Type de choix (toujours 'action' en combat)"),
  mood: z.enum(['adventurous', 'contemplative', 'mysterious']).describe("Ambiance de l'action"),
  energyCost: z.number().min(0).max(30).describe("Coût en énergie"),
  timeCost: z.number().min(1).max(10).describe("Temps nécessaire en minutes"),
  consequences: z.array(z.string()).describe("Conséquences possibles de l'action"),
  isCombatAction: z.literal(true).describe("Indique que c'est une action de combat"),
  combatActionType: z.enum(['attack', 'defend', 'flee', 'special', 'use_item', 'analyze', 'intimidate', 'feint']).describe("Type spécifique d'action de combat"),
  skillCheck: z.object({
    skill: z.string().describe("Compétence testée (ex: 'physiques.combat_mains_nues')"),
    difficulty: z.number().min(20).max(90).describe("Difficulté du test de compétence"),
  }).optional().describe("Test de compétence requis"),
  successProbability: z.number().min(10).max(95).describe("Probabilité de succès estimée (%)"),
});

export type CombatChoice = z.infer<typeof CombatChoiceSchema>;
export type EnemyTemplateInput = z.infer<typeof EnemyTemplateSchema>;
