
/**
 * @fileOverview Centralized initial game data constants.
 */
import type { PlayerStats, Position, Skills, TraitsMentalStates, Progression, Alignment, InventoryItem, Quest, PNJ, MajorDecision, Clue, GameDocument, ToneSettings, GameTone, Transaction } from '@/lib/types';
import { getMasterItemById } from './items'; // Assuming items.ts is in the same data directory or adjust path
import { AVAILABLE_TONES } from '@/lib/types';

// --- Initial Player Data ---
export const initialPlayerStats: PlayerStats = {
  Sante: 100,
  Charisme: 50,
  Intelligence: 50,
  Force: 50,
  Energie: 100, // Max 100,
  Stress: 10, // Max 100 (bas = bien)
  Volonte: 50, // Max 100
  Reputation: 0, // Peut être négatif ou positif
};

export const initialSkills: Skills = {
  Informatique: 10,
  Discretion: 5,
  Dialogue: 15,
  Perception: 12,
  Survie: 8,
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

export const initialInventory: InventoryItem[] = [
  getMasterItemById('smartphone_01'),
  getMasterItemById('wallet_01'),
  getMasterItemById('keys_apartment_01'),
  getMasterItemById('energy_bar_01'),
]
.filter(item => item !== undefined)
.map(masterItem => {
  if (!masterItem) throw new Error("Unreachable: masterItem is undefined after filter");
  // Create a full InventoryItem instance
  return {
    ...masterItem,
    instanceId: Math.random().toString(36).substring(2), // Simple unique ID for initial items
    quantity: masterItem.id === 'energy_bar_01' ? 2 : 1,
    condition: 100,
    acquiredAt: new Date().toISOString(),
    usageCount: 0,
    experience: 0,
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
export const initialInvestigationNotes: string = "Aucune note d'enquête pour le moment.";
// --- End Initial Player Data ---

// --- Other Game Constants ---
export const UNKNOWN_STARTING_PLACE_NAME = "Lieu de Départ Inconnu";
