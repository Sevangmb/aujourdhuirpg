
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
    const newStats = JSON.parse(JSON.stringify(initialPlayerStats));
    if (!savedStats) {
        return newStats;
    }

    for (const key in savedStats) {
        if (Object.prototype.hasOwnProperty.call(newStats, key)) {
            const statKey = key as keyof PlayerStats;
            const savedStat = savedStats[statKey];

            if (typeof savedStat === 'number') {
                newStats[statKey].value = savedStat;
                // If max is not defined for this stat in initial stats, it remains undefined.
                // If it is defined (like for Sante), it keeps the default max.
                if (newStats[statKey].max) {
                    newStats[statKey].value = Math.min(savedStat, newStats[statKey].max!);
                }
            } else if (typeof savedStat === 'object' && savedStat !== null && typeof savedStat.value === 'number') {
                newStats[statKey].value = savedStat.value;
                if (typeof savedStat.max === 'number') {
                    newStats[statKey].max = savedStat.max;
                }
            }
        }
    }
    return newStats;
}


function hydrateSkills(savedSkills?: Partial<AdvancedSkillSystem>): AdvancedSkillSystem {
    const newSkills = JSON.parse(JSON.stringify(initialSkills));

    if (!savedSkills) {
        return newSkills;
    }

    // Iterate over each category in the saved skills
    for (const category in savedSkills) {
        if (Object.prototype.hasOwnProperty.call(newSkills, category)) {
            const savedCategorySkills = (savedSkills as any)[category];
            const newCategorySkills = (newSkills as any)[category];

            // Iterate over each skill in the category
            for (const skillName in savedCategorySkills) {
                if (Object.prototype.hasOwnProperty.call(newCategorySkills, skillName)) {
                    const savedSkill = savedCategorySkills[skillName];
                    
                    // The old format might just be a number for the level
                    if (typeof savedSkill === 'number') {
                        newCategorySkills[skillName].level = savedSkill;
                        // We can't know the XP, so we'll reset it based on the new level.
                        newCategorySkills[skillName].xp = 0;
                        newCategorySkills[skillName].xpToNext = getSkillUpgradeCost(savedSkill);
                    } 
                    // The new format is an object with a 'level' property
                    else if (typeof savedSkill === 'object' && savedSkill !== null && typeof savedSkill.level === 'number') {
                        // Safely merge the new object format
                        const currentLevel = savedSkill.level || newCategorySkills[skillName].level;
                        newCategorySkills[skillName].level = currentLevel;
                        newCategorySkills[skillName].xp = savedSkill.xp || 0;
                        // Recalculate xpToNext to be safe
                        newCategorySkills[skillName].xpToNext = savedSkill.xpToNext || getSkillUpgradeCost(currentLevel);
                    }
                }
            }
        }
    }

    return newSkills;
}

function hydrateToneSettings(savedToneSettings?: Partial<ToneSettings>): ToneSettings {
    const cleanSettings: ToneSettings = {};
    
    // Set all available tones to false by default.
    for (const tone of AVAILABLE_TONES) {
        (cleanSettings as any)[tone] = false;
    }

    if (!savedToneSettings) {
        return cleanSettings;
    }

    const synonyms: Record<string, typeof AVAILABLE_TONES[number]> = {
      'Mystère': 'Mystérieux',
      'Science Fiction': 'Science-Fiction',
      'Humour': 'Humoristique',
      'Romance': 'Romantique',
    };
    
    // Iterate over the keys from the saved data.
    for (const savedKey in savedToneSettings) {
        if (Object.prototype.hasOwnProperty.call(savedToneSettings, savedKey)) {
            let targetKey: typeof AVAILABLE_TONES[number] | undefined;

            // Find the canonical key
            if (AVAILABLE_TONES.includes(savedKey as any)) {
                targetKey = savedKey as any;
            } else if (synonyms[savedKey]) {
                targetKey = synonyms[savedKey];
            }

            // If a valid canonical key was found...
            if (targetKey) {
                const value = (savedToneSettings as any)[savedKey];
                //...set its value in the clean object, converting numbers to booleans.
                (cleanSettings as any)[targetKey] = typeof value === 'boolean' ? value : (typeof value === 'number' && value > 0);
            }
        }
    }

    return cleanSettings;
}

export function hydratePlayer(savedPlayer?: Partial<Player>): Player {
    // Start with a clean slate of defaults to avoid merging issues.
    const defaults = {
        name: 'Nouveau Joueur',
        gender: 'Préfère ne pas préciser',
        age: 25,
        avatarUrl: defaultAvatarUrl,
        origin: 'Inconnue',
        era: 'Époque Contemporaine' as const,
        background: '',
        stats: initialPlayerStats,
        skills: initialSkills,
        physiology: initialPhysiology,
        momentum: initialMomentum,
        traitsMentalStates: [...initialTraitsMentalStates],
        progression: initialProgression,
        alignment: initialAlignment,
        money: initialPlayerMoney,
        inventory: initialInventory,
        currentLocation: initialPlayerLocation,
        toneSettings: initialToneSettings,
        questLog: [...initialQuestLog],
        encounteredPNJs: [...initialEncounteredPNJs],
        decisionLog: [...initialDecisionLog],
        clues: [...initialClues],
        documents: [...initialDocuments],
        investigationNotes: initialInvestigationNotes,
        transactionLog: [...initialTransactionLog],
        historicalContacts: [...initialHistoricalContacts],
    };

    if (!savedPlayer) {
        return defaults;
    }

    // Explicitly copy and validate fields
    const player: Player = {
        ...defaults,
        uid: savedPlayer.uid,
        isAnonymous: savedPlayer.isAnonymous,
        name: savedPlayer.name || defaults.name,
        gender: savedPlayer.gender || defaults.gender,
        age: savedPlayer.age || defaults.age,
        avatarUrl: savedPlayer.avatarUrl || defaults.avatarUrl,
        origin: savedPlayer.origin || defaults.origin,
        era: savedPlayer.era || defaults.era,
        background: savedPlayer.background || defaults.background,
        startingLocationName: savedPlayer.startingLocationName,
        money: typeof savedPlayer.money === 'number' ? savedPlayer.money : defaults.money,
        currentLocation: savedPlayer.currentLocation || defaults.currentLocation,
        lastPlayed: savedPlayer.lastPlayed,
        traitsMentalStates: savedPlayer.traitsMentalStates || defaults.traitsMentalStates,
        questLog: savedPlayer.questLog || defaults.questLog,
        encounteredPNJs: savedPlayer.encounteredPNJs || defaults.encounteredPNJs,
        decisionLog: savedPlayer.decisionLog || defaults.decisionLog,
        clues: savedPlayer.clues || defaults.clues,
        documents: savedPlayer.documents || defaults.documents,
        investigationNotes: savedPlayer.investigationNotes || defaults.investigationNotes,
        transactionLog: savedPlayer.transactionLog || defaults.transactionLog,
        historicalContacts: savedPlayer.historicalContacts || defaults.historicalContacts,

        // Use robust hydrators for complex nested objects
        stats: hydrateStats(savedPlayer.stats),
        skills: hydrateSkills(savedPlayer.skills),
        progression: { ...initialProgression, ...(savedPlayer.progression || {}) },
        alignment: { ...initialAlignment, ...(savedPlayer.alignment || {}) },
        momentum: { ...initialMomentum, ...(savedPlayer.momentum || {}) },
        
        physiology: {
            basic_needs: {
                hunger: {
                    level: savedPlayer.physiology?.basic_needs?.hunger?.level ?? initialPhysiology.basic_needs.hunger.level,
                    satisfaction_quality: savedPlayer.physiology?.basic_needs?.hunger?.satisfaction_quality ?? initialPhysiology.basic_needs.hunger.satisfaction_quality,
                    cultural_craving: savedPlayer.physiology?.basic_needs?.hunger?.cultural_craving ?? initialPhysiology.basic_needs.hunger.cultural_craving,
                    dietary_preferences: Array.isArray(savedPlayer.physiology?.basic_needs?.hunger?.dietary_preferences) 
                        ? [...new Set(savedPlayer.physiology.basic_needs.hunger.dietary_preferences)]
                        : initialPhysiology.basic_needs.hunger.dietary_preferences,
                    food_memories: savedPlayer.physiology?.basic_needs?.hunger?.food_memories || initialPhysiology.basic_needs.hunger.food_memories,
                },
                thirst: {
                    level: savedPlayer.physiology?.basic_needs?.thirst?.level ?? initialPhysiology.basic_needs.thirst.level,
                    hydration_quality: savedPlayer.physiology?.basic_needs?.thirst?.hydration_quality ?? initialPhysiology.basic_needs.thirst.hydration_quality,
                    climate_adjustment: savedPlayer.physiology?.basic_needs?.thirst?.climate_adjustment ?? initialPhysiology.basic_needs.thirst.climate_adjustment,
                    beverage_tolerance: Array.isArray(savedPlayer.physiology?.basic_needs?.thirst?.beverage_tolerance)
                        ? [...new Set(savedPlayer.physiology.basic_needs.thirst.beverage_tolerance)]
                        : initialPhysiology.basic_needs.thirst.beverage_tolerance,
                    cultural_beverage_preference: savedPlayer.physiology?.basic_needs?.thirst?.cultural_beverage_preference ?? initialPhysiology.basic_needs.thirst.cultural_beverage_preference,
                }
            }
        },
        
        toneSettings: hydrateToneSettings(savedPlayer.toneSettings),

        inventory: (savedPlayer.inventory && savedPlayer.inventory.length > 0 ? savedPlayer.inventory : defaults.inventory)
            .map((item: any) => {
                const masterItem = getMasterItemById(item.id || item.itemId);
                if (!masterItem) return null; // Filter out invalid items
                
                return {
                    ...masterItem,
                    ...item,
                    instanceId: item.instanceId || uuidv4(),
                    quantity: typeof item.quantity === 'number' ? item.quantity : 1,
                    itemLevel: typeof item.itemLevel === 'number' ? item.itemLevel : 1,
                    itemXp: typeof item.itemXp === 'number' ? item.itemXp : 0,
                    xpToNextItemLevel: typeof item.xpToNextItemLevel === 'number' ? item.xpToNextItemLevel : (masterItem.xpToNextItemLevel || 0),
                    condition: { durability: item.condition?.durability ?? 100 },
                    memory: {
                        acquiredAt: item.memory?.acquiredAt || new Date(0).toISOString(),
                        acquisitionStory: item.memory?.acquisitionStory || "Objet de départ.",
                        usageHistory: item.memory?.usageHistory || [],
                        evolution_history: item.memory?.evolution_history || [],
                    },
                    contextual_properties: item.contextual_properties || {
                        local_value: masterItem.economics.base_value,
                        legal_status: 'legal',
                        social_perception: 'normal',
                        utility_rating: 50,
                    },
                };
            }).filter((item): item is IntelligentItem => item !== null),
    };
    
    // Final check on XP to next level to prevent bad data
    if (!player.progression.xpToNextLevel || player.progression.xpToNextLevel <= player.progression.xp) {
        player.progression.xpToNextLevel = calculateXpToNextLevel(player.progression.level);
    }
  
    return player;
}
