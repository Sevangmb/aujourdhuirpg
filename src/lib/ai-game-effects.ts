
/**
 * @fileOverview Functions for processing and applying the effects of an AI-generated scenario to the player state.
 */

import type { PlayerStats, Player, Progression, InventoryItem, GameNotification, Quest, PNJ, MajorDecision, Clue, GameDocument, ClueType, DocumentType, Skills, Position as PlayerPositionType } from './types'; // Added Skills, changed LocationData to PlayerPositionType
import type { GenerateScenarioOutput, QuestInputSchema as AIQuestInputSchema, ClueInputSchema as AIClueInputSchema, DocumentInputSchema as AIDocumentInputSchema, QuestUpdateSchema as AIQuestUpdateSchema } from '@/ai/flows/generate-scenario';
import { getMasterItemById, type MasterInventoryItem } from '@/data/items'; // Added MasterInventoryItem
import { initialPlayerMoney, initialInvestigationNotes, UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data'; // Added UNKNOWN_STARTING_PLACE_NAME
import { parsePlayerAction, type ParsedAction, type ActionType } from './action-parser';
import { performSkillCheck, type SkillCheckResult } from './skill-check';

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


export function updateQuestInLog(currentQuestLog: Quest[], questId: string, updates: AIQuestUpdateSchema): { updatedLog: Quest[], completedQuestWithMoneyReward?: Quest } {
  let completedQuestWithMoneyReward: Quest | undefined = undefined;
  const logToUpdate = currentQuestLog || [];

  const updatedLog = logToUpdate.map(quest => {
    if (quest.id === questId) {
      const updatedQuest = { ...quest };

      if (updates.newStatus) {
        updatedQuest.status = updates.newStatus;
        if (updates.newStatus === 'completed') {
          updatedQuest.dateCompleted = new Date().toISOString();
          if (updatedQuest.moneyReward && updatedQuest.moneyReward > 0) {
            completedQuestWithMoneyReward = updatedQuest;
          }
        }
      }

      if (updates.updatedObjectives) {
        updatedQuest.objectives = (quest.objectives || []).map(obj => {
          const objectiveUpdate = updates.updatedObjectives?.find(uObj => uObj.objectiveId === obj.id);
          return objectiveUpdate ? { ...obj, isCompleted: objectiveUpdate.isCompleted } : obj;
        });
      }
      if (updates.newObjectiveDescription) {
         const newObjectiveId = `${quest.id}_obj_${(updatedQuest.objectives?.length || 0) + 1}_${Date.now()}`;
         updatedQuest.objectives = [
            ...(updatedQuest.objectives || []),
            {id: newObjectiveId, description: updates.newObjectiveDescription, isCompleted: false}
         ];
      }
      return updatedQuest;
    }
    return quest;
  });
  return { updatedLog, completedQuestWithMoneyReward };
}

const MAX_INTERACTION_HISTORY = 10;

export function addOrUpdatePNJ(
  currentPNJs: PNJ[],
  pnjDataFromAI: Partial<PNJ> & Pick<PNJ, 'id' | 'name' | 'description' | 'relationStatus' | 'importance' | 'firstEncountered'>, // Ensure core fields are there
  updatedDispositionScore?: number,
  newInteractionLogEntry?: string
): PNJ[] {
  const pnjsToUpdate = currentPNJs || [];
  const existingPNJIndex = pnjsToUpdate.findIndex(p => p.id === pnjDataFromAI.id);

  if (existingPNJIndex > -1) {
    // Update existing PNJ
    return pnjsToUpdate.map((p, index) => {
      if (index === existingPNJIndex) {
        const updatedPnj = { ...p, ...pnjDataFromAI, lastSeen: new Date().toISOString() };

        if (typeof updatedDispositionScore === 'number') {
          updatedPnj.dispositionScore = updatedDispositionScore;
        }
        if (newInteractionLogEntry) {
          updatedPnj.interactionHistory = [...(updatedPnj.interactionHistory || []), newInteractionLogEntry];
          if (updatedPnj.interactionHistory.length > MAX_INTERACTION_HISTORY) {
            updatedPnj.interactionHistory = updatedPnj.interactionHistory.slice(-MAX_INTERACTION_HISTORY);
          }
        }
        return updatedPnj;
      }
      return p;
    });
  } else {
    // Add new PNJ
    const newPnj: PNJ = {
      // Base fields from pnjDataFromAI, which should have id, name etc.
      id: pnjDataFromAI.id,
      name: pnjDataFromAI.name,
      description: pnjDataFromAI.description,
      relationStatus: pnjDataFromAI.relationStatus,
      importance: pnjDataFromAI.importance,
      firstEncountered: pnjDataFromAI.firstEncountered,
      // Optional fields from pnjDataFromAI
      trustLevel: pnjDataFromAI.trustLevel,
      notes: pnjDataFromAI.notes,
      // New fields with defaults or AI provided values
      dispositionScore: typeof updatedDispositionScore === 'number' ? updatedDispositionScore : 0,
      interactionHistory: newInteractionLogEntry ? [newInteractionLogEntry] : [],
      lastSeen: new Date().toISOString(),
    };
    return [...pnjsToUpdate, newPnj];
  }
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
  return safeCurrentNotes + "\n\n---\n\n" + notesUpdateText;
}


export async function processAndApplyAIScenarioOutput(
  player: Player,
  playerChoice: string,
  aiOutput: GenerateScenarioOutput
): Promise<{ updatedPlayer: Player; notifications: GameNotification[] }> {
  let updatedPlayer = { ...player };
  const notifications: GameNotification[] = [];

  updatedPlayer.questLog = updatedPlayer.questLog || [];
  updatedPlayer.encounteredPNJs = updatedPlayer.encounteredPNJs || [];
  updatedPlayer.decisionLog = updatedPlayer.decisionLog || [];
  updatedPlayer.clues = updatedPlayer.clues || [];
  updatedPlayer.documents = updatedPlayer.documents || [];
  updatedPlayer.investigationNotes = typeof updatedPlayer.investigationNotes === 'string' ? updatedPlayer.investigationNotes : initialInvestigationNotes;
  updatedPlayer.money = typeof updatedPlayer.money === 'number' ? updatedPlayer.money : initialPlayerMoney;
  updatedPlayer.inventory = Array.isArray(updatedPlayer.inventory) ? [...updatedPlayer.inventory] : [];

  if (aiOutput.newLocationDetails &&
      typeof aiOutput.newLocationDetails.latitude === 'number' &&
      typeof aiOutput.newLocationDetails.longitude === 'number' &&
      typeof aiOutput.newLocationDetails.name === 'string' &&
      aiOutput.newLocationDetails.name.trim() !== '' &&
      aiOutput.newLocationDetails.name.trim() !== UNKNOWN_STARTING_PLACE_NAME) { 
    const newLoc: PlayerPositionType = { 
      latitude: aiOutput.newLocationDetails.latitude,
      longitude: aiOutput.newLocationDetails.longitude,
      name: aiOutput.newLocationDetails.name,
    };
    updatedPlayer.currentLocation = newLoc;
    notifications.push({
      type: 'location_changed',
      title: "Déplacement !",
      description: `Vous êtes maintenant à ${newLoc.name}. ${aiOutput.newLocationDetails.reasonForMove || ''}`,
      details: { ...newLoc, reasonForMove: aiOutput.newLocationDetails.reasonForMove }
    });
  } else if (aiOutput.newLocationDetails) {
    console.warn('AI output included newLocationDetails, but it was malformed or did not change from UNKNOWN_STARTING_PLACE_NAME:', aiOutput.newLocationDetails);
    notifications.push({
      type: 'warning',
      title: 'Erreur de Déplacement Initial',
      description: "L'IA n'a pas pu déterminer un nouveau lieu de départ spécifique. Vous restez à votre position indéfinie. Essayez une action pour voir si cela se résout.",
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
    aiOutput.pnjInteractions.forEach(pnjDataFromAI => {
      if (!pnjDataFromAI.id) pnjDataFromAI.id = `pnj_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      if (!pnjDataFromAI.name) pnjDataFromAI.name = "PNJ Inconnu";
      if (!pnjDataFromAI.description) pnjDataFromAI.description = "Aucune description.";
      if (!pnjDataFromAI.relationStatus) pnjDataFromAI.relationStatus = 'neutral';
      if (!pnjDataFromAI.importance) pnjDataFromAI.importance = 'minor';
      if (!pnjDataFromAI.firstEncountered) pnjDataFromAI.firstEncountered = "Contexte actuel";

      const oldPNJ = (updatedPlayer.encounteredPNJs || []).find(p => p.id === pnjDataFromAI.id);
      const oldDispositionScore = oldPNJ?.dispositionScore;

      updatedPlayer.encounteredPNJs = addOrUpdatePNJ(
        updatedPlayer.encounteredPNJs || [],
        pnjDataFromAI as PNJ,
        pnjDataFromAI.updatedDispositionScore,
        pnjDataFromAI.newInteractionLogEntry
      );

      const updatedPNJ = (updatedPlayer.encounteredPNJs || []).find(p => p.id === pnjDataFromAI.id);

      if (updatedPNJ) {
        let notificationSent = false;
        if (!oldPNJ || oldPNJ.relationStatus !== updatedPNJ.relationStatus || oldPNJ.trustLevel !== updatedPNJ.trustLevel) {
          notifications.push({
            type: 'pnj_encountered',
            title: `Interaction PNJ : ${updatedPNJ.name}`,
            description: `Relation : ${updatedPNJ.relationStatus}, Confiance : ${updatedPNJ.trustLevel ?? 'N/A'}. ${updatedPNJ.description.substring(0, 50)}...`,
            details: { pnjId: updatedPNJ.id, pnjName: updatedPNJ.name }
          });
          notificationSent = true;
        }

        if (typeof pnjDataFromAI.updatedDispositionScore === 'number' && oldDispositionScore !== updatedPNJ.dispositionScore) {
          notifications.push({
            type: 'pnj_disposition_changed',
            title: `PNJ : ${updatedPNJ.name}`,
            description: `La disposition de ${updatedPNJ.name} envers vous a changé. (Score: ${updatedPNJ.dispositionScore})`,
            details: { pnjId: updatedPNJ.id, pnjName: updatedPNJ.name, newDisposition: updatedPNJ.dispositionScore }
          });
          notificationSent = true;
        }

        if (pnjDataFromAI.newInteractionLogEntry) {
          notifications.push({
            type: 'pnj_interaction_logged',
            title: `PNJ : ${updatedPNJ.name}`,
            description: `${updatedPNJ.name} se souviendra de : "${pnjDataFromAI.newInteractionLogEntry.substring(0, 50)}${pnjDataFromAI.newInteractionLogEntry.length > 50 ? '...' : ''}"`,
            details: { pnjId: updatedPNJ.id, pnjName: updatedPNJ.name, entry: pnjDataFromAI.newInteractionLogEntry }
          });
          notificationSent = true;
        }

        if (!notificationSent && !oldPNJ) {
             notifications.push({
                type: 'pnj_encountered',
                title: `Nouveau PNJ : ${updatedPNJ.name}`,
                description: `Vous avez rencontré ${updatedPNJ.name}. Relation : ${updatedPNJ.relationStatus}.`,
                details: { pnjId: updatedPNJ.id, pnjName: updatedPNJ.name }
            });
        }
      }
    });
  }

  if (aiOutput.majorDecisionsLogged && Array.isArray(aiOutput.majorDecisionsLogged)) {
    aiOutput.majorDecisionsLogged.forEach(decisionData => {
      updatedPlayer.decisionLog = logMajorDecision(updatedPlayer.decisionLog || [], decisionData);
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

  if (aiOutput.newQuestsProposed && Array.isArray(aiOutput.newQuestsProposed)) {
    aiOutput.newQuestsProposed.forEach(questData => {
      const oldQuestLogLength = (updatedPlayer.questLog || []).length;
      updatedPlayer.questLog = addQuestToLog(updatedPlayer.questLog || [], questData);
      const newQuest = (updatedPlayer.questLog || []).find(q => q.id === questData.id);
      if (newQuest && (updatedPlayer.questLog || []).length > oldQuestLogLength) {
        notifications.push({
          type: 'quest_added',
          title: "Nouvelle Quête Acceptée",
          description: `"${newQuest.title}" ajouté à votre journal.`,
          details: { questId: newQuest.id, questTitle: newQuest.title }
        });
      }
    });
  }

  if (aiOutput.questUpdatesProposed && Array.isArray(aiOutput.questUpdatesProposed)) {
    aiOutput.questUpdatesProposed.forEach(updateData => {
      const questBeforeUpdate = (updatedPlayer.questLog || []).find(q => q.id === updateData.questId);
      if (questBeforeUpdate) {
        const { updatedLog, completedQuestWithMoneyReward } = updateQuestInLog(updatedPlayer.questLog || [], updateData.questId, updateData);
        updatedPlayer.questLog = updatedLog;

        if (completedQuestWithMoneyReward && completedQuestWithMoneyReward.moneyReward && completedQuestWithMoneyReward.moneyReward > 0) {
          updatedPlayer.money = addMoney(updatedPlayer.money, completedQuestWithMoneyReward.moneyReward);
          notifications.push({
            type: 'money_changed',
            title: "Récompense Obtenue!",
            description: `Vous avez reçu ${completedQuestWithMoneyReward.moneyReward}€ pour la quête "${completedQuestWithMoneyReward.title}".`,
            details: { amount: completedQuestWithMoneyReward.moneyReward, reason: `Quest: ${completedQuestWithMoneyReward.title}` }
          });
        }

        const questAfterUpdate = (updatedPlayer.questLog || []).find(q => q.id === updateData.questId);
        if (questAfterUpdate) {
          if (updateData.newStatus && questBeforeUpdate.status !== questAfterUpdate.status) {
            notifications.push({
              type: 'quest_updated',
              title: `Statut de Quête Modifié: "${questAfterUpdate.title}"`,
              description: `Nouveau statut: ${questAfterUpdate.status}.`,
              details: { questId: questAfterUpdate.id, newStatus: questAfterUpdate.status }
            });
          }
          if (updateData.updatedObjectives) {
            updateData.updatedObjectives.forEach(objUpdate => {
              const oldObjective = questBeforeUpdate.objectives.find(o => o.id === objUpdate.objectiveId);
              const newObjective = questAfterUpdate.objectives.find(o => o.id === objUpdate.objectiveId);
              if (oldObjective && newObjective && oldObjective.isCompleted !== newObjective.isCompleted && newObjective.isCompleted) {
                notifications.push({
                  type: 'quest_updated',
                  title: `Objectif Terminé: "${questAfterUpdate.title}"`,
                  description: `"${newObjective.description}" complété.`,
                  details: { questId: questAfterUpdate.id, objectiveId: newObjective.id }
                });
              }
            });
          }
          if (updateData.newObjectiveDescription) {
             const addedObjective = questAfterUpdate.objectives.find(o => o.description === updateData.newObjectiveDescription && !o.isCompleted);
             if (addedObjective) {
                  notifications.push({
                     type: 'quest_updated',
                     title: `Nouvel Objectif: "${questAfterUpdate.title}"`,
                     description: `Objectif ajouté: "${addedObjective.description}".`,
                     details: { questId: questAfterUpdate.id, objectiveId: addedObjective.id }
                 });
             }
          }
        }
      } else {
         console.warn(`QuestUpdate Warning: Attempted to update non-existent quest ID: ${updateData.questId}`);
      }
    });
  }

  const parsedAction: ParsedAction = await parsePlayerAction(playerChoice);

  if (parsedAction.actionType === 'TAKE_ITEM' && parsedAction.primaryTarget) {
    const itemNameOrId = parsedAction.primaryTarget;
    const masterItem = getMasterItemById(itemNameOrId);

    if (masterItem) {
      const playerBeforeAdding = { ...updatedPlayer, inventory: [...updatedPlayer.inventory] };
      updatedPlayer.inventory = addItemToInventory(playerBeforeAdding.inventory, masterItem.id, 1);

      if (updatedPlayer.inventory !== playerBeforeAdding.inventory && updatedPlayer.inventory.find(i=> i.id === masterItem.id)) {
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
      console.warn(`Player tried to TAKE_ITEM "${itemNameOrId}", but it's not a known master item ID or name.`);
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

  return { updatedPlayer, notifications };
}
