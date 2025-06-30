

import type { GameState, Player, IntelligentItem, ToneSettings, Position, JournalEntry, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, Transaction, HistoricalContact, AdvancedSkillSystem, AdvancedPhysiologySystem } from './types';
import { getMasterItemById } from '@/data/items';
import { saveCharacter } from '@/services/firestore-service';
import {
  initialPlayerStats,
  initialSkills,
  initialTraitsMentalStates,
  initialProgression,
  initialAlignment,
  initialInventory,
  initialPlayerLocation,
  defaultAvatarUrl,
  initialPlayerMoney,
  initialQuestLog,
  initialEncounteredPNJs,
  initialDecisionLog,
  initialClues,
  initialDocuments,
  initialInvestigationNotes,
  initialToneSettings,
  initialTransactionLog,
  initialHistoricalContacts,
  initialPhysiology,
} from '@/data/initial-game-data';
import { getInitialScenario } from './game-logic';
import { saveGameStateToLocal } from '@/services/localStorageService';
import { calculateXpToNextLevel } from './player-state-helpers';
import { deepmerge } from 'deepmerge-ts';
import { v4 as uuidv4 } from 'uuid';


export interface SaveGameResult {
  localSaveSuccess: boolean;
  cloudSaveSuccess: boolean | null;
}

export async function saveGameState(uid: string, characterId: string, state: GameState, saveType: 'auto' | 'manual' | 'checkpoint'): Promise<SaveGameResult> {
  const result: SaveGameResult = { localSaveSuccess: false, cloudSaveSuccess: null };
  if (!state || !state.player) {
    console.warn("Save Game Warning: Attempted to save invalid or incomplete game state.", state);
    return result;
  }
  
  // Local save remains simple, it just caches the last played character's state.
  result.localSaveSuccess = saveGameStateToLocal(state);

  if (state.player && !state.player.isAnonymous) {
    try {
      await saveCharacter(uid, characterId, state, saveType);
      result.cloudSaveSuccess = true;
    } catch (error) {
      result.cloudSaveSuccess = false;
      console.error("GameLogic Error: Cloud save attempt failed:", error);
    }
  }
  return result;
}

function migrateSkills(oldSkills: any): AdvancedSkillSystem {
    const newSkills = JSON.parse(JSON.stringify(initialSkills)); // Deep copy of the initial structure
    if (!oldSkills || typeof oldSkills !== 'object' || Array.isArray(oldSkills)) {
        return newSkills;
    }

    // Check if it's already the new structure
    if ('cognitive' in oldSkills && 'social' in oldSkills) {
        return deepmerge(newSkills, oldSkills);
    }
    
    // Map old flat skills to new nested structure
    if (typeof oldSkills.Informatique === 'number') newSkills.technical.technology = oldSkills.Informatique;
    if (typeof oldSkills.Discretion === 'number') newSkills.physical.stealth = oldSkills.Discretion;
    if (typeof oldSkills.Dialogue === 'number') newSkills.social.persuasion = oldSkills.Dialogue;
    if (typeof oldSkills.Perception === 'number') newSkills.cognitive.observation = oldSkills.Perception;
    if (typeof oldSkills.Survie === 'number') newSkills.survival.wilderness = oldSkills.Survie;

    return newSkills;
}

export function hydratePlayer(savedPlayer?: Partial<Player>): Player {
  const player: Player = {
    uid: savedPlayer?.uid,
    isAnonymous: savedPlayer?.isAnonymous,
    name: savedPlayer?.name || '',
    gender: savedPlayer?.gender || "Préfère ne pas préciser",
    age: savedPlayer?.age || 25,
    avatarUrl: savedPlayer?.avatarUrl || defaultAvatarUrl,
    origin: savedPlayer?.origin || "Inconnue",
    background: savedPlayer?.background || '',
    era: savedPlayer?.era || 'Époque Contemporaine',
    startingLocationName: savedPlayer?.startingLocationName,
    stats: { ...initialPlayerStats, ...(savedPlayer?.stats || {}) },
    skills: migrateSkills(savedPlayer?.skills), // Use migration function for skills
    physiology: deepmerge(initialPhysiology, savedPlayer?.physiology || {}), // Hydrate physiology
    traitsMentalStates: savedPlayer?.traitsMentalStates || [...initialTraitsMentalStates],
    progression: { ...initialProgression, ...(savedPlayer?.progression || {}) },
    alignment: { ...initialAlignment, ...(savedPlayer?.alignment || {}) },
    money: typeof savedPlayer?.money === 'number' ? savedPlayer.money : initialPlayerMoney,
    inventory: [],
    currentLocation: savedPlayer?.currentLocation || initialPlayerLocation,
    toneSettings: { ...initialToneSettings, ...(savedPlayer?.toneSettings || {}) },
    questLog: savedPlayer?.questLog || [...initialQuestLog],
    encounteredPNJs: savedPlayer?.encounteredPNJs || [...initialEncounteredPNJs],
    decisionLog: savedPlayer?.decisionLog || [...initialDecisionLog],
    clues: savedPlayer?.clues || [...initialClues],
    documents: savedPlayer?.documents || [...initialDocuments],
    investigationNotes: savedPlayer?.investigationNotes || initialInvestigationNotes,
    lastPlayed: savedPlayer?.lastPlayed,
    transactionLog: savedPlayer?.transactionLog || [...initialTransactionLog],
    historicalContacts: savedPlayer?.historicalContacts || [...initialHistoricalContacts],
  };

  if (!player.progression.xpToNextLevel) {
    player.progression.xpToNextLevel = calculateXpToNextLevel(player.progression.level);
  }

  // Handle inventory hydration, converting old item formats to the new IntelligentItem structure
  const inventoryToHydrate = savedPlayer?.inventory && savedPlayer.inventory.length > 0 ? savedPlayer.inventory : initialInventory;
  player.inventory = inventoryToHydrate.map((item: any) => { // Use 'any' to handle old format
    const masterItem = getMasterItemById(item.id || item.itemId); // Handle old itemId property
    if (!masterItem) {
      console.warn(`Could not find master item for id ${item.id || item.itemId} during hydration.`);
      return null;
    }
    
    const newIntelligentItem: IntelligentItem = {
      ...masterItem,
      ...item,
      instanceId: item.instanceId || uuidv4(),
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      itemLevel: typeof item.itemLevel === 'number' ? item.itemLevel : 1,
      itemXp: typeof item.itemXp === 'number' ? item.itemXp : (typeof item.experience === 'number' ? item.experience : 0),
      xpToNextItemLevel: typeof item.xpToNextItemLevel === 'number' && item.xpToNextItemLevel > 0 ? item.xpToNextItemLevel : (masterItem.xpToNextItemLevel || 0),
      condition: {
        durability: typeof item.condition === 'number' ? item.condition : (item.condition?.durability ?? 100),
      },
      skillModifiers: item.skillModifiers || masterItem.skillModifiers,
      memory: {
        acquiredAt: item.acquiredAt || item.memory?.acquiredAt || new Date(0).toISOString(),
        acquisitionStory: item.memory?.acquisitionStory || "Fait partie de votre équipement de départ.",
        usageHistory: item.memory?.usageHistory || [],
        lastUsed: item.lastUsed || item.memory?.lastUsed,
      },
      economics: {
        ...masterItem.economics,
        ...(item.economics || {})
      },
       // Initialize contextual properties - these will be updated by game logic
      contextual_properties: {
        local_value: item.contextual_properties?.local_value || masterItem.economics.base_value,
        legal_status: item.contextual_properties?.legal_status || 'legal',
        social_perception: item.contextual_properties?.social_perception || 'normal',
        utility_rating: item.contextual_properties?.utility_rating || 50,
      }
    };

    return newIntelligentItem;
  }).filter((item): item is IntelligentItem => item !== null);


  return player;
}
