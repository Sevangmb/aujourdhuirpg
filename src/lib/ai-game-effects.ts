
/**
 * @fileOverview Functions for processing and applying the effects of an AI-generated scenario to the player state.
 */

import type { PlayerStats, Player, Progression, InventoryItem, GameNotification, Quest, PNJ, MajorDecision, LocationData, Clue, GameDocument, ClueType, DocumentType, Skills } from './types'; // Added Skills
import type { GenerateScenarioOutput, QuestInputSchema as AIQuestInputSchema, ClueInputSchema as AIClueInputSchema, DocumentInputSchema as AIDocumentInputSchema } from '@/ai/flows/generate-scenario';
import { getMasterItemById, type MasterInventoryItem } from '@/data/items'; // Added MasterInventoryItem
import { initialPlayerMoney, initialInvestigationNotes } from '@/data/initial-game-data';
import { parsePlayerAction, type ParsedAction, type ActionType } from './action-parser'; // New import
import { performSkillCheck, type SkillCheckResult } from './skill-check'; // New import

// Keep existing helper functions like calculateXpToNextLevel, applyStatChanges etc. if they are used by client-side logic later.
// For now, they might be unused if AI doesn't dictate these changes directly.
function calculateXpToNextLevel(level: number): number {
  if (level <= 0) level = 1;
  return level * 100 + 50 * (level -1) * level;
}

export function applyStatChanges(currentStats: PlayerStats, changes: Record<string, number>): PlayerStats {
  const newStats = { ...currentStats };
  for (const key in changes) {
    if (Object.prototype.hasOwnProperty.call(newStats, key)) {
      newStats[key] = Math.max(0, newStats[key] + changes[key]);
    } else {
      newStats[key] = Math.max(0, changes[key]);
    }
  }
  return newStats;
}

export function addItemToInventory(currentInventory: InventoryItem[], itemId: string, quantityToAdd: number): InventoryItem[] {
  const masterItem = getMasterItemById(itemId);
  if (!masterItem) {
    console.warn(`Inventory Warning: Attempted to add unknown item ID: ${itemId}. Item not added.`);
    return currentInventory;
  }

  const newInventory = [...currentInventory];
  const existingItemIndex = newInventory.findIndex(item => item.id === itemId);

  if (existingItemIndex > -1) {
    if (masterItem.stackable) {
      newInventory[existingItemIndex].quantity += quantityToAdd;
    } else {
      console.warn(`Inventory Info: Item '${masterItem.name}' (ID: ${itemId}) is not stackable and player already possesses one. Quantity not changed.`);
    }
  } else {
    newInventory.push({
      ...masterItem,
      quantity: masterItem.stackable ? quantityToAdd : 1
    });
  }
  return newInventory;
}


export function removeItemFromInventory(currentInventory: InventoryItem[], itemIdToRemoveOrName: string, quantityToRemove: number): { updatedInventory: InventoryItem[], removedItemEffects?: Partial<PlayerStats>, removedItemName?: string } {
  const newInventory = [...currentInventory];
  let itemIndex = newInventory.findIndex(item => item.id === itemIdToRemoveOrName);
  if (itemIndex === -1) {
    itemIndex = newInventory.findIndex(item => item.name.toLowerCase() === itemIdToRemoveOrName.toLowerCase());
  }

  let removedItemEffects: Partial<PlayerStats> | undefined = undefined;
  let removedItemName: string | undefined = undefined;

  if (itemIndex > -1) {
    const itemBeingRemoved = newInventory[itemIndex];
    removedItemEffects = itemBeingRemoved.effects;
    removedItemName = itemBeingRemoved.name;

    if (itemBeingRemoved.quantity <= quantityToRemove) {
      newInventory.splice(itemIndex, 1);
    } else {
      newInventory[itemIndex].quantity -= quantityToRemove;
    }
  } else {
    console.warn(`Inventory Warning: Attempted to remove item not in inventory: ${itemIdToRemoveOrName}`);
  }
  return { updatedInventory: newInventory, removedItemEffects, removedItemName };
}

export function addXP(currentProgression: Progression, xpGained: number): { newProgression: Progression, leveledUp: boolean } {
  const newProgression = { ...currentProgression };
  if (typeof newProgression.level !== 'number' || newProgression.level <= 0) newProgression.level = 1;
  if (typeof newProgression.xp !== 'number' || newProgression.xp < 0) newProgression.xp = 0;
  if (typeof newProgression.xpToNextLevel !== 'number' || newProgression.xpToNextLevel <= 0) {
    newProgression.xpToNextLevel = calculateXpToNextLevel(newProgression.level);
  }

  newProgression.xp += xpGained;
  let leveledUp = false;

  while (newProgression.xp >= newProgression.xpToNextLevel && newProgression.xpToNextLevel > 0) {
    newProgression.level += 1;
    newProgression.xp -= newProgression.xpToNextLevel;
    newProgression.xpToNextLevel = calculateXpToNextLevel(newProgression.level);
    leveledUp = true;
  }
  if (newProgression.xp < 0) newProgression.xp = 0;

  return { newProgression, leveledUp };
}

export function addMoney(currentMoney: number, amount: number): number {
  return Math.max(0, currentMoney + amount);
}

export function addQuestToLog(currentQuestLog: Quest[], newQuestData: AIQuestInputSchema): Quest[] {
  const newQuest: Quest = {
    id: newQuestData.id || `quest_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    title: newQuestData.title,
    description: newQuestData.description,
    type: newQuestData.type || 'secondary',
    status: newQuestData.status || 'active',
    objectives: newQuestData.objectives ? newQuestData.objectives.map(obj => ({ id: obj.id, description: obj.description, isCompleted: obj.isCompleted === undefined ? false : obj.isCompleted })) : [],
    giver: newQuestData.giver,
    reward: newQuestData.reward,
    moneyReward: newQuestData.moneyReward,
    relatedLocation: newQuestData.relatedLocation,
    dateAdded: new Date().toISOString(),
  };

  if ((currentQuestLog || []).find(q => q.id === newQuest.id)) {
    console.warn(`QuestLog Warning: Attempted to add quest with duplicate ID: ${newQuest.id}`);
    return currentQuestLog || [];
  }
  return [...(currentQuestLog || []), newQuest];
}


export function updateQuestInLog(currentQuestLog: Quest[], questId: string, updates: Partial<Omit<Quest, 'id' | 'objectives'>> & { updatedObjectives?: { objectiveId: string; isCompleted: boolean; }[], newObjectiveDescription?: string }): { updatedLog: Quest[], completedQuestWithMoneyReward?: Quest } {
  let completedQuestWithMoneyReward: Quest | undefined = undefined;
  const logToUpdate = currentQuestLog || [];

  const updatedLog = logToUpdate.map(quest => {
    if (quest.id === questId) {
      const updatedQuest = { ...quest, ...updates };
      delete updatedQuest.updatedObjectives;
      delete updatedQuest.newObjectiveDescription;

      if (updates.updatedObjectives) {
        updatedQuest.objectives = (quest.objectives || []).map(obj => {
          const objectiveUpdate = updates.updatedObjectives?.find(uObj => uObj.objectiveId === obj.id);
          return objectiveUpdate ? { ...obj, isCompleted: objectiveUpdate.isCompleted } : obj;
        });
      }
      if (updates.newObjectiveDescription) {
         const newObjectiveId = `${quest.id}_obj_${(updatedQuest.objectives?.length || 0) + 1}`;
         updatedQuest.objectives = [
            ...(updatedQuest.objectives || []),
            {id: newObjectiveId, description: updates.newObjectiveDescription, isCompleted: false}
         ];
      }

      if (updates.status === 'completed') {
        updatedQuest.dateCompleted = new Date().toISOString();
        if (updatedQuest.moneyReward && updatedQuest.moneyReward > 0) {
          completedQuestWithMoneyReward = updatedQuest;
        }
      }
      return updatedQuest;
    }
    return quest;
  });
  return { updatedLog, completedQuestWithMoneyReward };
}


export function addOrUpdatePNJ(currentPNJs: PNJ[], pnjData: PNJ): PNJ[] {
  const pnjsToUpdate = currentPNJs || [];
  const existingPNJIndex = pnjsToUpdate.findIndex(p => p.id === pnjData.id);
  if (existingPNJIndex > -1) {
    return pnjsToUpdate.map((p, index) => index === existingPNJIndex ? { ...p, ...pnjData, lastSeen: new Date().toISOString() } : p);
  }
  return [...pnjsToUpdate, { ...pnjData, lastSeen: new Date().toISOString() }];
}

export function logMajorDecision(currentDecisionLog: MajorDecision[], decisionData: Omit<MajorDecision, 'dateMade'>): MajorDecision[] {
  const logToUpdate = currentDecisionLog || [];
   if (logToUpdate.find(d => d.id === decisionData.id)) {
    console.warn(`DecisionLog Warning: Attempted to log decision with duplicate ID: ${decisionData.id}`);
    return logToUpdate;
  }
  const newDecision: MajorDecision = {
    ...decisionData,
    dateMade: new Date().toISOString(),
  };
  return [...logToUpdate, newDecision];
}

export function addClue(currentClues: Clue[], clueData: AIClueInputSchema): Clue[] {
  const newClue: Clue = {
    ...clueData,
    id: clueData.id || `clue_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    dateFound: new Date().toISOString(),
  };
  if ((currentClues || []).find(c => c.id === newClue.id)) {
    console.warn(`ClueLog Warning: Attempted to add clue with duplicate ID: ${newClue.id}`);
    return currentClues || [];
  }
  return [...(currentClues || []), newClue];
}

export function addDocument(currentDocuments: GameDocument[], documentData: AIDocumentInputSchema): GameDocument[] {
  const newDocument: GameDocument = {
    ...documentData,
    id: documentData.id || `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    dateAcquired: new Date().toISOString(),
  };
  if ((currentDocuments || []).find(d => d.id === newDocument.id)) {
    console.warn(`DocumentLog Warning: Attempted to add document with duplicate ID: ${newDocument.id}`);
    return currentDocuments || [];
  }
  return [...(currentDocuments || []), newDocument];
}

export function updateInvestigationNotes(currentNotes: string | null | undefined, notesUpdateText: string): string {
  const safeCurrentNotes = currentNotes || initialInvestigationNotes;
  const notesUpdateTextLower = notesUpdateText.toLowerCase();

  if (notesUpdateTextLower.startsWith("révision complète des notes:")) {
    return notesUpdateText.substring(notesUpdateTextLower.indexOf(":") + 1).trim();
  }
  // For "NOUVELLE HYPOTHÈSE:", "CONNEXION NOTÉE:", "MISE À JOUR:", or general additions:
  return safeCurrentNotes + "\n\n---\n\n" + notesUpdateText;
}


export async function processAndApplyAIScenarioOutput(
  player: Player,
  playerChoice: string,
  aiOutput: GenerateScenarioOutput
): Promise<{ updatedPlayer: Player; notifications: GameNotification[] }> {
  let updatedPlayer = { ...player }; // Start with a shallow copy
  const notifications: GameNotification[] = [];

  // Initialize potentially undefined fields on the player object if they weren't already
  updatedPlayer.questLog = updatedPlayer.questLog || [];
  updatedPlayer.encounteredPNJs = updatedPlayer.encounteredPNJs || [];
  updatedPlayer.decisionLog = updatedPlayer.decisionLog || [];
  updatedPlayer.clues = updatedPlayer.clues || [];
  updatedPlayer.documents = updatedPlayer.documents || [];
  updatedPlayer.investigationNotes = typeof updatedPlayer.investigationNotes === 'string' ? updatedPlayer.investigationNotes : initialInvestigationNotes;
  updatedPlayer.money = typeof updatedPlayer.money === 'number' ? updatedPlayer.money : initialPlayerMoney;
  updatedPlayer.inventory = Array.isArray(updatedPlayer.inventory) ? [...updatedPlayer.inventory] : []; // Ensure inventory is a new array

  // 1. Handle direct outputs from AI (narrative focused)
  if (aiOutput.newLocationDetails &&
      typeof aiOutput.newLocationDetails.latitude === 'number' &&
      typeof aiOutput.newLocationDetails.longitude === 'number' &&
      typeof aiOutput.newLocationDetails.name === 'string' && 
      aiOutput.newLocationDetails.name.trim() !== '') {
    const newLoc: LocationData = { 
      latitude: aiOutput.newLocationDetails.latitude,
      longitude: aiOutput.newLocationDetails.longitude,
      placeName: aiOutput.newLocationDetails.name, 
    };
    updatedPlayer.currentLocation = { 
        latitude: newLoc.latitude,
        longitude: newLoc.longitude,
        name: newLoc.placeName 
    };
    notifications.push({
      type: 'location_changed',
      title: "Déplacement !",
      description: `Vous êtes maintenant à ${newLoc.placeName}. ${aiOutput.newLocationDetails.reasonForMove || ''}`,
      details: { ...newLoc, reasonForMove: aiOutput.newLocationDetails.reasonForMove }
    });
  } else if (aiOutput.newLocationDetails) {
    console.warn('AI output included newLocationDetails, but it was malformed:', aiOutput.newLocationDetails);
    notifications.push({
      type: 'warning',
      title: 'Erreur de Déplacement',
      description: "L'IA a tenté de vous déplacer, mais les détails du lieu étaient incomplets ou incorrects. Vous restez à votre position actuelle.",
      details: { receivedDetails: aiOutput.newLocationDetails }
    });
  }


  if (aiOutput.investigationNotesUpdate) {
    updatedPlayer.investigationNotes = updateInvestigationNotes(updatedPlayer.investigationNotes, aiOutput.investigationNotesUpdate);
    notifications.push({
      type: 'investigation_notes_updated',
      title: "Notes d'enquête mises à jour",
      description: "Vos notes et hypothèses ont été actualisées.",
      details: { updateLength: aiOutput.investigationNotesUpdate.length }
    });
  }

  if (aiOutput.pnjInteractions && Array.isArray(aiOutput.pnjInteractions)) {
    aiOutput.pnjInteractions.forEach(pnjData => {
      const pnj: PNJ = {
        id: pnjData.id || `pnj_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: pnjData.name,
        description: pnjData.description,
        relationStatus: pnjData.relationStatus || 'neutral',
        importance: pnjData.importance || 'minor',
        firstEncountered: pnjData.firstEncountered || "Contexte actuel",
        trustLevel: pnjData.trustLevel,
        notes: pnjData.notes,
        lastSeen: new Date().toISOString()
      };
      const oldPNJ = (updatedPlayer.encounteredPNJs || []).find(p=>p.id === pnj.id);
      updatedPlayer.encounteredPNJs = addOrUpdatePNJ(updatedPlayer.encounteredPNJs, pnj);
      if(!oldPNJ || oldPNJ.relationStatus !== pnj.relationStatus || oldPNJ.trustLevel !== pnj.trustLevel) {
        notifications.push({
          type: 'pnj_encountered',
          title: `Interaction PNJ : ${pnj.name}`,
          description: `Relation : ${pnj.relationStatus}. ${pnj.description.substring(0, 70)}...`,
          details: { pnjId: pnj.id, pnjName: pnj.name }
        });
      }
    });
  }

  if (aiOutput.majorDecisionsLogged && Array.isArray(aiOutput.majorDecisionsLogged)) {
    aiOutput.majorDecisionsLogged.forEach(decisionData => {
      updatedPlayer.decisionLog = logMajorDecision(updatedPlayer.decisionLog, decisionData);
      const loggedDecision = (updatedPlayer.decisionLog || []).find(d=>d.id === decisionData.id);
      if (loggedDecision) {
        notifications.push({
          type: 'decision_logged',
          title: "Décision Importante Enregistrée",
          description: loggedDecision.summary.substring(0, 100) + (loggedDecision.summary.length > 100 ? "..." : ""),
          details: { decisionId: loggedDecision.id }
        });
      }
    });
  }

  // 2. Parse Player Action
  const parsedAction: ParsedAction = await parsePlayerAction(playerChoice);

  // 3. Handle Parsed Actions (Client-Side Mechanics)
  if (parsedAction.actionType === 'TAKE_ITEM' && parsedAction.primaryTarget) {
    const itemNameOrId = parsedAction.primaryTarget;
    const masterItem = getMasterItemById(itemNameOrId); 

    if (masterItem) { 
      const playerBeforeAdding = { ...updatedPlayer, inventory: [...updatedPlayer.inventory] };
      updatedPlayer.inventory = addItemToInventory(playerBeforeAdding.inventory, masterItem.id, 1);

      if (updatedPlayer.inventory !== playerBeforeAdding.inventory) {
        notifications.push({
          type: 'item_added',
          title: 'Objet Acquis',
          description: `Vous avez obtenu : ${masterItem.name}` ,
          details: { itemId: masterItem.id, itemName: masterItem.name, quantity: 1 }
        });
      } else {
        const existingItem = playerBeforeAdding.inventory.find(i => i.id === masterItem.id);
        if (existingItem && !masterItem.stackable) {
            notifications.push({type: 'warning', title: "Inventaire", description: `Vous possédez déjà ${masterItem.name} et ce n'est pas empilable.`});
        }
      }
    } else {
      console.warn(`Player tried to TAKE_ITEM "${itemNameOrId}", but it's not a known master item ID.`);
       notifications.push({ type: 'warning', title: 'Action', description: `Vous essayez de prendre "${itemNameOrId}", mais vous ne parvenez pas à le saisir ou ce n'est pas un objet prenable.` });
    }
  }
  else if (parsedAction.actionType === 'APPLY_SKILL' && parsedAction.skillUsed && parsedAction.primaryTarget) {
    const skillName = parsedAction.skillUsed;
    const difficultyTarget = 70; 

    const skillCheckResult = performSkillCheck(updatedPlayer.skills, updatedPlayer.stats, skillName, difficultyTarget);
    notifications.push({
      type: 'skill_check',
      title: `Test de ${skillName}`,
      description: `Résultat : ${skillCheckResult.degreeOfSuccess} (${skillCheckResult.totalAchieved} vs ${difficultyTarget})`,
      details: { ...skillCheckResult }
    });

    if (skillCheckResult.success) {
      notifications.push({ type: 'info', title: `Réussite : ${skillName}`, description: `Votre tentative avec ${skillName} sur ${parsedAction.primaryTarget} semble avoir fonctionné.`});
    } else {
      notifications.push({ type: 'info', title: `Échec : ${skillName}`, description: `Votre tentative avec ${skillName} sur ${parsedAction.primaryTarget} n'a pas abouti.`});
    }
  }
  else if (parsedAction.actionType === 'USE_ITEM' && parsedAction.itemUsed?.toLowerCase().includes('lockpick') && parsedAction.primaryTarget) {
    const skillToUse = "Discretion"; 
    const lockDifficulty = 80; 

    const lockpickResult = performSkillCheck(updatedPlayer.skills, updatedPlayer.stats, skillToUse, lockDifficulty);
    notifications.push({
      type: 'skill_check',
      title: 'Tentative de crochetage',
      description: `Résultat : ${lockpickResult.degreeOfSuccess} (${lockpickResult.totalAchieved} vs ${lockDifficulty})`,
      details: { ...lockpickResult, itemUsed: parsedAction.itemUsed }
    });

    if (lockpickResult.success) {
      notifications.push({ type: 'info', title: 'Succès!', description: `Vous avez crocheté ${parsedAction.primaryTarget}!` });
    } else {
      notifications.push({ type: 'info', title: 'Échec du crochetage', description: `Impossible de crocheter ${parsedAction.primaryTarget}.` });
    }
  }
  // Removed the 'UNKNOWN' action type notification block.
  // The AI's narrative response will handle unparsed actions.

  return { updatedPlayer, notifications };
}
