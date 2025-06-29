/**
 * @fileoverview Service for all Firestore interactions related to player characters and their save data.
 *
 * This service manages the following data structure in Firestore:
 *
 * /users/{uid}/characters/{characterId}
 *   - name: string
 *   - avatarUrl: string
 *   - level: number
 *   - lastPlayed: Timestamp
 *   - (subcollection) saves/{saveId}
 *     - saveId can be 'auto', 'manual_timestamp', or 'checkpoint_timestamp'.
 *     - The document contains the full GameState object.
 */
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
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

// --- Firestore Collection Names ---
const USERS_COLLECTION = 'users';
const CHARACTERS_SUBCOLLECTION = 'characters';
const SAVES_SUBCOLLECTION = 'saves';


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
 * Recursively removes any properties with `undefined` values from an object.
 * This is necessary because Firestore does not support `undefined` values.
 * @param obj The object to clean.
 * @returns A new object with all `undefined` values removed.
 */
function cleanForFirebase<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => cleanForFirebase(item)) as any;
    }
    
    // Check for Firestore specific types (like Timestamps) which are objects but not plain objects
    if (typeof obj === 'object' && obj.constructor === Object) {
        const cleanedObj: { [key: string]: any } = {};
        for (const key in obj) {
            // hasOwnProperty check is important
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = (obj as any)[key];
                if (value !== undefined) {
                    cleanedObj[key] = cleanForFirebase(value);
                }
            }
        }
        return cleanedObj as T;
    }

    return obj;
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
 *
 * This function implements a robust saving strategy:
 * 1.  It saves the full game state into a 'saves' subcollection within the character's document.
 * 2.  The name of the save document is determined by `saveType`:
 *     - 'auto': Overwrites a single document named 'auto' for quick recovery.
 *     - 'manual' | 'checkpoint': Creates a new versioned document (e.g., 'manual_2024-01-01T12:00:00.000Z') to preserve history.
 * 3.  It updates the parent character document with lightweight metadata (name, level, lastPlayed) for efficient listing on the character selection screen.
 * 4.  It generates and includes an AI summary of the current game state within the save file.
 *
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
    const cleanedState = cleanForFirebase(stateToSave); // Remove undefined values
    await setDoc(saveDocRef, cleanedState);

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
 * Creates a new character in Firestore.
 *
 * This process involves two main steps:
 * 1. Creating a primary character document in the user's `characters` subcollection. This document holds lightweight metadata (name, avatar, level) for quick and efficient display on the character selection screen.
 * 2. Creating an initial save file (as an 'auto' save) within the `saves` subcollection of the new character document. This ensures every new character is immediately playable.
 *
 * @param uid The user's Firebase UID.
 * @param gameState The initial game state for the new character, typically from the character creation form.
 * @returns A promise that resolves to the ID of the newly created character document.
 */
export async function createNewCharacter(uid: string, gameState: GameState): Promise<string> {
   if (!db || !storage) throw new Error("Firestore or Storage not available.");
   if (!uid) throw new Error("User UID is required to create a new character.");
   if (!gameState.player) throw new Error("Cannot create a character from a game state without a player.");
  
   const mutableGameState = JSON.parse(JSON.stringify(gameState)); // Deep copy to allow mutation
   const player = mutableGameState.player;

  try {
    // 1. Create a reference for the new character first to get an ID
    const charactersCollectionRef = collection(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION);
    const newCharacterDocRef = doc(charactersCollectionRef); // Create a reference with a new unique ID
    const characterId = newCharacterDocRef.id;

    // 2. Handle avatar upload if it's a data URI
    if (player.avatarUrl && player.avatarUrl.startsWith('data:image')) {
        const storageRef = ref(storage, `avatars/${uid}/${characterId}.png`);
        // The data URI is in the format 'data:image/png;base64,iVBORw0KGgoAAA...'. We need to extract the base64 part.
        const base64Data = player.avatarUrl.split(',')[1];
        
        // Upload the base64 string
        const snapshot = await uploadString(storageRef, base64Data, 'base64', {
            contentType: 'image/png'
        });
        
        // Get the public URL and update the player object
        player.avatarUrl = await getDownloadURL(snapshot.ref);
    }
    
    // 3. Create the main character document with metadata, now using the potentially updated avatarUrl
    const metadata = {
      name: player.name,
      avatarUrl: player.avatarUrl,
      level: player.progression.level,
      createdAt: serverTimestamp(),
      lastPlayed: serverTimestamp(),
    };
    await setDoc(newCharacterDocRef, metadata); // Use setDoc on the reference we created earlier

    // 4. Create the initial save state in the 'saves' subcollection using the 'auto' slot
    await saveCharacter(uid, characterId, mutableGameState, 'auto');

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
 * Lists all available save files for a given character, ordered by most recent.
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
