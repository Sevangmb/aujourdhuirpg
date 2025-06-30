
/**
 * @fileOverview Centralized initial game data constants.
 */
import type { PlayerStats, Position, AdvancedSkillSystem, TraitsMentalStates, Progression, Alignment, IntelligentItem, Quest, PNJ, MajorDecision, Clue, GameDocument, ToneSettings, Transaction, HistoricalContact, AdvancedPhysiologySystem } from '@/lib/types';
import { getMasterItemById } from './items';
import { AVAILABLE_TONES } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// --- Initial Player Data ---
export const initialPlayerStats: PlayerStats = {
  Sante: { value: 100, max: 100 },
  Energie: { value: 100, max: 100 },
  Stress: { value: 10, max: 100 },
  Volonte: { value: 50, max: 100 },
  Humeur: { value: 50, max: 100 },
  Charisme: { value: 50 },
  Intelligence: { value: 50 },
  Force: { value: 50 },
  Reputation: { value: 0 },
  Curiosite: { value: 20 },
  Inspiration: { value: 10 },
};

// UPDATED to new AdvancedSkillSystem structure
export const initialSkills: AdvancedSkillSystem = {
  cognitive: { analysis: 5, memory: 5, creativity: 5, logic: 5, observation: 10 },
  social: { persuasion: 10, empathy: 5, leadership: 5, networking: 5, cultural_adaptation: 5 },
  physical: { endurance: 5, agility: 5, stealth: 5, strength: 5, dexterity: 5 },
  technical: { technology: 10, investigation: 5, languages: 5, finance: 5, crafting: 5 },
  survival: { streetwise: 10, wilderness: 5, medical: 5, navigation: 5, adaptation: 5 },
};

// NEW: Initial physiology data
export const initialPhysiology: AdvancedPhysiologySystem = {
  basic_needs: {
    hunger: {
      level: 100,
      satisfaction_quality: 100,
      cultural_craving: 'Aucune',
      dietary_preferences: ['omnivore'],
      food_memories: [],
    },
    thirst: {
      level: 100,
      hydration_quality: 100,
      climate_adjustment: 0,
      beverage_tolerance: [],
      cultural_beverage_preference: 'eau',
    },
  },
};

export const initialTraitsMentalStates: TraitsMentalStates = ["Prudent", "Observateur"];

const calculateXpToNextLevelForInitial = (level: number): number => {
  if (level <= 0) level = 1;
  return level * 100 + 50 * (level -1) * level;
};

export const initialProgression: Progression = {
  level: 1,
  xp: 0,
  xpToNextLevel: calculateXpToNextLevelForInitial(1),
  perks: [],
};

export const initialAlignment: Alignment = {
  chaosLawful: 0,
  goodEvil: 0,
};

export const initialInventory: IntelligentItem[] = [
  getMasterItemById('smartphone_01'),
  getMasterItemById('wallet_01'),
  getMasterItemById('keys_apartment_01'),
  getMasterItemById('energy_bar_01'),
  getMasterItemById('vintage_camera_01'), // Added the new evolving item
]
.filter((item): item is NonNullable<typeof item> => item !== undefined)
.map(masterItem => {
  // Create a full IntelligentItem instance
  return {
    ...masterItem,
    instanceId: uuidv4(),
    quantity: masterItem.id === 'energy_bar_01' ? 2 : 1,
    condition: { durability: 100 },
    itemLevel: 1,
    itemXp: 0,
    // xpToNextItemLevel is already on masterItem
    memory: {
      acquiredAt: new Date().toISOString(),
      acquisitionStory: "Fait partie de votre équipement de départ standard.",
      usageHistory: [],
    },
    contextual_properties: {
      local_value: masterItem.economics.base_value,
      legal_status: 'legal',
      social_perception: 'normal',
      utility_rating: 50,
    },
  };
});


export const initialPlayerLocation: Position = { // Changed from LocationData to Position
  latitude: 48.8566,
  longitude: 2.3522,
  name: 'Paris, France', // Changed from placeName to name
};

export const defaultAvatarUrl = 'https://placehold.co/150x150.png';
export const initialPlayerMoney: number = 50;
export const initialTransactionLog: Transaction[] = [];

export const initialToneSettings: ToneSettings = AVAILABLE_TONES.reduce((acc, tone) => {
  acc[tone] = 50; // Default all tones to a neutral 50
  return acc;
}, {} as ToneSettings);


export const initialQuestLog: Quest[] = [];
export const initialEncounteredPNJs: PNJ[] = [];
export const initialDecisionLog: MajorDecision[] = [];
export const initialClues: Clue[] = [];
export const initialDocuments: GameDocument[] = [];
export const initialHistoricalContacts: HistoricalContact[] = [];
export const initialInvestigationNotes: string = "Aucune note d'enquête pour le moment.";
// --- End Initial Player Data ---

// --- Other Game Constants ---
export const UNKNOWN_STARTING_PLACE_NAME = "Lieu de Départ Inconnu";
