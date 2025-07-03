
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

    for (const category in savedSkills) {
        if (Object.prototype.hasOwnProperty.call(newSkills, category)) {
            const savedCategorySkills = (savedSkills as any)[category];
            const newCategorySkills = (newSkills as any)[category];

            if(typeof savedCategorySkills !== 'object' || savedCategorySkills === null) continue;

            for (const skillName in savedCategorySkills) {
                if (Object.prototype.hasOwnProperty.call(newCategorySkills, skillName)) {
                    const savedSkill = savedCategorySkills[skillName];
                    
                    if (typeof savedSkill === 'number') {
                        newCategorySkills[skillName].level = savedSkill;
                        newCategorySkills[skillName].xp = 0;
                        newCategorySkills[skillName].xpToNext = getSkillUpgradeCost(savedSkill);
                    } 
                    else if (typeof savedSkill === 'object' && savedSkill !== null && typeof savedSkill.level === 'number') {
                        const currentLevel = savedSkill.level || newCategorySkills[skillName].level;
                        newCategorySkills[skillName].level = currentLevel;
                        newCategorySkills[skillName].xp = savedSkill.xp || 0;
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
    
    for (const tone of AVAILABLE_TONES) {
        (cleanSettings as any)[tone] = false;
    }

    if (!savedToneSettings || typeof savedToneSettings !== 'object') {
        return cleanSettings;
    }

    const synonyms: Record<string, typeof AVAILABLE_TONES[number]> = {
      'Mystère': 'Mystérieux',
      'Science Fiction': 'Science-Fiction',
      'Humour': 'Humoristique',
      'Romance': 'Romantique',
    };
    
    for (const savedKey in savedToneSettings) {
        if (Object.prototype.hasOwnProperty.call(savedToneSettings, savedKey)) {
            let targetKey: typeof AVAILABLE_TONES[number] | undefined;

            if (AVAILABLE_TONES.includes(savedKey as any)) {
                targetKey = savedKey as any;
            } else if (synonyms[savedKey]) {
                targetKey = synonyms[savedKey];
            }

            if (targetKey) {
                const value = (savedToneSettings as any)[savedKey];
                (cleanSettings as any)[targetKey] = !!value; // Converts numbers to booleans, handles existing booleans
            }
        }
    }

    return cleanSettings;
}

export function hydratePlayer(savedPlayer?: Partial<Player>): Player {
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

    if (!savedPlayer || typeof savedPlayer !== 'object') {
        return defaults;
    }

    const player: Player = {
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
        
        stats: hydrateStats(savedPlayer.stats),
        skills: hydrateSkills(savedPlayer.skills),
        toneSettings: hydrateToneSettings(savedPlayer.toneSettings),

        traitsMentalStates: Array.isArray(savedPlayer.traitsMentalStates) ? savedPlayer.traitsMentalStates : defaults.traitsMentalStates,
        progression: { ...defaults.progression, ...(savedPlayer.progression || {}) },
        alignment: { ...defaults.alignment, ...(savedPlayer.alignment || {}) },
        momentum: { ...defaults.momentum, ...(savedPlayer.momentum || {}) },
        
        physiology: savedPlayer.physiology ? {
            basic_needs: {
                hunger: { ...defaults.physiology.basic_needs.hunger, ...(savedPlayer.physiology.basic_needs?.hunger || {}) },
                thirst: { ...defaults.physiology.basic_needs.thirst, ...(savedPlayer.physiology.basic_needs?.thirst || {}) },
            }
        } : defaults.physiology,
        
        questLog: Array.isArray(savedPlayer.questLog) ? savedPlayer.questLog : defaults.questLog,
        decisionLog: Array.isArray(savedPlayer.decisionLog) ? savedPlayer.decisionLog : defaults.decisionLog,
        clues: Array.isArray(savedPlayer.clues) ? savedPlayer.clues : defaults.clues,
        documents: Array.isArray(savedPlayer.documents) ? savedPlayer.documents : defaults.documents,
        investigationNotes: savedPlayer.investigationNotes || defaults.investigationNotes,
        transactionLog: Array.isArray(savedPlayer.transactionLog) ? savedPlayer.transactionLog : defaults.transactionLog,
        historicalContacts: Array.isArray(savedPlayer.historicalContacts) ? savedPlayer.historicalContacts : defaults.historicalContacts,

        encounteredPNJs: (Array.isArray(savedPlayer.encounteredPNJs) ? savedPlayer.encounteredPNJs : defaults.encounteredPNJs).map((pnj: any) => ({
            id: pnj.id || uuidv4(),
            name: pnj.name || 'Inconnu',
            description: pnj.description || '',
            relationStatus: pnj.relationStatus || 'neutral',
            trustLevel: typeof pnj.trustLevel === 'number' ? pnj.trustLevel : 50,
            importance: pnj.importance || 'minor',
            firstEncountered: pnj.firstEncountered || 'Lieu inconnu',
            notes: Array.isArray(pnj.notes) ? pnj.notes : [],
            lastSeen: pnj.lastSeen || new Date(0).toISOString(),
            dispositionScore: typeof pnj.dispositionScore === 'number' ? pnj.dispositionScore : 50,
            interactionHistory: Array.isArray(pnj.interactionHistory) ? pnj.interactionHistory : [],
        })),

        inventory: (Array.isArray(savedPlayer.inventory) && savedPlayer.inventory.length > 0 ? savedPlayer.inventory : defaults.inventory)
            .map((item: any) => {
                const masterItem = getMasterItemById(item.id || item.itemId);
                if (!masterItem) return null; // Filter out unknown items
                
                // Rebuild the economics object defensively
                const economics = (item.economics && typeof item.economics.base_value === 'number')
                    ? item.economics 
                    : masterItem.economics;

                // Rebuild the contextual properties defensively
                const contextual_properties = (item.contextual_properties && typeof item.contextual_properties.local_value === 'number')
                    ? item.contextual_properties
                    : {
                        local_value: economics.base_value,
                        legal_status: 'legal',
                        social_perception: 'normal',
                        utility_rating: 50,
                    };

                // Reconstruct the item from a valid base, overlay saved data, then enforce valid nested objects.
                const hydratedItem: IntelligentItem = {
                    ...masterItem,
                    ...(item as Partial<IntelligentItem>), // Overlay saved data
                    instanceId: item.instanceId || uuidv4(),
                    quantity: typeof item.quantity === 'number' ? item.quantity : 1,
                    itemLevel: typeof item.itemLevel === 'number' ? item.itemLevel : 1,
                    itemXp: typeof item.itemXp === 'number' ? item.itemXp : 0,
                    xpToNextItemLevel: typeof item.xpToNextItemLevel === 'number' ? item.xpToNextItemLevel : (masterItem.xpToNextItemLevel || 0),
                    
                    economics: economics, // Enforce valid economics object
                    contextual_properties: contextual_properties, // Enforce valid contextual object

                    condition: { durability: item.condition?.durability ?? 100 },
                    
                    memory: {
                        acquiredAt: item.memory?.acquiredAt || new Date(0).toISOString(),
                        acquisitionStory: item.memory?.acquisitionStory || "Objet de départ.",
                        usageHistory: Array.isArray(item.memory?.usageHistory) ? item.memory.usageHistory : [],
                        evolution_history: Array.isArray(item.memory?.evolution_history) ? item.memory.evolution_history : [],
                    },
                };
                return hydratedItem;
            }).filter((item): item is IntelligentItem => item !== null),
    };
    
    if (!player.progression.xpToNextLevel || player.progression.xpToNextLevel <= player.progression.xp) {
        player.progression.xpToNextLevel = calculateXpToNextLevel(player.progression.level);
    }
  
    return player;
}

  