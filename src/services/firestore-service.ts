
import { db } from '@/lib/firebase';
import type { GameState } from '@/lib/types';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  limit,
  type DocumentSnapshot,
  where,
  documentId,
} from 'firebase/firestore';
import { generateSaveSummary } from '@/ai/flows/generate-save-summary-flow';

// A summary of a character for the selection screen
export interface CharacterSummary {
  id: string;
  name: string;
  avatarUrl: string;
  level: number;
  lastPlayed: string; // ISO string
}

// A summary of a specific save file for a character
export interface SaveSummary {
  id: string;
  type: 'auto' | 'manual' | 'checkpoint';
  timestamp: string; // ISO string
  level: number;
  locationName: string;
  playTimeInMinutes: number;
  aiSummary?: string; // AI-generated summary of the save state
}


/**
 * Lists all characters for a given user, ordered by most recently played.
 * @param uid The user's Firebase UID.
 * @returns A promise that resolves to an array of character summaries.
 */
export async function listCharacters(uid: string): Promise<CharacterSummary[]> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized.");
    return [];
  }
  try {
    const charactersCollectionRef = collection(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION);
    const q = query(charactersCollectionRef, orderBy("lastPlayed", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const lastPlayedTimestamp = data.lastPlayed as Timestamp;
      return {
        id: docSnap.id,
        name: data.name || 'Sans Nom',
        avatarUrl: data.avatarUrl || '',
        level: data.level || 1,
        lastPlayed: lastPlayedTimestamp ? lastPlayedTimestamp.toDate().toISOString() : new Date(0).toISOString(),
      };
    });
  } catch (error) {
    console.error(`Firestore Error: listing characters for user ${uid}:`, error);
    return [];
  }
}

/**
 * Saves a character's game state to a specific slot in Firestore.
 * This function saves the full game state into a 'saves' subcollection
 * and updates the parent character document with lightweight metadata for quick listing.
 * @param uid The user's Firebase UID.
 * @param characterId The unique ID for the character.
 * @param gameState The game state to save.
 * @param saveType The type of save ('auto', 'manual', or 'checkpoint').
 */
export async function saveCharacter(uid: string, characterId: string, gameState: GameState, saveType: 'auto' | 'manual' | 'checkpoint'): Promise<void> {
  if (!db) throw new Error("Firestore not available.");
  if (!uid || !characterId) throw new Error("UID and CharacterID are required to save.");
  if (!gameState.player) throw new Error("Cannot save a game state without a player.");

  // Generate AI Summary
  let aiSummary = "Le joueur continue son aventure.";
  try {
    const summaryInput = {
      playerName: gameState.player.name,
      level: gameState.player.progression.level,
      locationName: gameState.player.currentLocation.name,
      lastJournalEntries: (gameState.journal || []).slice(-5).map(j => j.text),
      questLogSummary: (gameState.player.questLog || []).filter(q => q.status === 'active').map(q => q.title),
    };
    const summaryResult = await generateSaveSummary(summaryInput);
    aiSummary = summaryResult.summary;
  } catch (e) {
    console.error("Failed to generate AI save summary, using default.", e);
  }

  const characterDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId);
  
  // Auto-saves overwrite a single 'auto' slot. Manual and Checkpoint saves create new versioned documents.
  const docName = saveType === 'auto' 
    ? 'auto' 
    : `${saveType}_${new Date().toISOString()}`;
    
  const saveDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId, SAVES_SUBCOLLECTION, docName);

  try {
    const stateToSave = { ...gameState, lastPlayed: serverTimestamp(), aiSummary };
    await setDoc(saveDocRef, stateToSave);

    const metadata = {
      name: gameState.player.name,
      avatarUrl: gameState.player.avatarUrl,
      level: gameState.player.progression.level,
      lastPlayed: serverTimestamp(),
    };
    await setDoc(characterDocRef, metadata, { merge: true });
  } catch (error) {
    console.error(`Firestore Error: saving character ${characterId} (type: ${saveType}) for user ${uid}:`, error);
    throw error;
  }
}

/**
 * Creates a new character, which involves creating a main character document for metadata
 * and an initial save state in a subcollection.
 * @param uid The user's Firebase UID.
 * @param gameState The initial game state for the new character.
 * @returns The ID of the newly created character document.
 */
export async function createNewCharacter(uid: string, gameState: GameState): Promise<string> {
   if (!db) throw new Error("Firestore not available.");
   if (!uid) throw new Error("User UID is required to create a new character.");
   if (!gameState.player) throw new Error("Cannot create a character from a game state without a player.");

  try {
    // 1. Create the main character document with metadata
    const charactersCollectionRef = collection(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION);
    const metadata = {
      name: gameState.player.name,
      avatarUrl: gameState.player.avatarUrl,
      level: gameState.player.progression.level,
      createdAt: serverTimestamp(),
      lastPlayed: serverTimestamp(),
    };
    const newCharacterDocRef = await addDoc(charactersCollectionRef, metadata);
    const characterId = newCharacterDocRef.id;

    // 2. Create the initial save state in the 'saves' subcollection using the 'auto' slot
    await saveCharacter(uid, characterId, gameState, 'auto');

    return characterId;
  } catch (error) {
    console.error(`Firestore Error: creating new character for user ${uid}:`, error);
    throw error;
  }
}


/**
 * Loads a specific save file for a character.
 * @param uid The user's Firebase UID.
 * @param characterId The ID of the character.
 * @param saveId The ID of the specific save document to load ('auto', or 'manual_...').
 * @returns The game state if found, otherwise null.
 */
export async function loadSpecificSave(uid: string, characterId: string, saveId: string): Promise<GameState | null> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized.");
    return null;
  }
  
  try {
    const saveDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId, SAVES_SUBCOLLECTION, saveId);
    const docSnap = await getDoc(saveDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Convert Firestore Timestamp to a serializable format (ISO string)
      if (data.lastPlayed && data.lastPlayed instanceof Timestamp) {
        data.lastPlayed = data.lastPlayed.toDate().toISOString(); // Mutating for serialization
        if (data.player) {
          data.player.lastPlayed = data.lastPlayed;
        }
      }
      return data as GameState;
    } else {
      console.warn(`Firestore Warning: Specific save document with ID "${saveId}" not found for character "${characterId}".`);
      return null;
    }
  } catch (error) {
    console.error(`Firestore Error: loading specific save "${saveId}" for character "${characterId}":`, error);
    return null;
  }
}

/**
 * Lists all available save files for a given character.
 * @param uid The user's Firebase UID.
 * @param characterId The ID of the character.
 * @returns A promise that resolves to an array of save summaries.
 */
export async function listSavesForCharacter(uid: string, characterId: string): Promise<SaveSummary[]> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized.");
    return [];
  }
  try {
    const savesCollectionRef = collection(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId, SAVES_SUBCOLLECTION);
    const q = query(savesCollectionRef, orderBy("lastPlayed", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data() as GameState & { aiSummary?: string };
      const timestamp = (data.lastPlayed as Timestamp)?.toDate()?.toISOString() || new Date(0).toISOString();
      const docId = docSnap.id;
      
      let saveType: SaveSummary['type'] = 'manual'; // Default to manual for any unknown format
      if (docId.startsWith('manual_')) {
          saveType = 'manual';
      } else if (docId.startsWith('checkpoint_')) {
          saveType = 'checkpoint';
      } else if (docId === 'auto') {
          saveType = 'auto';
      }

      return {
        id: docId,
        type: saveType,
        timestamp: timestamp,
        level: data.player?.progression.level || 1,
        locationName: data.player?.currentLocation.name || 'Lieu inconnu',
        playTimeInMinutes: data.gameTimeInMinutes || 0,
        aiSummary: data.aiSummary || ``,
      };
    });
  } catch (error) {
    console.error(`Firestore Error: listing saves for character ${characterId}:`, error);
    return [];
  }
}


/**
 * Deletes a character document from Firestore.
 * Note: This does not delete subcollections (e.g., 'saves') from the client.
 * This requires a Cloud Function for full cleanup. The saves will be orphaned but inaccessible.
 * @param uid The user's Firebase UID.
 * @param characterId The ID of the character to delete.
 */
export async function deleteCharacter(uid: string, characterId: string): Promise<void> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized.");
    throw new Error("Firestore not available.");
  }
  try {
    const characterDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId);
    await deleteDoc(characterDocRef);
    // Note: A Cloud Function would be needed here to delete the 'saves' subcollection.
  } catch (error) {
    console.error(`Firestore Error: deleting character ${characterId} for user ${uid}:`, error);
    throw error;
  }
}
