
import type { GameState, Player, IntelligentItem, ToneSettings, Position, JournalEntry, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, Transaction, HistoricalContact, AdvancedSkillSystem, AdvancedPhysiologySystem, SkillDetail } from '@/lib/types';
import { AVAILABLE_TONES } from './types/tone-types';
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
  initialMomentum,
} from '@/data/initial-game-data';
import { saveGameStateToLocal } from '@/services/localStorageService';
import { deepmerge } from 'deepmerge-ts';
import { v4 as uuidv4 } from 'uuid';

// --- UTILITIES MOVED HERE TO BREAK CIRCULAR DEPENDENCY ---
export function calculateXpToNextLevel(level: number): number {
  if (level <= 0) level = 1;
  // A steeper curve: 100 base, 50 multiplier per level squared
  return Math.floor(100 + (level -1) * 50 + Math.pow(level -1, 2.2) * 20);
}

export function getSkillUpgradeCost(currentLevel: number): number {
  if (currentLevel <= 0) currentLevel = 1;
  return Math.floor(20 + Math.pow(currentLevel, 1.8) * 5);
}
// --- END MOVED UTILITIES ---


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

function hydrateStats(savedStats?: Partial<PlayerStats>): PlayerStats {
    if (!savedStats || Object.keys(savedStats).length < 12) {
        return { ...initialPlayerStats };
    }
    return deepmerge(initialPlayerStats, savedStats);
}


function hydrateSkills(savedSkills?: Partial<AdvancedSkillSystem>): AdvancedSkillSystem {
    if (!savedSkills || !savedSkills.physiques?.arme_a_feu) { // A quick check for the old format
        return { ...initialSkills };
    }
    return deepmerge(initialSkills, savedSkills);
}

function hydrateToneSettings(savedToneSettings?: Partial<ToneSettings>): ToneSettings {
    const cleanSettings: ToneSettings = { ...initialToneSettings }; // All false

    if (!savedToneSettings) {
        return cleanSettings;
    }

    const synonyms: Record<string, typeof AVAILABLE_TONES[number]> = {
      'Mystère': 'Mystérieux',
      'Science Fiction': 'Science-Fiction',
      'Humour': 'Humoristique',
      'Romance': 'Romantique',
    };
    
    // Iterate over all keys in the saved object
    for (const savedKey in savedToneSettings) {
        if (Object.prototype.hasOwnProperty.call(savedToneSettings, savedKey)) {
            const value = (savedToneSettings as any)[savedKey];
            let targetKey: string | undefined = undefined;

            // Check if the key is directly valid
            if (AVAILABLE_TONES.includes(savedKey as any)) {
                targetKey = savedKey;
            } 
            // Else, check if it's a known synonym
            else if (synonyms[savedKey]) {
                targetKey = synonyms[savedKey];
            }

            // If we found a valid key (direct or via synonym), process it
            if (targetKey && AVAILABLE_TONES.includes(targetKey as any)) {
                // Convert to boolean and assign to the clean object
                (cleanSettings as any)[targetKey] = typeof value === 'boolean' ? value : (typeof value === 'number' && value > 0);
            }
            // If the key is invalid and not a synonym, it is ignored and not added to cleanSettings.
        }
    }

    return cleanSettings;
}

export function hydratePlayer(savedPlayer?: Partial<Player>): Player {
    // Manually merge physiology to prevent array concatenation issues with deepmerge
    const savedPhysiology = savedPlayer?.physiology;
    const physiology: AdvancedPhysiologySystem = {
        basic_needs: {
            hunger: {
                ...initialPhysiology.basic_needs.hunger,
                ...(savedPhysiology?.basic_needs?.hunger || {}),
                dietary_preferences: savedPhysiology?.basic_needs?.hunger?.dietary_preferences && Array.isArray(savedPhysiology.basic_needs.hunger.dietary_preferences) 
                    ? [...new Set(savedPhysiology.basic_needs.hunger.dietary_preferences)] // De-duplicate old bad data
                    : initialPhysiology.basic_needs.hunger.dietary_preferences,
                food_memories: savedPhysiology?.basic_needs?.hunger?.food_memories || initialPhysiology.basic_needs.hunger.food_memories,
            },
            thirst: {
                ...initialPhysiology.basic_needs.thirst,
                ...(savedPhysiology?.basic_needs?.thirst || {}),
                beverage_tolerance: savedPhysiology?.basic_needs?.thirst?.beverage_tolerance && Array.isArray(savedPhysiology.basic_needs.thirst.beverage_tolerance)
                    ? [...new Set(savedPhysiology.basic_needs.thirst.beverage_tolerance)]
                    : initialPhysiology.basic_needs.thirst.beverage_tolerance,
            }
        }
    };


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
    stats: hydrateStats(savedPlayer?.stats),
    skills: hydrateSkills(savedPlayer?.skills),
    physiology: physiology,
    momentum: { ...initialMomentum, ...(savedPlayer?.momentum || {}) },
    traitsMentalStates: savedPlayer?.traitsMentalStates || [...initialTraitsMentalStates],
    progression: { ...initialProgression, ...(savedPlayer?.progression || {}) },
    alignment: { ...initialAlignment, ...(savedPlayer?.alignment || {}) },
    money: typeof savedPlayer?.money === 'number' ? savedPlayer.money : initialPlayerMoney,
    inventory: [],
    currentLocation: savedPlayer?.currentLocation || initialPlayerLocation,
    toneSettings: hydrateToneSettings(savedPlayer?.toneSettings),
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

  const inventoryToHydrate = savedPlayer?.inventory && savedPlayer.inventory.length > 0 ? savedPlayer.inventory : initialInventory;
  player.inventory = inventoryToHydrate.map((item: any) => {
    const masterItem = getMasterItemById(item.id || item.itemId);
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
        acquisitionStory: item.memory?.acquisitionStory || "Fait partie de votre équipement de départ standard.",
        usageHistory: item.memory?.usageHistory || [],
        evolution_history: item.memory?.evolution_history || [],
      },
      economics: {
        ...masterItem.economics,
        ...(item.economics || {})
      },
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
