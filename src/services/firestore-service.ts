
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
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';
const CHARACTERS_SUBCOLLECTION = 'characters';

// A summary of a character for the selection screen
export interface CharacterSummary {
  id: string;
  name: string;
  avatarUrl: string;
  level: number;
  lastPlayed: string; // ISO string
}


/**
 * Saves a character's game state to a specific slot in Firestore.
 * Creates the character if the ID is new, updates it otherwise.
 * @param uid The user's Firebase UID.
 * @param characterId The unique ID for the character slot.
 * @param gameState The game state to save.
 */
export async function saveCharacter(uid: string, characterId: string, gameState: GameState): Promise<void> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized.");
    throw new Error("Firestore not available.");
  }
  if (!uid || !characterId) {
    console.warn("Firestore Warning: UID or CharacterID is missing.");
    return;
  }
  try {
    const characterDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId);
    // Add a server-side timestamp to track when it was last played
    const stateToSave = {
      ...gameState,
      lastPlayed: serverTimestamp(),
    };
    await setDoc(characterDocRef, stateToSave);
  } catch (error) {
    console.error(`Firestore Error: saving character ${characterId} for user ${uid}:`, error);
    throw error;
  }
}

/**
 * Creates a new character slot in Firestore.
 * @param uid The user's Firebase UID.
 * @param gameState The initial game state for the new character.
 * @returns The ID of the newly created character document.
 */
export async function createNewCharacter(uid: string, gameState: GameState): Promise<string> {
   if (!db) {
    console.error("Firestore Error: Firestore service is not initialized.");
    throw new Error("Firestore not available.");
  }
   if (!uid) {
    throw new Error("User UID is required to create a new character.");
  }
  try {
    const charactersCollectionRef = collection(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION);
    const stateToSave = {
      ...gameState,
      lastPlayed: serverTimestamp(),
    };
    const newDocRef = await addDoc(charactersCollectionRef, stateToSave);
    return newDocRef.id;
  } catch (error) {
    console.error(`Firestore Error: creating new character for user ${uid}:`, error);
    throw error;
  }
}


/**
 * Loads a character's game state from Firestore.
 * @param uid The user's Firebase UID.
 * @param characterId The ID of the character to load.
 * @returns The game state if found, otherwise null.
 */
export async function loadCharacter(uid: string, characterId: string): Promise<GameState | null> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized.");
    return null;
  }
  try {
    const characterDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId);
    const docSnap = await getDoc(characterDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Convert Firestore Timestamp to a serializable format (ISO string)
      if (data.lastPlayed && data.lastPlayed instanceof Timestamp) {
        // We need to keep the GameState consistent, so we add a property to the player
        if (data.player) {
            data.player.lastPlayed = data.lastPlayed.toDate().toISOString();
        }
      }
      return data as GameState;
    } else {
      console.log(`Firestore Info: No character found with ID ${characterId} for user ${uid}.`);
      return null;
    }
  } catch (error) {
    console.error(`Firestore Error: loading character ${characterId} for user ${uid}:`, error);
    return null;
  }
}


/**
 * Lists all character summaries for a given user.
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
      const data = docSnap.data() as GameState;
      const lastPlayedTimestamp = data.lastPlayed as unknown as Timestamp;
      return {
        id: docSnap.id,
        name: data.player?.name || 'Sans Nom',
        avatarUrl: data.player?.avatarUrl || '',
        level: data.player?.progression?.level || 1,
        lastPlayed: lastPlayedTimestamp ? lastPlayedTimestamp.toDate().toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error(`Firestore Error: listing characters for user ${uid}:`, error);
    return [];
  }
}


/**
 * Deletes a character slot from Firestore.
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
  } catch (error) {
    console.error(`Firestore Error: deleting character ${characterId} for user ${uid}:`, error);
    throw error;
  }
}
