
/**
 * @fileOverview Centralized initial game data constants.
 */
import type { PlayerStats, Position, AdvancedSkillSystem, TraitsMentalStates, Progression, Alignment, IntelligentItem, Quest, PNJ, MajorDecision, Clue, GameDocument, ToneSettings, Transaction, HistoricalContact, AdvancedPhysiologySystem, SkillDetail, MomentumSystem, Scenario } from '@/lib/types';
import { getMasterItemById } from './items';
import { AVAILABLE_TONES } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { calculateXpToNextLevel, getSkillUpgradeCost } from '@/modules/player/logic';

const createStat = (value: number, max?: number): { value: number, max?: number } => ({ value, max });

// --- Initial Player Data ---
export const initialPlayerStats: PlayerStats = {
  Force: createStat(10),
  Dexterite: createStat(10),
  Constitution: createStat(10),
  Intelligence: createStat(10),
  Perception: createStat(10),
  Charisme: createStat(10),
  Volonte: createStat(10),
  Savoir: createStat(10),
  Technique: createStat(10),
  MagieOccultisme: createStat(10),
  Discretion: createStat(10),
  ChanceDestin: createStat(10),
  Sante: createStat(100, 100),
  Energie: createStat(100, 100),
  Stress: createStat(0, 100),
};


const createSkillDetail = (level: number): SkillDetail => ({
    level: level,
    xp: 0,
    xpToNext: getSkillUpgradeCost(level),
});

export const initialSkills: AdvancedSkillSystem = {
  physiques: {
    combat_mains_nues: createSkillDetail(5),
    arme_blanche: createSkillDetail(5),
    arme_de_tir: createSkillDetail(5),
    arme_a_feu: createSkillDetail(5),
    pilotage_monture: createSkillDetail(5),
    pilotage_vehicules: createSkillDetail(5),
    pilotage_spatial: createSkillDetail(5),
    esquive: createSkillDetail(5),
    natation: createSkillDetail(5),
    escalade: createSkillDetail(5),
    discretion_skill: createSkillDetail(5),
  },
  techniques: {
    artisanat_general: createSkillDetail(5),
    forge_metallurgie: createSkillDetail(5),
    maconnerie_construction: createSkillDetail(5),
    menuiserie: createSkillDetail(5),
    couture_tissage: createSkillDetail(5),
    joaillerie: createSkillDetail(5),
    navigation: createSkillDetail(5),
    mecanique: createSkillDetail(5),
    electronique: createSkillDetail(5),
    informatique_hacking: createSkillDetail(5),
    ingenierie_spatiale: createSkillDetail(5),
    contrefacon: createSkillDetail(5),
  },
  survie: {
    pistage: createSkillDetail(5),
    orientation: createSkillDetail(5),
    chasse_peche: createSkillDetail(5),
    herboristerie: createSkillDetail(5),
    premiers_secours: createSkillDetail(5),
    medecine: createSkillDetail(5),
    survie_generale: createSkillDetail(5),
  },
  sociales: {
    persuasion: createSkillDetail(5),
    seduction: createSkillDetail(5),
    intimidation: createSkillDetail(5),
    tromperie_baratin: createSkillDetail(5),
    commandement: createSkillDetail(5),
    etiquette: createSkillDetail(5),
  },
  savoir: {
    histoire: createSkillDetail(5),
    geographie: createSkillDetail(5),
    theologie_religions: createSkillDetail(5),
    sciences_naturelles: createSkillDetail(5),
    alchimie_chimie: createSkillDetail(5),
    occultisme_magie_theorique: createSkillDetail(5),
    astrologie_astronomie: createSkillDetail(5),
  },
};

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

export const initialProgression: Progression = {
  level: 1,
  xp: 0,
  xpToNextLevel: calculateXpToNextLevel(1),
  perks: [],
};

export const initialAlignment: Alignment = {
  chaosLawful: 0,
  goodEvil: 0,
};

export const initialMomentum: MomentumSystem = {
    consecutive_successes: 0,
    consecutive_failures: 0,
    momentum_bonus: 0,
    desperation_bonus: 0,
};

export const initialInventory: IntelligentItem[] = [
  getMasterItemById('smartphone_01'),
  getMasterItemById('wallet_01'),
  getMasterItemById('keys_apartment_01'),
  getMasterItemById('energy_bar_01'),
  getMasterItemById('vintage_camera_01'),
]
.filter((item): item is NonNullable<typeof item> => item !== undefined)
.map(masterItem => {
  return {
    ...masterItem,
    instanceId: uuidv4(),
    quantity: masterItem.id === 'energy_bar_01' ? 2 : 1,
    condition: { durability: 100 },
    itemLevel: 1,
    itemXp: 0,
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


export const initialPlayerLocation: Position = {
  latitude: 48.8566,
  longitude: 2.3522,
  name: 'Paris, France',
};

export const defaultAvatarUrl = 'https://placehold.co/150x150.png';
export const initialPlayerMoney: number = 50;
export const initialTransactionLog: Transaction[] = [];

export const initialToneSettings: ToneSettings = AVAILABLE_TONES.reduce((acc, tone) => {
  acc[tone] = false;
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
