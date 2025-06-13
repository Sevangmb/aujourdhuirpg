
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
    console.error("Firestore is not initialized. Cannot save game state.");
    throw new Error("Firestore not available");
  }
  if (!uid) {
    console.warn("Attempted to save game state to Firestore without a UID.");
    return;
  }
  try {
    const userDocRef = doc(db, GAME_STATE_COLLECTION, uid);
    await setDoc(userDocRef, gameState);
    console.log(`Game state saved to Firestore for user ${uid}`);
  } catch (error) {
    console.error("Error saving game state to Firestore:", error);
    // Potentially re-throw or handle more gracefully, e.g., with a toast
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
    console.error("Firestore is not initialized. Cannot load game state.");
    return null;
  }
  if (!uid) {
    console.warn("Attempted to load game state from Firestore without a UID.");
    return null;
  }
  try {
    const userDocRef = doc(db, GAME_STATE_COLLECTION, uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      console.log(`Game state loaded from Firestore for user ${uid}`);
      // Basic validation, can be improved with Zod or similar
      const loadedData = docSnap.data() as GameState;
      if (loadedData && loadedData.player && loadedData.currentScenario) {
        return loadedData;
      } else {
        console.warn("Firestore data for user UID an invalid GameState structure:", loadedData);
        return null;
      }
    } else {
      console.log(`No game state found in Firestore for user ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Error loading game state from Firestore:", error);
    return null; // Don't throw, allow fallback to local storage or new game
  }
}

/**
 * Deletes the player's game state from Firestore.
 * @param uid The user's Firebase UID.
 */
export async function deletePlayerStateFromFirestore(uid: string): Promise<void> {
  if (!db) {
    console.error("Firestore is not initialized. Cannot delete game state.");
    throw new Error("Firestore not available");
  }
  if (!uid) {
    console.warn("Attempted to delete game state from Firestore without a UID.");
    return;
  }
  try {
    const userDocRef = doc(db, GAME_STATE_COLLECTION, uid);
    await deleteDoc(userDocRef);
    console.log(`Game state deleted from Firestore for user ${uid}`);
  } catch (error) {
    console.error("Error deleting game state from Firestore:", error);
    throw error;
  }
}
