
/**
 * @fileOverview Functions for processing and applying the effects of an AI-generated scenario to the player state.
 */

import type { PlayerStats, Player, Progression, InventoryItem, GameNotification, Quest, PNJ, MajorDecision, LocationData, Clue, GameDocument, ClueType, DocumentType } from './types';
import type { GenerateScenarioOutput, QuestInputSchema as AIQuestInputSchema, ClueInputSchema as AIClueInputSchema, DocumentInputSchema as AIDocumentInputSchema } from '@/ai/flows/generate-scenario';
import { getMasterItemById } from '@/data/items';
import { initialPlayerMoney, initialInvestigationNotes } from '@/data/initial-game-data';


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

export function updateInvestigationNotes(currentNotes: string, notesUpdate: string): string {
  if (notesUpdate.toLowerCase().startsWith("révision:") || notesUpdate.toLowerCase().startsWith("revision:")) {
    return notesUpdate.substring(notesUpdate.indexOf(":") + 1).trim();
  }
  return (currentNotes || initialInvestigationNotes) + "\n\n---\n\n" + notesUpdate;
}


export function processAndApplyAIScenarioOutput(
  currentPlayer: Player,
  aiOutput: GenerateScenarioOutput
): { updatedPlayer: Player; notifications: GameNotification[] } {
  let processedPlayer = { ...currentPlayer };
  const notifications: GameNotification[] = [];

  // Initialize potentially undefined fields
  processedPlayer.questLog = processedPlayer.questLog || [];
  processedPlayer.encounteredPNJs = processedPlayer.encounteredPNJs || [];
  processedPlayer.decisionLog = processedPlayer.decisionLog || [];
  processedPlayer.clues = processedPlayer.clues || [];
  processedPlayer.documents = processedPlayer.documents || [];
  processedPlayer.investigationNotes = typeof processedPlayer.investigationNotes === 'string' ? processedPlayer.investigationNotes : initialInvestigationNotes;
  processedPlayer.money = typeof processedPlayer.money === 'number' ? processedPlayer.money : initialPlayerMoney;
  processedPlayer.inventory = Array.isArray(processedPlayer.inventory) ? processedPlayer.inventory : [];

  let combinedStatChanges: Partial<PlayerStats> = { ...(aiOutput.scenarioStatsUpdate || {}) };

  // Process item removals and apply their effects first
  if (aiOutput.itemsRemoved && aiOutput.itemsRemoved.length > 0) {
    let currentInv = processedPlayer.inventory;
    aiOutput.itemsRemoved.forEach(itemToRemove => {
      const { updatedInventory, removedItemEffects, removedItemName } = removeItemFromInventory(currentInv, itemToRemove.itemName, itemToRemove.quantity);
      currentInv = updatedInventory;

      if (removedItemEffects && removedItemName) {
        notifications.push({
          type: 'item_removed',
          title: "Objet utilisé/perdu",
          description: `${removedItemName} (x${itemToRemove.quantity}) retiré. Ses effets sont appliqués.`,
          details: { itemName: removedItemName, quantity: itemToRemove.quantity, effects: removedItemEffects }
        });
        // Apply consumable effects to combinedStatChanges
        for (const statKey in removedItemEffects) {
          if (Object.prototype.hasOwnProperty.call(removedItemEffects, statKey)) {
            const effectValue = removedItemEffects[statKey as keyof PlayerStats] || 0;
            combinedStatChanges[statKey as keyof PlayerStats] = (combinedStatChanges[statKey as keyof PlayerStats] || 0) + effectValue;
          }
        }
      } else if (removedItemName) { // Item removed but no specific effects
         notifications.push({
          type: 'item_removed',
          title: "Objet utilisé/perdu",
          description: `${removedItemName} (x${itemToRemove.quantity}) retiré de l'inventaire.`,
          details: { itemName: removedItemName, quantity: itemToRemove.quantity }
        });
      }
    });
    processedPlayer.inventory = currentInv;
  }
  
  // Apply combined stat changes (from AI + consumables)
  if (Object.keys(combinedStatChanges).length > 0) {
    processedPlayer.stats = applyStatChanges(processedPlayer.stats, combinedStatChanges);
    // Could add a generic stat_changed notification here if needed, or rely on consumable notification
  }


  if (typeof aiOutput.xpGained === 'number' && aiOutput.xpGained > 0) {
    const { newProgression, leveledUp } = addXP(processedPlayer.progression, aiOutput.xpGained);
    processedPlayer.progression = newProgression;
    notifications.push({
      type: 'xp_gained',
      title: "Expérience gagnée !",
      description: `Vous avez gagné ${aiOutput.xpGained} XP.`,
      details: { amount: aiOutput.xpGained }
    });
    if (leveledUp) {
      notifications.push({
        type: 'leveled_up',
        title: "Niveau Supérieur !",
        description: `Félicitations, vous êtes maintenant niveau ${newProgression.level} !`,
        details: { newLevel: newProgression.level }
      });
    }
  }

  if (typeof aiOutput.moneyChange === 'number' && aiOutput.moneyChange !== 0) {
    const oldMoney = processedPlayer.money;
    processedPlayer.money = addMoney(processedPlayer.money, aiOutput.moneyChange);
    notifications.push({
      type: 'money_changed',
      title: aiOutput.moneyChange > 0 ? "Argent gagné !" : "Argent dépensé/perdu.",
      description: `Vous ${aiOutput.moneyChange > 0 ? 'recevez' : 'perdez'} ${Math.abs(aiOutput.moneyChange)}€. Votre solde : ${processedPlayer.money}€.`,
      details: { amount: aiOutput.moneyChange, oldBalance: oldMoney, newBalance: processedPlayer.money }
    });
  }

  if (aiOutput.itemsAdded && aiOutput.itemsAdded.length > 0) {
    let currentInv = processedPlayer.inventory;
    aiOutput.itemsAdded.forEach(itemToAdd => {
      const masterItem = getMasterItemById(itemToAdd.itemId);
      const itemName = masterItem ? masterItem.name : itemToAdd.itemId;
      currentInv = addItemToInventory(currentInv, itemToAdd.itemId, itemToAdd.quantity);
      notifications.push({
        type: 'item_added',
        title: "Objet obtenu !",
        description: `Vous avez obtenu : ${itemName} (x${itemToAdd.quantity})`,
        details: { itemName: itemName, quantity: itemToAdd.quantity, itemId: itemToAdd.itemId }
      });
    });
    processedPlayer.inventory = currentInv;
  }

  // itemRemoved is now handled above to integrate effects with stat changes

  if (aiOutput.newLocationDetails &&
      typeof aiOutput.newLocationDetails.latitude === 'number' &&
      typeof aiOutput.newLocationDetails.longitude === 'number' &&
      aiOutput.newLocationDetails.placeName) {
    const newLoc: LocationData = {
      latitude: aiOutput.newLocationDetails.latitude,
      longitude: aiOutput.newLocationDetails.longitude,
      placeName: aiOutput.newLocationDetails.placeName,
    };
    processedPlayer.currentLocation = newLoc;
     notifications.push({
      type: 'location_changed',
      title: "Déplacement !",
      description: `Vous êtes maintenant à ${newLoc.placeName}. ${aiOutput.newLocationDetails.reasonForMove || ''}`,
      details: { ...newLoc, reasonForMove: aiOutput.newLocationDetails.reasonForMove }
    });
  }

  if (aiOutput.newQuests && Array.isArray(aiOutput.newQuests)) {
    aiOutput.newQuests.forEach(questData => {
      processedPlayer.questLog = addQuestToLog(processedPlayer.questLog, questData);
      const addedQuest = processedPlayer.questLog.find(q => q.id === questData.id);
      if (addedQuest) {
        notifications.push({
          type: 'quest_added',
          title: `Nouvelle Quête : ${addedQuest.title}`,
          description: addedQuest.description.substring(0, 100) + (addedQuest.description.length > 100 ? "..." : ""),
          details: { questId: addedQuest.id, questType: addedQuest.type, moneyReward: addedQuest.moneyReward }
        });
      }
    });
  }

  if (aiOutput.questUpdates && Array.isArray(aiOutput.questUpdates)) {
    aiOutput.questUpdates.forEach(update => {
      const oldQuest = (processedPlayer.questLog || []).find(q => q.id === update.questId);
      const questUpdatesPayload: Partial<Omit<Quest, 'id'>> & { updatedObjectives?: { objectiveId: string; isCompleted: boolean; }[], newObjectiveDescription?: string } = {};

      if (update.newStatus) questUpdatesPayload.status = update.newStatus;
      if (update.updatedObjectives) questUpdatesPayload.updatedObjectives = update.updatedObjectives;
      if (update.newObjectiveDescription) questUpdatesPayload.newObjectiveDescription = update.newObjectiveDescription;

      const { updatedLog, completedQuestWithMoneyReward } = updateQuestInLog(processedPlayer.questLog, update.questId, questUpdatesPayload);
      processedPlayer.questLog = updatedLog;

      if (completedQuestWithMoneyReward && completedQuestWithMoneyReward.moneyReward && completedQuestWithMoneyReward.moneyReward > 0) {
        const oldMoney = processedPlayer.money;
        processedPlayer.money = addMoney(processedPlayer.money, completedQuestWithMoneyReward.moneyReward);
        notifications.push({
            type: 'money_changed',
            title: "Récompense de quête !",
            description: `Quête "${completedQuestWithMoneyReward.title}" terminée. Vous recevez ${completedQuestWithMoneyReward.moneyReward}€. Votre solde : ${processedPlayer.money}€.`,
            details: { amount: completedQuestWithMoneyReward.moneyReward, oldBalance: oldMoney, newBalance: processedPlayer.money, questId: completedQuestWithMoneyReward.id }
        });
      }

      const updatedQuest = (processedPlayer.questLog || []).find(q => q.id === update.questId);
      if (updatedQuest && (!oldQuest || oldQuest.status !== updatedQuest.status || JSON.stringify(oldQuest.objectives) !== JSON.stringify(updatedQuest.objectives) ) ) {
        notifications.push({
          type: 'quest_updated',
          title: `Quête Mise à Jour : ${updatedQuest.title}`,
          description: `Statut : ${updatedQuest.status}. Objectifs mis à jour.`,
          details: { questId: updatedQuest.id, newStatus: updatedQuest.status }
        });
      }
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
      const oldPNJ = (processedPlayer.encounteredPNJs || []).find(p=>p.id === pnj.id);
      processedPlayer.encounteredPNJs = addOrUpdatePNJ(processedPlayer.encounteredPNJs, pnj);
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
      processedPlayer.decisionLog = logMajorDecision(processedPlayer.decisionLog, decisionData);
      const loggedDecision = (processedPlayer.decisionLog || []).find(d=>d.id === decisionData.id);
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

  if (aiOutput.newClues && Array.isArray(aiOutput.newClues)) {
    aiOutput.newClues.forEach(clueData => {
      processedPlayer.clues = addClue(processedPlayer.clues, clueData);
      notifications.push({
        type: 'clue_added',
        title: `Nouvel Indice : ${clueData.title}`,
        description: clueData.description.substring(0,100) + "...",
        details: { clueId: clueData.id, clueType: clueData.type }
      });
    });
  }

  if (aiOutput.newDocuments && Array.isArray(aiOutput.newDocuments)) {
    aiOutput.newDocuments.forEach(docData => {
      processedPlayer.documents = addDocument(processedPlayer.documents, docData);
      notifications.push({
        type: 'document_added',
        title: `Nouveau Document : ${docData.title}`,
        description: `Un document de type "${docData.type}" a été ajouté.`,
        details: { documentId: docData.id, documentType: docData.type }
      });
    });
  }

  if (aiOutput.investigationNotesUpdate) {
    processedPlayer.investigationNotes = updateInvestigationNotes(processedPlayer.investigationNotes, aiOutput.investigationNotesUpdate);
    notifications.push({
      type: 'investigation_notes_updated',
      title: "Notes d'enquête mises à jour",
      description: "Vos notes et hypothèses ont été actualisées.",
      details: { updateLength: aiOutput.investigationNotesUpdate.length }
    });
  }

  return { updatedPlayer: processedPlayer, notifications };
}
