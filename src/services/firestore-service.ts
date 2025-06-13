
import { db } from '@/lib/firebase';
import type { GameState } from '@/lib/types';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

const GAME_STATE_COLLECTION = 'userGameStates';

/**
 * Saves the player's game state to Firestore.
 * @param uid The user's Firebase UID.
 * @param gameState The game state to save.
 */
export async function saveGameStateToFirestore(uid: string, gameState: GameState): Promise<void> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized. Cannot save game state.");
    throw new Error("Firestore not available. Check Firebase initialization and API key.");
  }
  if (!uid) {
    console.warn("Firestore Warning: Attempted to save game state to Firestore without a UID. Skipping Firestore save.");
    return; // Don't throw, just skip if UID is missing
  }
  try {
    const userDocRef = doc(db, GAME_STATE_COLLECTION, uid);
    await setDoc(userDocRef, gameState);
    console.log(`Firestore Success: Game state saved to Firestore for user ${uid}.`);
  } catch (error) {
    console.error(`Firestore Error: Error saving game state to Firestore for user ${uid}:`, error);
    // Potentially re-throw or handle more gracefully, e.g., with a toast.
    // Check Firestore rules and API key validity if errors persist.
    throw error;
  }
}

/**
 * Loads the player's game state from Firestore.
 * @param uid The user's Firebase UID.
 * @returns The game state if found, otherwise null.
 */
export async function loadGameStateFromFirestore(uid: string): Promise<GameState | null> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized. Cannot load game state.");
    return null;
  }
  if (!uid) {
    console.warn("Firestore Warning: Attempted to load game state from Firestore without a UID.");
    return null;
  }
  try {
    const userDocRef = doc(db, GAME_STATE_COLLECTION, uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      console.log(`Firestore Success: Game state loaded from Firestore for user ${uid}.`);
      const loadedData = docSnap.data() as GameState;
      // Basic validation, can be improved with Zod or similar
      if (loadedData && loadedData.player && loadedData.currentScenario) {
        return loadedData;
      } else {
        console.warn(`Firestore Warning: Data for user ${uid} in Firestore has an invalid GameState structure:`, loadedData);
        return null;
      }
    } else {
      console.log(`Firestore Info: No game state found in Firestore for user ${uid}. This is normal for a new user or if data was cleared.`);
      return null;
    }
  } catch (error) {
    console.error(`Firestore Error: Error loading game state from Firestore for user ${uid}:`, error);
    // Check Firestore rules and API key validity if errors persist.
    return null; // Don't throw, allow fallback to local storage or new game
  }
}

/**
 * Deletes the player's game state from Firestore.
 * @param uid The user's Firebase UID.
 */
export async function deletePlayerStateFromFirestore(uid: string): Promise<void> {
  if (!db) {
    console.error("Firestore Error: Firestore service is not initialized. Cannot delete game state.");
    throw new Error("Firestore not available. Check Firebase initialization.");
  }
  if (!uid) {
    console.warn("Firestore Warning: Attempted to delete game state from Firestore without a UID.");
    return;
  }
  try {
    const userDocRef = doc(db, GAME_STATE_COLLECTION, uid);
    await deleteDoc(userDocRef);
    console.log(`Firestore Success: Game state deleted from Firestore for user ${uid}.`);
  } catch (error) {
    console.error(`Firestore Error: Error deleting game state from Firestore for user ${uid}:`, error);
    throw error;
  }
}

