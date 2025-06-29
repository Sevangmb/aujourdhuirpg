
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


/**
 * Saves a character's game state to a specific slot in Firestore.
 * This function saves the full game state into a 'saves' subcollection
 * and updates the parent character document with lightweight metadata for quick listing.
 * @param uid The user's Firebase UID.
 * @param characterId The unique ID for the character.
 * @param gameState The game state to save.
 * @param saveType The type of save ('auto' or 'manual').
 */
export async function saveCharacter(uid: string, characterId: string, gameState: GameState, saveType: 'auto' | 'manual'): Promise<void> {
  if (!db) throw new Error("Firestore not available.");
  if (!uid || !characterId) throw new Error("UID and CharacterID are required to save.");
  if (!gameState.player) throw new Error("Cannot save a game state without a player.");

  const characterDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId);
  
  // For manual saves, create a new document with a timestamped ID.
  // For auto saves, overwrite the same document to avoid clutter.
  const docName = saveType === 'manual' 
    ? `manual_${new Date().toISOString()}` 
    : 'auto';
  const saveDocRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId, SAVES_SUBCOLLECTION, docName);


  try {
    // 1. Save the full game state to the specific save slot in the subcollection
    const stateToSave = { ...gameState, lastPlayed: serverTimestamp() };
    await setDoc(saveDocRef, stateToSave);

    // 2. Update the parent character document with summary metadata for quick listing
    const metadata = {
      name: gameState.player.name,
      avatarUrl: gameState.player.avatarUrl,
      level: gameState.player.progression.level,
      lastPlayed: serverTimestamp(),
    };
    await setDoc(characterDocRef, metadata, { merge: true }); // Use merge to not overwrite other fields like createdAt
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
 * Loads the game state for a character, prioritizing the latest manual save.
 * It first attempts to load the latest 'manual' save. If it doesn't exist, it falls back to 'auto'.
 * @param uid The user's Firebase UID.
 * @param characterId The ID of the character to load.
 * @returns The game state if found, otherwise null.
 */
export async function loadCharacter(uid: string, characterId: string): Promise<GameState | null> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized.");
    return null;
  }

  // Helper function to process a document snapshot
  const processDoc = (docSnap: DocumentSnapshot): GameState | null => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Convert Firestore Timestamp to a serializable format (ISO string)
      if (data.lastPlayed && data.lastPlayed instanceof Timestamp) {
        if (data.player) {
          data.player.lastPlayed = data.lastPlayed.toDate().toISOString();
        }
      }
      return data as GameState;
    }
    return null;
  };

  try {
    // 1. Prioritize loading the latest manual save.
    const savesCollectionRef = collection(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId, SAVES_SUBCOLLECTION);
    const q = query(
        savesCollectionRef,
        where(documentId(), '>=', 'manual_'),
        where(documentId(), '<', 'manual`'), // ` is the character after _ in ASCII
        orderBy(documentId(), "desc"),
        limit(1)
    );
    const manualSaveSnapshot = await getDocs(q);

    if (!manualSaveSnapshot.empty) {
      const latestManualDoc = manualSaveSnapshot.docs[0];
      const manualSaveData = processDoc(latestManualDoc);
       if (manualSaveData) {
        console.log(`Firestore Info: Loaded latest manual save for character ${characterId}.`);
        return manualSaveData;
      }
    }


    // 2. If no manual save, fall back to the auto save.
    const autoSaveRef = doc(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION, characterId, SAVES_SUBCOLLECTION, 'auto');
    const autoDocSnap = await getDoc(autoSaveRef);
    const autoSaveData = processDoc(autoDocSnap);

    if (autoSaveData) {
      console.log(`Firestore Info: No manual save found. Loaded 'auto' save for character ${characterId}.`);
      return autoSaveData;
    }

    // 3. If neither save exists.
    console.log(`Firestore Info: No manual or auto saves found for character ID ${characterId} for user ${uid}.`);
    return null;

  } catch (error) {
    console.error(`Firestore Error: loading character ${characterId} for user ${uid}:`, error);
    return null;
  }
}


/**
 * Lists all character summaries for a given user by reading their metadata documents.
 * @param uid The user's Firebase UID.
 * @returns A promise that resolves to an array of character summaries.
 */
export async function listCharacters(uid: string): Promise<CharacterSummary[]> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized.");
    return [];
  }
  try {
    // Now reads from the parent character documents which only contain metadata.
    const charactersCollectionRef = collection(db, USERS_COLLECTION, uid, CHARACTERS_SUBCOLLECTION);
    const q = query(charactersCollectionRef, orderBy("lastPlayed", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data(); // This is now just the metadata
      const lastPlayedTimestamp = data.lastPlayed as Timestamp;
      return {
        id: docSnap.id,
        name: data.name || 'Sans Nom',
        avatarUrl: data.avatarUrl || '',
        level: data.level || 1,
        lastPlayed: lastPlayedTimestamp ? lastPlayedTimestamp.toDate().toISOString() : new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error(`Firestore Error: listing characters for user ${uid}:`, error);
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
