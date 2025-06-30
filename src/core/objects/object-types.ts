/**
 * @fileOverview Defines the core types for the Object Cascade Enrichment system.
 */

import type { GameState } from '@/lib/types';

// The simplified object that enters the cascade
export interface BaseObject {
  id: string; // The instanceId of the item
  name: string;
  type: 'weapon' | 'armor' | 'potion' | 'tool' | 'misc';
  subtype?: string;
  quality?: 'poor' | 'common' | 'fine' | 'superior' | 'masterwork' | 'legendary';
  [key: string]: any; // Allow other properties to pass through
}

// The context provided to each enrichment module
export type ObjectEnrichmentContext = {
  player: GameState['player'];
  // Future context properties can be added here, e.g., world state, location, etc.
};

// --- Module-Specific Data Structures ---

// For ProprietesArmesModule
export interface MaterialInfo {
  primary: string;
  hardness: number;
  flexibility: number;
  magicalReceptivity: number;
  rarity: string;
  source: string;
}

export interface PhysicalProperties {
  weight: number;
  balance: number; // 0-100
  sharpness: number; // 0-100
  durability: number; // 0-100
}

export interface CombatStats {
  damage: number;
  accuracy: number;
  criticalChance: number;
  reach: 'short' | 'medium' | 'long';
}

export interface CraftingDetails {
  creator: string;
  technique: string;
  qualityMark: string;
}

// For ValeurEconomiqueModule
export interface PricingInfo {
  baseValue: number;
  currentMarketPrice: number;
  priceRange: {
    minimum: number;
    maximum: number;
  };
}

export interface MarketAnalysis {
  localDemand: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  priceStability: number; // 0-100
  competitionLevel: 'none' | 'low' | 'moderate' | 'high' | 'saturated';
}

export interface MarketFactors {
  demand: MarketAnalysis['localDemand'];
  competition: MarketAnalysis['competitionLevel'];
  totalMultiplier: number;
}

export interface TradingAdvice {
  action: 'buy' | 'sell' | 'hold';
  reason: string;
  potentialProfit?: number;
}

// For EnchantementsModule
export interface EnchantmentPotential {
  maxSlots: number;
  compatibleSchools: string[];
  materialReceptivity: number; // 0-100
}

export interface LocalEnchantment {
  name: string;
  effect: string;
  cost: number;
  enchanter: string;
  school: string;
}

export interface CurrentEnchantment {
    name: string;
    description: string;
    powerLevel: number; // 0-100
}


// For HistoriqueModule
export interface ObjectProvenance {
  originalCreator: string;
  creationDate: string;
  creationLocation: string;
}

export interface PreviousOwner {
  name: string;
  title: string;
  story: string; // A short story about their ownership
}

export interface CulturalSignificance {
  localFame: number; // 0-100
  culturalValue: string;
  museumInterest: number; // 0-100
}

// --- Enriched Object Structure ---
export interface EnrichmentMetadata {
    executionChain: string[];
    enrichmentDepth: number;
    enrichmentTime: number; // in ms
}

export interface EnrichedObject extends BaseObject {
  // Properties from ProprietesArmesModule
  material?: MaterialInfo;
  physicalProperties?: PhysicalProperties;
  combatStats?: CombatStats;
  craftingDetails?: CraftingDetails;

  // Properties from ValeurEconomiqueModule
  pricing?: PricingInfo;
  marketAnalysis?: MarketAnalysis;
  tradingRecommendations?: TradingAdvice;

  // Properties from EnchantementsModule
  enchantmentPotential?: EnchantmentPotential;
  availableEnchantments?: any[];
  currentEnchantments?: CurrentEnchantment[];

  // Properties from HistoriqueModule
  provenance?: ObjectProvenance;
  previousOwners?: PreviousOwner[];
  culturalSignificance?: CulturalSignificance;
  
  // Metadata about the enrichment process
  enrichmentMetadata?: EnrichmentMetadata;
}


// --- Module Interfaces ---

export interface ObjectModuleResult {
  moduleId: string;
  enrichmentData: Partial<EnrichedObject>;
}

export interface ObjectEnrichmentModule {
  readonly id: string;
  enrichObject(
    object: Partial<EnrichedObject>,
    context: ObjectEnrichmentContext
  ): Promise<ObjectModuleResult>;
}
